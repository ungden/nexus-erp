'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, AlertCircle, Clock,
  DollarSign, Wallet, ArrowDownRight, ArrowUpRight,
  MapPin, ChevronRight, Target, ShoppingCart, Briefcase,
  BarChart3, PieChart as PieChartIcon, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAppContext } from '@/context/AppContext';
import { formatVND, formatNumber } from '@/lib/format';
import Link from 'next/link';

// ── Color palette ──────────────────────────────────────────
const COLORS = {
  indigo: '#4f46e5', blue: '#3b82f6', emerald: '#10b981',
  amber: '#f59e0b', red: '#ef4444', violet: '#8b5cf6',
  slate: '#64748b', cyan: '#06b6d4',
};
const PIE_COLORS = [COLORS.indigo, COLORS.blue, COLORS.amber, COLORS.slate, COLORS.emerald];
const KPI_COLORS = { 'on-track': COLORS.emerald, 'at-risk': COLORS.amber, 'behind': COLORS.red };

type FinancialTab = 'pnl' | 'balance' | 'cashflow';

// ── Helpers ────────────────────────────────────────────────
function FinRow({ label, amount, bold, separator, indent, negative }: {
  label: string; amount: number; bold?: boolean; separator?: boolean; indent?: boolean; negative?: boolean;
}) {
  return (
    <tr className={`${bold ? 'font-bold' : ''} ${separator ? 'border-t border-border' : ''}`}>
      <td className={`py-2 text-sm ${indent ? 'pl-6' : 'pl-2'} ${bold ? 'text-foreground' : 'text-muted-foreground'}`}>
        {negative && amount !== 0 ? `(-) ${label}` : label}
      </td>
      <td className={`py-2 text-sm text-right pr-2 tabular-nums ${amount < 0 ? 'text-red-600' : bold ? 'text-foreground' : 'text-muted-foreground'}`}>
        {amount < 0 ? `-${formatVND(Math.abs(amount), 'full')}` : formatVND(amount, 'full')}
      </td>
    </tr>
  );
}
function SectionHeader({ label }: { label: string }) {
  return <tr><td colSpan={2} className="pt-4 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">{label}</td></tr>;
}

// ── Mini stat card ─────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, href, delay = 0 }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string; href?: string; delay?: number;
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      className={`bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold text-foreground truncate">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
        </div>
        {href && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>
    </motion.div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const { finance, deals, employees, expenses, kpis, tasks, activeRoadmap, receivables, payables, payrolls } = useAppContext();
  const [activeTab, setActiveTab] = useState<FinancialTab>('pnl');

  const targetRevenue = finance.targetRevenue;
  const allocations = finance.allocations;

  // ── Actual metrics ──────────────────────────────────────
  const actualRevenue = useMemo(() => deals.filter(d => d.stage === 'Chốt sale').reduce((s, d) => s + d.amount, 0), [deals]);
  const actualHRCost = useMemo(() => employees.reduce((s, e) => s + e.baseSalary, 0), [employees]);
  const actualMktCost = useMemo(() => expenses.filter(e => e.category === 'mkt').reduce((s, e) => s + e.amount, 0), [expenses]);
  const actualOpsCost = useMemo(() => expenses.filter(e => e.category === 'ops').reduce((s, e) => s + e.amount, 0), [expenses]);
  const actualCogsCost = useMemo(() => expenses.filter(e => e.category === 'cogs').reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalExpense = actualHRCost + actualMktCost + actualOpsCost + actualCogsCost;
  const actualProfit = actualRevenue - totalExpense;

  // Financial
  const grossProfit = actualRevenue - actualCogsCost;
  const profitBeforeTax = grossProfit - actualHRCost - actualMktCost - actualOpsCost;
  const taxAmount = profitBeforeTax > 0 ? Math.round(profitBeforeTax * 0.2) : 0;
  const netProfit = profitBeforeTax - taxAmount;

  // Balance sheet
  const totalReceivables = useMemo(() => receivables.reduce((s, r) => s + (r.amount - r.paidAmount), 0), [receivables]);
  const totalPayables = useMemo(() => payables.reduce((s, p) => s + (p.amount - p.paidAmount), 0), [payables]);
  const paidReceivables = useMemo(() => receivables.reduce((s, r) => s + r.paidAmount, 0), [receivables]);
  const paidPayables = useMemo(() => payables.reduce((s, p) => s + p.paidAmount, 0), [payables]);
  const cashBalance = paidReceivables - paidPayables - actualHRCost - actualOpsCost;
  const totalAssets = cashBalance + totalReceivables;
  const totalLiabilities = totalPayables;
  const ownersEquity = totalAssets - totalLiabilities;
  const retainedEarnings = netProfit;
  const paidInCapital = ownersEquity - retainedEarnings;
  const cfFromOperations = paidReceivables - paidPayables - actualHRCost - actualOpsCost - actualMktCost;

  // Budget
  const hrBudget = (targetRevenue * allocations.hr) / 100;
  const mktBudget = (targetRevenue * allocations.mkt) / 100;
  const profitTarget = (targetRevenue * allocations.profit) / 100;
  const revenuePercent = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;

  // ── Chart data: Revenue by month (bar) ──────────────────
  const monthlyData = useMemo(() => {
    const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
    const targetPerMonth = activeRoadmap ? Math.round(activeRoadmap.company.revenue / 12) : 0;
    const actuals = new Array(12).fill(0);
    const expensesByMonth = new Array(12).fill(0);
    deals.filter(d => d.stage === 'Chốt sale').forEach(d => {
      const dt = new Date(d.date);
      if (!isNaN(dt.getTime())) actuals[dt.getMonth()] += d.amount;
    });
    expenses.forEach(e => {
      const dt = new Date(e.date);
      if (!isNaN(dt.getTime())) expensesByMonth[dt.getMonth()] += e.amount;
    });
    return months.map((m, i) => ({
      name: m, target: targetPerMonth, revenue: actuals[i], expense: expensesByMonth[i] + Math.round(actualHRCost / 12),
    }));
  }, [activeRoadmap, deals, expenses, actualHRCost]);

  // ── Chart data: Budget allocation pie ───────────────────
  const budgetPieData = useMemo(() => {
    if (!targetRevenue) return [];
    return [
      { name: 'COGS', value: allocations.cogs, amount: Math.round(targetRevenue * allocations.cogs / 100) },
      { name: 'Nhân sự', value: allocations.hr, amount: Math.round(targetRevenue * allocations.hr / 100) },
      { name: 'Marketing', value: allocations.mkt, amount: Math.round(targetRevenue * allocations.mkt / 100) },
      { name: 'Vận hành', value: allocations.ops, amount: Math.round(targetRevenue * allocations.ops / 100) },
      { name: 'Lợi nhuận', value: allocations.profit, amount: Math.round(targetRevenue * allocations.profit / 100) },
    ];
  }, [targetRevenue, allocations]);

  // ── CRM data ────────────────────────────────────────────
  const dealStages = useMemo(() => {
    const stages = ['Tiếp cận', 'Đàm phán', 'Chốt sale', 'Thất bại'];
    return stages.map(s => ({
      name: s, count: deals.filter(d => d.stage === s).length,
      amount: deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.amount, 0),
    }));
  }, [deals]);

  // ── HRM data ────────────────────────────────────────────
  const deptData = useMemo(() => {
    const depts: Record<string, { count: number; salary: number }> = {};
    employees.forEach(e => {
      if (!depts[e.department]) depts[e.department] = { count: 0, salary: 0 };
      depts[e.department].count++;
      depts[e.department].salary += e.baseSalary;
    });
    return Object.entries(depts).map(([name, d]) => ({ name: name.length > 15 ? name.slice(0, 14) + '…' : name, count: d.count, salary: d.salary }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  // ── KPI data ────────────────────────────────────────────
  const kpiSummary = useMemo(() => {
    const onTrack = kpis.filter(k => k.status === 'on-track').length;
    const atRisk = kpis.filter(k => k.status === 'at-risk').length;
    const behind = kpis.filter(k => k.status === 'behind').length;
    return [
      { name: 'Đạt', value: onTrack, color: KPI_COLORS['on-track'] },
      { name: 'Rủi ro', value: atRisk, color: KPI_COLORS['at-risk'] },
      { name: 'Trễ', value: behind, color: KPI_COLORS['behind'] },
    ];
  }, [kpis]);

  // ── Tasks data ──────────────────────────────────────────
  const taskSummary = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
  }), [tasks]);

  // ── Roadmap quarter ─────────────────────────────────────
  const currentQuarter = useMemo(() => {
    if (!activeRoadmap?.tree?.children?.length) return null;
    const q = Math.ceil((new Date().getMonth() + 1) / 3) - 1;
    return activeRoadmap.tree.children[Math.min(q, activeRoadmap.tree.children.length - 1)];
  }, [activeRoadmap]);

  const tabs: { key: FinancialTab; label: string }[] = [
    { key: 'pnl', label: 'Lãi/Lỗ' },
    { key: 'balance', label: 'Cân đối KT' },
    { key: 'cashflow', label: 'Dòng tiền' },
  ];

  // ── Custom tooltip for charts ───────────────────────────
  const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white/95 border border-border rounded-xl shadow-lg p-3 text-xs">
        <p className="font-bold text-foreground mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="font-semibold">{formatVND(p.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Tổng quan Doanh nghiệp</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dashboard tổng hợp từ CRM, HRM, KPI, và Tài chính. Cập nhật real-time.
        </p>
      </motion.div>

      {employees.length === 0 && deals.length === 0 && (
        <div className="glass-card p-6 border-indigo-200 bg-indigo-50/50">
          <h3 className="text-base font-bold text-indigo-900 mb-2">Chào mừng CEO! Hãy thiết lập hệ thống:</h3>
          <ul className="space-y-1.5 text-sm text-indigo-800">
            <li>1. <Link href="/erp/plan" className="underline font-bold">Tạo AI Roadmap</Link> để hoạch định mục tiêu và ngân sách.</li>
            <li>2. <Link href="/erp/plan/view" className="underline font-bold">Xem Roadmap</Link>, đồng bộ cơ cấu nhân sự sang HRM.</li>
            <li>3. Tạo Khách hàng & Giao dịch đầu tiên trong CRM.</li>
          </ul>
        </div>
      )}

      {/* ── Row 1: Top KPI scorecards ────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Doanh thu" value={formatVND(actualRevenue)} sub={`${revenuePercent}% mục tiêu ${formatVND(targetRevenue)}`} icon={Wallet} color="bg-indigo-50 text-indigo-600" href="/erp/crm" delay={0} />
        <StatCard label="Tổng chi phí" value={formatVND(totalExpense)} sub={`HR ${formatVND(actualHRCost)} · MKT ${formatVND(actualMktCost)}`} icon={TrendingDown} color="bg-red-50 text-red-600" delay={0.05} />
        <StatCard label="Lợi nhuận ròng" value={formatVND(netProfit)} sub={netProfit >= 0 ? `Margin ${targetRevenue > 0 ? Math.round(netProfit / targetRevenue * 100) : 0}%` : 'Lỗ ròng'} icon={DollarSign} color={netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} delay={0.1} />
        <StatCard label="Nhân sự" value={`${employees.length} người`} sub={`Quỹ lương ${formatVND(actualHRCost)}/th`} icon={Users} color="bg-blue-50 text-blue-600" href="/erp/hrm" delay={0.15} />
      </div>

      {/* ── Row 2: Revenue Bar + Budget Pie ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart — 3 cols */}
        <motion.div className="lg:col-span-3 glass-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> Doanh thu vs Chi phí theo tháng</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : String(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" name="Doanh thu" fill={COLORS.indigo} radius={[4,4,0,0]} barSize={14} />
                <Bar dataKey="expense" name="Chi phí" fill={COLORS.red} radius={[4,4,0,0]} barSize={14} opacity={0.6} />
                <Bar dataKey="target" name="Mục tiêu" fill={COLORS.slate} radius={[4,4,0,0]} barSize={14} opacity={0.2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie chart — 2 cols */}
        <motion.div className="lg:col-span-2 glass-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><PieChartIcon className="w-4 h-4 text-violet-500" /> Phân bổ ngân sách</h2>
          {budgetPieData.length > 0 ? (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={budgetPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                    {budgetPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu ngân sách</div>
          )}
        </motion.div>
      </div>

      {/* ── Row 3: CRM / HRM / KPI mini-dashboards ────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CRM Widget */}
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-indigo-500" /> CRM Pipeline</h3>
            <Link href="/erp/crm" className="text-[10px] font-semibold text-primary hover:underline">Xem thêm</Link>
          </div>
          <div className="space-y-2">
            {dealStages.map((stage, i) => {
              const maxAmount = Math.max(...dealStages.map(s => s.amount), 1);
              const barW = Math.max(5, (stage.amount / maxAmount) * 100);
              const stageColors = [COLORS.blue, COLORS.amber, COLORS.emerald, COLORS.red];
              return (
                <div key={stage.name} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-20 truncate">{stage.name}</span>
                  <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: stageColors[i] }} />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground w-8 text-right">{stage.count}</span>
                  <span className="text-[10px] text-muted-foreground w-16 text-right">{formatVND(stage.amount)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-[11px]">
            <span className="text-muted-foreground">Tổng deals: <strong className="text-foreground">{deals.length}</strong></span>
            <span className="text-emerald-600 font-semibold">Won: {formatVND(actualRevenue)}</span>
          </div>
        </motion.div>

        {/* HRM Widget */}
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-500" /> Nhân sự</h3>
            <Link href="/erp/hrm" className="text-[10px] font-semibold text-primary hover:underline">Xem thêm</Link>
          </div>
          {deptData.length > 0 ? (
            <div className="space-y-2">
              {deptData.slice(0, 5).map((dept, i) => {
                const maxCount = Math.max(...deptData.map(d => d.count), 1);
                const barW = Math.max(8, (dept.count / maxCount) * 100);
                const colors = [COLORS.indigo, COLORS.blue, COLORS.violet, COLORS.cyan, COLORS.emerald];
                return (
                  <div key={dept.name} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-28 truncate">{dept.name}</span>
                    <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: colors[i % colors.length] }} />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground w-8 text-right">{dept.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Chưa có nhân sự</p>
          )}
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-[11px]">
            <span className="text-muted-foreground">Tổng: <strong className="text-foreground">{employees.length} người</strong></span>
            <span className="text-muted-foreground">Budget: <span className={actualHRCost <= hrBudget ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{hrBudget > 0 ? Math.round(actualHRCost / hrBudget * 100) : 0}%</span></span>
          </div>
        </motion.div>

        {/* KPI + Tasks Widget */}
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" /> KPI & Tasks</h3>
            <Link href="/erp/kpi" className="text-[10px] font-semibold text-primary hover:underline">Xem thêm</Link>
          </div>
          {/* KPI donut inline */}
          <div className="flex items-center gap-4 mb-3">
            <div className="w-20 h-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kpiSummary.filter(k => k.value > 0)} cx="50%" cy="50%" innerRadius={22} outerRadius={35} paddingAngle={4} dataKey="value">
                    {kpiSummary.filter(k => k.value > 0).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 text-[11px]">
              {kpiSummary.map(k => (
                <div key={k.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: k.color }} />
                  <span className="text-muted-foreground">{k.name}</span>
                  <span className="font-bold text-foreground">{k.value}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Tasks summary */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-muted-foreground">TASKS</span>
            </div>
            <div className="flex gap-2">
              {[
                { label: 'Cần làm', count: taskSummary.todo, bg: 'bg-slate-100 text-slate-700' },
                { label: 'Đang làm', count: taskSummary.inProgress, bg: 'bg-blue-100 text-blue-700' },
                { label: 'Xong', count: taskSummary.done, bg: 'bg-emerald-100 text-emerald-700' },
              ].map(t => (
                <div key={t.label} className={`flex-1 rounded-lg p-2 text-center ${t.bg}`}>
                  <p className="text-base font-bold">{t.count}</p>
                  <p className="text-[9px] font-medium">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Row 4: Cashflow chart + Roadmap widget ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cashflow AreaChart */}
        <motion.div className="glass-card p-5" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
          <h2 className="text-sm font-bold text-foreground mb-4">Dòng tiền theo tháng</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData.map(d => ({ ...d, cashflow: d.revenue - d.expense }))} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : String(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="cashflow" name="Dòng tiền" stroke={COLORS.emerald} strokeWidth={2} fill="url(#cfGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Roadmap widget */}
        {activeRoadmap && currentQuarter ? (
          <motion.div className="glass-card overflow-hidden" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <div className="bg-emerald-50/50 p-4 border-b border-emerald-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-emerald-800 flex items-center gap-2"><MapPin className="w-4 h-4" /> Roadmap Quý hiện tại</h2>
                <p className="text-[11px] text-emerald-600 mt-0.5">{currentQuarter.title}</p>
              </div>
              <Link href="/erp/plan/view">
                <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300">Xem chi tiết</button>
              </Link>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-muted-foreground">Mục tiêu DT</p>
                  <p className="text-sm font-bold">{formatVND(currentQuarter.revenue)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-muted-foreground">Ngân sách CP</p>
                  <p className="text-sm font-bold">{formatVND(currentQuarter.expense)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-muted-foreground">Dòng tiền</p>
                  <p className={`text-sm font-bold ${currentQuarter.cashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatVND(currentQuarter.cashflow)}</p>
                </div>
              </div>
              {currentQuarter.kpis?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {currentQuarter.kpis.map((kpi, i) => (
                    <span key={i} className="text-[10px] font-medium bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-full">{kpi}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-background p-8 flex flex-col items-center justify-center gap-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20"><MapPin className="w-8 h-8 text-primary" /></div>
            <div className="text-center">
              <h3 className="text-base font-bold">Tạo AI Roadmap</h3>
              <p className="text-xs text-muted-foreground mt-1">Hệ thống AI sẽ phân bổ ngân sách, mục tiêu theo quý.</p>
            </div>
            <Link href="/erp/plan">
              <button className="px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg">Tạo Roadmap</button>
            </Link>
          </motion.div>
        )}
      </div>

      {/* ── Row 5: Financial Reports (tabs) ────────────────── */}
      <motion.div className="glass-card overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 sm:flex-none px-5 py-3 text-xs font-semibold transition-colors border-b-2 ${activeTab === tab.key ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 md:p-6">
          <table className="w-full">
            <tbody>
              {activeTab === 'pnl' && (<>
                <FinRow label="Doanh thu" amount={actualRevenue} bold />
                <FinRow label="Giá vốn hàng bán (COGS)" amount={-actualCogsCost} negative indent />
                <FinRow label="= Lợi nhuận gộp" amount={grossProfit} bold separator />
                <FinRow label="Chi phí nhân sự" amount={-actualHRCost} negative indent />
                <FinRow label="Chi phí marketing" amount={-actualMktCost} negative indent />
                <FinRow label="Chi phí vận hành" amount={-actualOpsCost} negative indent />
                <FinRow label="= Lợi nhuận trước thuế" amount={profitBeforeTax} bold separator />
                <FinRow label="Thuế TNDN (20%)" amount={-taxAmount} negative indent />
                <FinRow label="= Lợi nhuận sau thuế" amount={netProfit} bold separator />
              </>)}
              {activeTab === 'balance' && (<>
                <SectionHeader label="Tài sản" />
                <FinRow label="Tiền mặt & tương đương" amount={cashBalance > 0 ? cashBalance : 0} indent />
                <FinRow label="Phải thu khách hàng" amount={totalReceivables} indent />
                <FinRow label="Tổng Tài sản" amount={totalAssets} bold separator />
                <SectionHeader label="Nợ phải trả" />
                <FinRow label="Phải trả NCC" amount={totalPayables} indent />
                <FinRow label="Tổng Nợ phải trả" amount={totalLiabilities} bold separator />
                <SectionHeader label="Vốn chủ sở hữu" />
                <FinRow label="Vốn góp" amount={paidInCapital} indent />
                <FinRow label="Lợi nhuận giữ lại" amount={retainedEarnings} indent />
                <FinRow label="Tổng Vốn CSH" amount={ownersEquity} bold separator />
              </>)}
              {activeTab === 'cashflow' && (<>
                <SectionHeader label="Dòng tiền từ hoạt động KD" />
                <FinRow label="Thu từ khách hàng" amount={paidReceivables} indent />
                <FinRow label="Chi cho NCC" amount={-paidPayables} negative indent />
                <FinRow label="Chi lương" amount={-actualHRCost} negative indent />
                <FinRow label="Chi phí khác" amount={-(actualOpsCost + actualMktCost)} negative indent />
                <FinRow label="= Dòng tiền ròng" amount={cfFromOperations} bold separator />
              </>)}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Row 6: Alerts ──────────────────────────────────── */}
      {(actualMktCost > mktBudget || netProfit < 0 || hrBudget - actualHRCost > 0) && (
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Cảnh báo</h2>
          <div className="space-y-2">
            {actualMktCost > mktBudget && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-800"><strong>Marketing vượt ngân sách</strong> — vượt {formatVND(actualMktCost - mktBudget)}</p>
              </div>
            )}
            {netProfit < 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-800"><strong>Lỗ ròng</strong> — {formatVND(netProfit)}</p>
              </div>
            )}
            {hrBudget - actualHRCost > 0 && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <Users className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-800"><strong>Còn dư ngân sách HR</strong> — {formatVND(hrBudget - actualHRCost)} có thể tuyển thêm</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
