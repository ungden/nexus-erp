'use client';

import React, { use } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatVND } from '@/lib/format';
import { RoadmapNode } from '@/lib/roadmap-types';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const employeeId = Number(id);
  const { employees, activeRoadmap } = useAppContext();

  const employee = employees.find(e => e.id === employeeId);

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

  // --- Roadmap Extraction Logic ---
  const assignedTasks: { task: RoadmapNode; monthTitle: string; quarterTitle: string; weekTitle: string }[] = [];

  if (activeRoadmap?.tree) {
    // Traverse the roadmap tree to find tasks assigned to this employee
    // Structure typically: Year -> Quarter -> Month -> Week -> Task
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

  // Calculate stats
  const totalTasks = assignedTasks.length;
  const totalExpectedBonus = assignedTasks.reduce((sum, item) => sum + (item.task.bonusAmount || 0), 0);

  // Group tasks by Month
  const groupedTasks: Record<string, typeof assignedTasks> = {};
  assignedTasks.forEach(item => {
    const key = `${item.quarterTitle} / ${item.monthTitle}`;
    if (!groupedTasks[key]) groupedTasks[key] = [];
    groupedTasks[key].push(item);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 relative">
      <div className="flex items-center gap-4">
        <Link href="/erp/hrm" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hồ sơ Nhân sự</h1>
          <p className="text-sm text-muted-foreground">Chi tiết thông tin và lộ trình công việc</p>
        </div>
      </div>

      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
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

      {/* Roadmap Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
        ) : totalTasks === 0 ? (
          <div className="glass-card p-8 text-center border-dashed">
            <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">Chưa được giao việc</h3>
            <p className="text-muted-foreground mt-1">Nhân sự này chưa được giao công việc nào trong kịch bản &quot;{activeRoadmap.name}&quot;.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card p-5 border-l-4 border-l-blue-500">
                <div className="text-sm font-medium text-muted-foreground mb-1">Tổng công việc (Roadmap)</div>
                <div className="text-3xl font-bold text-foreground flex items-baseline gap-2">
                  {totalTasks} <span className="text-sm font-normal text-muted-foreground">tasks</span>
                </div>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-green-500 bg-green-50/30">
                <div className="text-sm font-medium text-green-800 mb-1">Dự kiến thưởng theo kịch bản</div>
                <div className="text-3xl font-bold text-green-600 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  {formatVND(totalExpectedBonus, 'full')}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([groupTitle, tasks]) => (
                <div key={groupTitle} className="glass-card overflow-hidden">
                  <div className="bg-muted/40 px-5 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {groupTitle}
                    </h3>
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {tasks.length} công việc
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {tasks.map((item, tIdx) => (
                      <div key={item.task.id || tIdx} className="p-4 sm:p-5 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {item.weekTitle || 'Tuần ?'}
                            </span>
                            <h4 className="font-medium text-foreground">{item.task.title}</h4>
                            {item.task.syncedToTasks && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Đã đồng bộ
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
