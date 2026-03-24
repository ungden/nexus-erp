'use client';

import { useState, useMemo, useEffect } from 'react';
import { Target, BarChart3, AlertTriangle, CheckCircle2, ChevronRight, X, Trash2, TrendingUp } from 'lucide-react';
import { useAppContext, KPI as AppKPI, KpiStatus } from '@/context/AppContext';
import { formatVND, formatNumber } from '@/lib/format';

const statusConfig: Record<KpiStatus, { label: string; color: string; bg: string; barColor: string; border: string; gradient: string }> = {
  'on-track': { label: 'Đúng tiến độ', color: 'text-indigo-700', bg: 'bg-indigo-50', barColor: 'bg-indigo-500', border: 'border-indigo-200', gradient: 'from-indigo-500 to-indigo-400' },
  'at-risk': { label: 'Có nguy cơ', color: 'text-amber-700', bg: 'bg-amber-50', barColor: 'bg-amber-500', border: 'border-amber-200', gradient: 'from-amber-500 to-amber-400' },
  'behind': { label: 'Chậm trễ', color: 'text-red-700', bg: 'bg-red-50', barColor: 'bg-red-500', border: 'border-red-200', gradient: 'from-red-500 to-red-400' },
};

export default function KPI() {
  const { kpis, setKpis } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKpi, setNewKpi] = useState<Partial<AppKPI>>({ status: 'on-track' });
  const [animateProgress, setAnimateProgress] = useState(false);

  // Trigger progress bar animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateProgress(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleAddKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKpi.title || !newKpi.target || !newKpi.current) return;

    const target = Number(newKpi.target);
    const current = Number(newKpi.current);
    const progress = Math.min(Math.round((current / target) * 100), 100);

    const kpi: AppKPI = {
      id: Date.now(),
      title: newKpi.title,
      target,
      current,
      progress,
      status: newKpi.status as KpiStatus,
      department: newKpi.department || 'Chung',
    };

    setKpis([...kpis, kpi]);
    setIsModalOpen(false);
    setNewKpi({ status: 'on-track' });
  };

  const deleteKpi = (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa KPI này?')) {
      setKpis(kpis.filter(k => k.id !== id));
    }
  };

  // ── Scorecard stats ─────────────────────────────────────────
  const totalCount = kpis.length;
  const onTrackCount = kpis.filter(k => k.status === 'on-track').length;
  const atRiskCount = kpis.filter(k => k.status === 'at-risk').length;
  const behindCount = kpis.filter(k => k.status === 'behind').length;

  // ── Group by department ─────────────────────────────────────
  const groupedKpis = useMemo(() => {
    const groups: Record<string, AppKPI[]> = {};
    kpis.forEach(kpi => {
      const dept = kpi.department || 'Chung';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(kpi);
    });
    return groups;
  }, [kpis]);

  const departments = Object.keys(groupedKpis).sort();

  // ── Department avg progress for comparison bars ─────────────
  const deptAvgProgress = useMemo(() => {
    return departments.map(dept => {
      const deptKpis = groupedKpis[dept];
      const avg = deptKpis.length > 0
        ? Math.round(deptKpis.reduce((sum, k) => sum + k.progress, 0) / deptKpis.length)
        : 0;
      return { department: dept, avgProgress: avg, count: deptKpis.length };
    }).sort((a, b) => b.avgProgress - a.avgProgress);
  }, [departments, groupedKpis]);

  const scorecardItems = [
    { label: 'Tổng KPIs', value: totalCount, icon: BarChart3, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50', borderColor: 'border-l-indigo-500' },
    { label: 'Đạt mục tiêu', value: onTrackCount, icon: CheckCircle2, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', borderColor: 'border-l-emerald-500' },
    { label: 'Đang theo dõi', value: atRiskCount, icon: AlertTriangle, iconColor: 'text-amber-600', iconBg: 'bg-amber-50', borderColor: 'border-l-amber-500' },
    { label: 'Cần cải thiện', value: behindCount, icon: Target, iconColor: 'text-red-600', iconBg: 'bg-red-50', borderColor: 'border-l-red-500' },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Đánh giá Năng lực & KPI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi mục tiêu (OKR/KPI) của công ty, phòng ban và cá nhân.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 py-2 px-4"
        >
          <Target className="mr-2 h-4 w-4" /> Thiết lập Mục tiêu
        </button>
      </div>

      {/* ── Overview row: on-track / at-risk / behind color cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-200 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500 text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-700">Đúng tiến độ</p>
            <p className="text-3xl font-bold text-emerald-800">{onTrackCount}</p>
          </div>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-200 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-700">Có nguy cơ</p>
            <p className="text-3xl font-bold text-amber-800">{atRiskCount}</p>
          </div>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-200 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-500 text-white">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-red-700">Chậm trễ</p>
            <p className="text-3xl font-bold text-red-800">{behindCount}</p>
          </div>
        </div>
      </div>

      {/* ── Scorecard header (4 mini cards) ────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {scorecardItems.map((item) => (
          <div
            key={item.label}
            className={`bg-card rounded-xl border border-border border-l-4 ${item.borderColor} p-4 flex items-center gap-3`}
          >
            <div className={`p-2 rounded-lg ${item.iconBg}`}>
              <item.icon className={`h-5 w-5 ${item.iconColor}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Department comparison bars ────────────────────────── */}
      {deptAvgProgress.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border bg-muted/20 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">So sánh tiến độ theo Phòng ban</h2>
          </div>
          <div className="p-4 md:p-5 space-y-3">
            {deptAvgProgress.map((d) => (
              <div key={d.department} className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-28 truncate shrink-0">{d.department}</span>
                <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
                    style={{ width: animateProgress ? `${d.avgProgress}%` : '0%' }}
                  />
                  <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-bold text-foreground/80">
                    {d.avgProgress}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{d.count} KPIs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs grouped by department ─────────────────────────── */}
      {kpis.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          Chưa có mục tiêu nào được thiết lập.
        </div>
      ) : (
        departments.map((dept) => (
          <div key={dept} className="glass-card overflow-hidden">
            {/* Department header */}
            <div className="p-4 md:p-5 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">{dept}</h2>
                <span className="text-xs text-muted-foreground">({groupedKpis[dept].length} KPIs)</span>
              </div>
            </div>

            {/* KPI cards within department */}
            <div className="divide-y divide-border">
              {groupedKpis[dept].map((kpi) => {
                const status = statusConfig[kpi.status];
                return (
                  <div
                    key={kpi.id}
                    className={`p-4 md:p-5 hover:bg-muted/20 transition-colors group border-l-4 ${
                      kpi.status === 'on-track' ? 'border-l-indigo-500' :
                      kpi.status === 'at-risk' ? 'border-l-amber-500' : 'border-l-red-500'
                    }`}
                  >
                    {/* Top row: title + badges + actions */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{kpi.title}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${status.bg} ${status.color} ${status.border}`}>
                          {status.label}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/50 text-muted-foreground border border-border">
                          {kpi.department}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => deleteKpi(kpi.id)} className="text-muted-foreground/70 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="text-muted-foreground/70 hover:text-muted-foreground">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>Đạt được: <strong className="text-foreground">{formatVND(kpi.current, 'full')}</strong></span>
                      <span>Mục tiêu: <strong className="text-foreground">{formatVND(kpi.target, 'full')}</strong></span>
                    </div>

                    {/* Progress bar — gradient colors + animate on load */}
                    <div className="relative w-full h-3 bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${status.gradient} transition-all duration-700 ease-out`}
                        style={{ width: animateProgress ? `${kpi.progress}%` : '0%' }}
                      />
                      {/* Percentage label inside bar */}
                      <div className="absolute inset-0 flex items-center justify-end pr-2">
                        <span className={`text-[10px] font-bold ${kpi.progress > 30 ? 'text-white' : 'text-muted-foreground'}`}>
                          {kpi.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* ── Add KPI Modal ──────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Thiết lập Mục tiêu mới</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddKpi} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Tên mục tiêu (KPI/OKR)</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newKpi.title || ''}
                  onChange={e => setNewKpi({...newKpi, title: e.target.value})}
                  placeholder="VD: Doanh thu Q4/2023"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Mục tiêu cần đạt</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newKpi.target ? formatNumber(Number(String(newKpi.target).replace(/\D/g, ''))) : ''}
                    onChange={e => setNewKpi({...newKpi, target: Number(e.target.value.replace(/\D/g, ''))})}
                    placeholder="VD: 5.000.000.000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Hiện tại</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newKpi.current ? formatNumber(Number(String(newKpi.current).replace(/\D/g, ''))) : ''}
                    onChange={e => setNewKpi({...newKpi, current: Number(e.target.value.replace(/\D/g, ''))})}
                    placeholder="VD: 1.000.000.000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Trạng thái</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newKpi.status || 'on-track'}
                    onChange={e => setNewKpi({...newKpi, status: e.target.value as KpiStatus})}
                  >
                    <option value="on-track">Đúng tiến độ</option>
                    <option value="at-risk">Có nguy cơ</option>
                    <option value="behind">Chậm trễ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Phòng ban phụ trách</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newKpi.department || ''}
                    onChange={e => setNewKpi({...newKpi, department: e.target.value})}
                    placeholder="VD: Sales"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground/90 bg-card border border-border rounded-md hover:bg-muted/30"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                >
                  Lưu mục tiêu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
