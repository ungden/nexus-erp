'use client';

import React, { use, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Wallet,
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAppContext, KpiStatus } from '@/context/AppContext';
import { formatVND } from '@/lib/format';
import { RoadmapNode } from '@/lib/roadmap-types';

// ── KPI status config (same pattern as kpi/page.tsx) ────────
const kpiStatusConfig: Record<KpiStatus, { label: string; color: string; bg: string; border: string; gradient: string }> = {
  'on-track': { label: 'Đúng tiến độ', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', gradient: 'from-indigo-500 to-indigo-400' },
  'at-risk':  { label: 'Có nguy cơ',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  gradient: 'from-amber-500 to-amber-400' },
  'behind':   { label: 'Chậm trễ',     color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    gradient: 'from-red-500 to-red-400' },
};

const priorityConfig: Record<string, { label: string; cls: string }> = {
  high:   { label: 'Cao',       cls: 'bg-red-50 text-red-700 border-red-200' },
  medium: { label: 'Trung bình', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  low:    { label: 'Thấp',      cls: 'bg-green-50 text-green-700 border-green-200' },
};

const PIE_COLORS = ['#94a3b8', '#3b82f6', '#10b981']; // todo, in-progress, done

// ── Circular Progress Ring ──────────────────────────────────
function ProgressRing({ value, size = 60, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-sm font-bold" transform={`rotate(90 ${size / 2} ${size / 2})`}>
        {value}%
      </text>
    </svg>
  );
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const employeeId = Number(id);
  const { employees, tasks, kpis, payrolls, activeRoadmap } = useAppContext();

  const employee = employees.find(e => e.id === employeeId);

  // ── Task computations ───────────────────────────────────────
  const empTasks = useMemo(() => tasks.filter(t => t.assigneeId === employeeId), [tasks, employeeId]);
  const todoTasks = empTasks.filter(t => t.status === 'todo');
  const inProgressTasks = empTasks.filter(t => t.status === 'in-progress');
  const doneTasks = empTasks.filter(t => t.status === 'done');
  const completionRate = empTasks.length > 0 ? Math.round(doneTasks.length / empTasks.length * 100) : 0;

  // ── KPI computations ───────────────────────────────────────
  const linkedKpiIds = [...new Set(empTasks.filter(t => t.linkedKpiId).map(t => t.linkedKpiId!))];
  const empKpis = useMemo(() => kpis.filter(k => linkedKpiIds.includes(k.id)), [kpis, linkedKpiIds]);
  const avgKpiProgress = empKpis.length > 0 ? Math.round(empKpis.reduce((s, k) => s + k.progress, 0) / empKpis.length) : 0;

  // ── Payroll computations ───────────────────────────────────
  const empPayrolls = useMemo(() => payrolls.filter(p => p.employeeId === employeeId).sort((a, b) => a.month.localeCompare(b.month)), [payrolls, employeeId]);
  const latestPayroll = empPayrolls[empPayrolls.length - 1];
  const thisMonthIncome = latestPayroll ? latestPayroll.total : (employee?.baseSalary ?? 0);

  // ── Performance score ──────────────────────────────────────
  const performanceScore = Math.round(completionRate * 0.5 + avgKpiProgress * 0.5);
  const perfColor = performanceScore >= 70 ? 'bg-emerald-500' : performanceScore >= 40 ? 'bg-amber-500' : 'bg-red-500';

  // ── Pie chart data ─────────────────────────────────────────
  const pieData = [
    { name: 'Chờ xử lý', value: todoTasks.length },
    { name: 'Đang làm', value: inProgressTasks.length },
    { name: 'Hoàn thành', value: doneTasks.length },
  ];

  // ── Area chart data ────────────────────────────────────────
  const areaChartData = empPayrolls.map(p => ({
    month: p.month,
    base: p.base,
    bonusCommission: p.kpiBonus + p.commission,
  }));

  // ── Roadmap extraction (same logic as before) ──────────────
  const assignedTasks: { task: RoadmapNode; monthTitle: string; quarterTitle: string; weekTitle: string }[] = [];

  if (activeRoadmap?.tree && employee) {
    const traverse = (node: RoadmapNode, quarterTitle = '', monthTitle = '', weekTitle = '') => {
      let currentQuarter = quarterTitle;
      let currentMonth = monthTitle;
      let currentWeek = weekTitle;

      if (node.level === 'quarter') currentQuarter = node.title;
      if (node.level === 'month') currentMonth = node.title;
      if (node.level === 'week') currentWeek = node.title;

      if (
        node.level === 'task' &&
        (node.assigneeId === employee.id || (node.assigneeName && node.assigneeName.includes(employee.name)))
      ) {
        assignedTasks.push({ task: node, monthTitle: currentMonth, quarterTitle: currentQuarter, weekTitle: currentWeek });
      }

      if (node.children && node.children.length > 0) {
        node.children.forEach(child => traverse(child, currentQuarter, currentMonth, currentWeek));
      }
    };

    traverse(activeRoadmap.tree);
  }

  const totalRoadmapTasks = assignedTasks.length;
  const totalExpectedBonus = assignedTasks.reduce((sum, item) => sum + (item.task.bonusAmount || 0), 0);
  const syncedCount = assignedTasks.filter(item => item.task.syncedToTasks).length;

  const groupedTasks: Record<string, typeof assignedTasks> = {};
  assignedTasks.forEach(item => {
    const key = `${item.quarterTitle} / ${item.monthTitle}`;
    if (!groupedTasks[key]) groupedTasks[key] = [];
    groupedTasks[key].push(item);
  });

  // ── Recent tasks (5 most recent by due date) ──────────────
  const recentTasks = [...empTasks].sort((a, b) => b.dueDate.localeCompare(a.dueDate)).slice(0, 5);

  // ── Not found ──────────────────────────────────────────────
  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Không tìm thấy nhân sự</h1>
        <p className="text-muted-foreground mb-6">Nhân sự này không tồn tại hoặc đã bị xóa.</p>
        <Link href="/erp/hrm" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 relative">
      {/* ═══ Section 1: Back + Header ═══ */}
      <div className="flex items-center gap-4">
        <Link href="/erp/hrm" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hồ sơ Nhân sự</h1>
          <p className="text-sm text-muted-foreground">Chi tiết thông tin và hiệu suất công việc</p>
        </div>
      </div>

      {/* ═══ Section 2: Profile Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        {/* Performance badge top-right */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-center gap-1">
          <div className={`w-12 h-12 rounded-full ${perfColor} flex items-center justify-center shadow-lg`}>
            <span className="text-white text-sm font-bold">{performanceScore}</span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Hiệu suất</span>
        </div>

        <div className="flex-shrink-0">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-inner">
            <span className="text-5xl font-bold text-primary">{employee.name.charAt(0)}</span>
          </div>
          <div className="mt-4 flex justify-center">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              employee.status === 'Đang làm việc' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {employee.status}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-6 relative z-10">
          <div>
            <h2 className="text-3xl font-bold text-foreground">{employee.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-md flex items-center">
                <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                {employee.role}
              </span>
              <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-md">
                Phòng: {employee.department}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Mail className="w-4 h-4 mr-3 text-muted-foreground/70" />
              <span className="text-foreground">{employee.email}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Phone className="w-4 h-4 mr-3 text-muted-foreground/70" />
              <span className="text-foreground">{employee.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-3 text-muted-foreground/70" />
              <span>Ngày vào làm: <span className="text-foreground font-medium">{employee.joinDate}</span></span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Wallet className="w-4 h-4 mr-3 text-muted-foreground/70" />
              <span>Lương cơ bản: <span className="text-foreground font-medium">{formatVND(employee.baseSalary, 'full')}</span></span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ Section 3: Stats Row (4 cards) ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng công việc */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Tổng công việc</p>
              <p className="text-2xl font-bold text-foreground">{empTasks.length}</p>
              <p className="text-[10px] text-muted-foreground truncate">{doneTasks.length} hoàn thành &middot; {inProgressTasks.length} đang làm &middot; {todoTasks.length} chờ</p>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Tỷ lệ hoàn thành */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5 border-l-4 border-l-emerald-500 flex items-center justify-center">
          <ProgressRing value={completionRate} />
          <div className="ml-3">
            <p className="text-xs font-medium text-muted-foreground">Tỷ lệ hoàn thành</p>
            <p className="text-lg font-bold text-foreground">{completionRate}%</p>
          </div>
        </motion.div>

        {/* Card 3: Thu nhập tháng này */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Thu nhập tháng này</p>
              <p className="text-2xl font-bold text-foreground">{formatVND(thisMonthIncome, 'full')}</p>
              {latestPayroll && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Lương: {formatVND(latestPayroll.base)} + Thưởng: {formatVND(latestPayroll.kpiBonus + latestPayroll.commission)}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Card 4: Hiệu suất KPI */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5 border-l-4 border-l-primary">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Hiệu suất KPI</p>
              <p className="text-2xl font-bold text-foreground">{empKpis.length > 0 ? `${avgKpiProgress}%` : 'Chưa có'}</p>
              <p className="text-[10px] text-muted-foreground">{empKpis.length} KPIs liên kết</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ Section 4: Performance Section (2 cols) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Phân tích Công việc */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Phân tích Công việc</h2>
          </div>
          <div className="p-4">
            {empTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Chưa có công việc nào.</div>
            ) : (
              <>
                {/* Donut chart */}
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={2}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} việc`, name]} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-lg font-bold">
                        {empTasks.length}
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex justify-center gap-4 mb-4 text-xs">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-muted-foreground">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
                {/* Recent tasks */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Công việc gần đây</p>
                  <div className="space-y-2">
                    {recentTasks.map(task => {
                      const statusDot = task.status === 'done' ? 'bg-emerald-500' : task.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400';
                      const prio = priorityConfig[task.priority] || priorityConfig.medium;
                      return (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
                          <span className="truncate flex-1 text-foreground">{task.title}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${prio.cls} flex-shrink-0`}>{prio.label}</span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{task.dueDate}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Right: Hiệu suất KPI */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Hiệu suất KPI</h2>
          </div>
          <div className="p-4">
            {empKpis.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Chưa có KPI nào được liên kết.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {empKpis.map(kpi => {
                  const sc = kpiStatusConfig[kpi.status];
                  return (
                    <div key={kpi.id}>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">{kpi.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${sc.bg} ${sc.color} ${sc.border}`}>
                          {sc.label}
                        </span>
                      </div>
                      <div className="relative w-full h-3 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${sc.gradient} transition-all duration-700 ease-out`}
                          style={{ width: `${Math.min(kpi.progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{formatVND(kpi.current, 'full')}/{formatVND(kpi.target, 'full')}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 text-muted-foreground rounded">{kpi.department}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ═══ Section 5: Income & Payroll ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Lịch sử Lương & Thưởng</h2>
        </div>
        <div className="p-4">
          {empPayrolls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Chưa có dữ liệu lương.</div>
          ) : (
            <>
              {/* Area chart (only if more than 1 record) */}
              {empPayrolls.length > 1 && (
                <div className="mb-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={areaChartData}>
                      <defs>
                        <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorBonus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatVND(v)} />
                      <Tooltip formatter={(value) => formatVND(Number(value), 'full')} />
                      <Area type="monotone" dataKey="base" stackId="1" stroke="#3b82f6" fill="url(#colorBase)" name="Lương cơ bản" />
                      <Area type="monotone" dataKey="bonusCommission" stackId="1" stroke="#10b981" fill="url(#colorBonus)" name="Thưởng + Hoa hồng" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Payroll table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2 font-medium">Tháng</th>
                      <th className="text-right py-2 px-2 font-medium">Lương cơ bản</th>
                      <th className="text-right py-2 px-2 font-medium">Hoa hồng</th>
                      <th className="text-right py-2 px-2 font-medium">Thưởng KPI</th>
                      <th className="text-right py-2 px-2 font-medium">Khấu trừ</th>
                      <th className="text-right py-2 px-2 font-medium">Thực nhận</th>
                      <th className="text-center py-2 px-2 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empPayrolls.map(p => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-2 font-medium text-foreground">{p.month}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{formatVND(p.base, 'full')}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-green-600">{p.commission > 0 ? `+${formatVND(p.commission, 'full')}` : '-'}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-green-600">{p.kpiBonus > 0 ? `+${formatVND(p.kpiBonus, 'full')}` : '-'}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-red-600">{p.deduction > 0 ? `-${formatVND(p.deduction, 'full')}` : '-'}</td>
                        <td className="py-2 px-2 text-right tabular-nums font-bold text-foreground">{formatVND(p.total, 'full')}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                            p.status === 'Đã duyệt' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ═══ Section 6: Roadmap Tasks ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Lộ trình Công việc Cấp cá nhân (Kịch bản hiện tại)</h2>
        </div>

        {!activeRoadmap ? (
          <div className="glass-card p-8 text-center border-dashed">
            <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">Chưa có Kịch bản Hoạt động</h3>
            <p className="text-muted-foreground mt-1">Công ty chưa kích hoạt kịch bản AI Roadmap nào.</p>
          </div>
        ) : totalRoadmapTasks === 0 ? (
          <div className="glass-card p-8 text-center border-dashed">
            <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">Chưa được giao việc</h3>
            <p className="text-muted-foreground mt-1">Nhân sự này chưa được giao công việc nào trong kịch bản &quot;{activeRoadmap.name}&quot;.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card p-5 border-l-4 border-l-blue-500">
                <div className="text-sm font-medium text-muted-foreground mb-1">Tổng công việc (Roadmap)</div>
                <div className="text-3xl font-bold text-foreground flex items-baseline gap-2">
                  {totalRoadmapTasks} <span className="text-sm font-normal text-muted-foreground">tasks</span>
                </div>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-green-500 bg-green-50/30">
                <div className="text-sm font-medium text-green-800 mb-1">Dự kiến thưởng theo kịch bản</div>
                <div className="text-3xl font-bold text-green-600 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  {formatVND(totalExpectedBonus, 'full')}
                </div>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-purple-500">
                <div className="text-sm font-medium text-muted-foreground mb-1">Đã đồng bộ sang ERP</div>
                <div className="text-3xl font-bold text-foreground flex items-baseline gap-2">
                  {syncedCount}/{totalRoadmapTasks} <span className="text-sm font-normal text-muted-foreground">tasks</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([groupTitle, gTasks]) => (
                <div key={groupTitle} className="glass-card overflow-hidden">
                  <div className="bg-muted/40 px-5 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {groupTitle}
                    </h3>
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {gTasks.length} công việc
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {gTasks.map((item, tIdx) => (
                      <div key={item.task.id || tIdx} className="p-4 sm:p-5 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {item.weekTitle || 'Tuần ?'}
                            </span>
                            <h4 className="font-medium text-foreground">{item.task.title}</h4>
                            {item.task.syncedToTasks ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Đã đồng bộ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Chưa đồng bộ
                              </span>
                            )}
                          </div>
                          {item.task.personalKPI && (
                            <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                              <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-orange-500" />
                              <span><span className="font-medium text-foreground/80">KPI:</span> {item.task.personalKPI}</span>
                            </p>
                          )}
                        </div>

                        {(item.task.bonusAmount || item.task.bonusPercent) ? (
                          <div className="text-right flex-shrink-0 bg-green-50/50 px-3 py-2 rounded-lg border border-green-100/50">
                            <div className="text-xs text-green-700 font-medium mb-0.5">Thưởng dự kiến</div>
                            <div className="font-bold text-green-700">
                              {item.task.bonusAmount
                                ? `+${formatVND(item.task.bonusAmount, 'full')}`
                                : `+${item.task.bonusPercent}% lương`}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
