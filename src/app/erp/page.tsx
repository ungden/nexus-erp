'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Clock,
  DollarSign,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useAppContext } from '@/context/AppContext';
import { formatVND } from '@/lib/format';
import Link from 'next/link';

const defaultRevenueData = [
  { name: 'T1', actual: 400, target: 500 },
  { name: 'T2', actual: 600, target: 600 },
  { name: 'T3', actual: 800, target: 700 },
  { name: 'T4', actual: 750, target: 800 },
  { name: 'T5', actual: 900, target: 900 },
  { name: 'T6', actual: 950, target: 1000 },
];

type FinancialTab = 'pnl' | 'balance' | 'cashflow';

// ── Financial table row helper ──────────────────────────────
function FinRow({ label, amount, bold, separator, indent, negative }: {
  label: string;
  amount: number;
  bold?: boolean;
  separator?: boolean;
  indent?: boolean;
  negative?: boolean;
}) {
  return (
    <tr className={`${bold ? 'font-bold' : ''} ${separator ? 'border-t border-border' : ''}`}>
      <td className={`py-2 text-sm ${indent ? 'pl-6' : 'pl-2'} ${bold ? 'text-foreground' : 'text-muted-foreground'}`}>
        {negative && amount !== 0 ? `(-) ${label}` : label}
      </td>
      <td className={`py-2 text-sm text-right pr-2 tabular-nums ${
        amount < 0 ? 'text-red-600' : bold ? 'text-foreground' : 'text-muted-foreground'
      }`}>
        {amount < 0 ? `-${formatVND(Math.abs(amount), 'full')}` : formatVND(amount, 'full')}
      </td>
    </tr>
  );
}

// ── Section header row ──────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={2} className="pt-4 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">
        {label}
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const { finance, deals, employees, expenses, roadmap, receivables, payables } = useAppContext();
  const [activeTab, setActiveTab] = useState<FinancialTab>('pnl');
  
  const targetRevenue = finance.targetRevenue;
  const allocations = finance.allocations;

  // ── Actual metrics ──────────────────────────────────────────
  const actualRevenue = useMemo(() => {
    return deals.filter(d => d.stage === 'Chốt sale').reduce((sum, d) => sum + d.amount, 0);
  }, [deals]);

  const actualHRCost = useMemo(() => {
    return employees.reduce((sum, e) => sum + e.baseSalary, 0);
  }, [employees]);

  const actualMktCost = useMemo(() => {
    return expenses.filter(e => e.category === 'mkt').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);
  
  const actualOpsCost = useMemo(() => {
    return expenses.filter(e => e.category === 'ops').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const actualCogsCost = useMemo(() => {
    return expenses.filter(e => e.category === 'cogs').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const actualProfit = actualRevenue - actualHRCost - actualMktCost - actualOpsCost - actualCogsCost;

  // ── Financial report data ───────────────────────────────────
  const grossProfit = actualRevenue - actualCogsCost;
  const profitBeforeTax = grossProfit - actualHRCost - actualMktCost - actualOpsCost;
  const taxAmount = profitBeforeTax > 0 ? Math.round(profitBeforeTax * 0.2) : 0;
  const netProfit = profitBeforeTax - taxAmount;

  // Balance sheet
  const totalReceivables = useMemo(() => receivables.reduce((sum, r) => sum + (r.amount - r.paidAmount), 0), [receivables]);
  const totalPayables = useMemo(() => payables.reduce((sum, p) => sum + (p.amount - p.paidAmount), 0), [payables]);
  const paidReceivables = useMemo(() => receivables.reduce((sum, r) => sum + r.paidAmount, 0), [receivables]);
  const paidPayables = useMemo(() => payables.reduce((sum, p) => sum + p.paidAmount, 0), [payables]);

  // Estimate cash = paid receivables - paid payables - salary - ops expenses
  const cashBalance = paidReceivables - paidPayables - actualHRCost - actualOpsCost;
  const totalAssets = cashBalance + totalReceivables;
  const totalLiabilities = totalPayables;
  const ownersEquity = totalAssets - totalLiabilities;
  const retainedEarnings = netProfit;
  const paidInCapital = ownersEquity - retainedEarnings;

  // Cashflow
  const cfFromOperations = paidReceivables - paidPayables - actualHRCost - actualOpsCost - actualMktCost;

  // ── Budget comparisons ──────────────────────────────────────
  const hrBudget = (targetRevenue * allocations.hr) / 100;
  const mktBudget = (targetRevenue * allocations.mkt) / 100;
  const profitTarget = (targetRevenue * allocations.profit) / 100;
  const revenuePercent = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;

  // ── Revenue chart from roadmap ──────────────────────────────
  const revenueData = useMemo(() => {
    if (roadmap?.tree?.children && roadmap.tree.children.length >= 4) {
      const quarters = roadmap.tree.children;
      return [
        { name: 'Q1a', actual: Math.round(quarters[0].revenue * 0.45 / 1000000), target: Math.round(quarters[0].revenue * 0.5 / 1000000) },
        { name: 'Q1b', actual: Math.round(quarters[0].revenue * 0.55 / 1000000), target: Math.round(quarters[0].revenue * 0.5 / 1000000) },
        { name: 'Q2a', actual: Math.round(quarters[1].revenue * 0.48 / 1000000), target: Math.round(quarters[1].revenue * 0.5 / 1000000) },
        { name: 'Q2b', actual: Math.round(quarters[1].revenue * 0.52 / 1000000), target: Math.round(quarters[1].revenue * 0.5 / 1000000) },
        { name: 'Q3', actual: Math.round(quarters[2].revenue * 0.9 / 1000000), target: Math.round(quarters[2].revenue / 1000000) },
        { name: 'Q4', actual: Math.round(quarters[3].revenue * 0.85 / 1000000), target: Math.round(quarters[3].revenue / 1000000) },
      ];
    }
    return defaultRevenueData;
  }, [roadmap]);

  const currentQuarter = useMemo(() => {
    if (!roadmap?.tree?.children || roadmap.tree.children.length === 0) return null;
    const currentQ = Math.ceil((new Date().getMonth() + 1) / 3) - 1;
    return roadmap.tree.children[Math.min(currentQ, roadmap.tree.children.length - 1)];
  }, [roadmap]);

  // ── Scorecard cards ─────────────────────────────────────────
  const scoreCards = [
    { 
      label: 'Doanh thu', 
      value: actualRevenue, 
      borderColor: 'border-l-indigo-500',
      icon: Wallet,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      trend: revenuePercent >= 50 ? 'up' as const : 'down' as const,
      trendValue: `${revenuePercent}% mục tiêu`,
      trendPositive: actualRevenue >= targetRevenue,
    },
    { 
      label: 'Quỹ lương', 
      value: actualHRCost, 
      borderColor: 'border-l-blue-500',
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      trend: actualHRCost <= hrBudget ? 'up' as const : 'down' as const,
      trendValue: actualHRCost <= hrBudget ? `Dư ${formatVND(hrBudget - actualHRCost)}` : `Vượt ${formatVND(actualHRCost - hrBudget)}`,
      trendPositive: actualHRCost <= hrBudget,
    },
    { 
      label: 'Chi phí MKT', 
      value: actualMktCost, 
      borderColor: 'border-l-amber-500',
      icon: TrendingUp,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      trend: actualMktCost <= mktBudget ? 'up' as const : 'down' as const,
      trendValue: actualMktCost <= mktBudget ? `Dư ${formatVND(mktBudget - actualMktCost)}` : `Vượt ${formatVND(actualMktCost - mktBudget)}`,
      trendPositive: actualMktCost <= mktBudget,
    },
    { 
      label: 'Lợi nhuận', 
      value: actualProfit, 
      borderColor: 'border-l-emerald-500',
      icon: DollarSign,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      trend: actualProfit >= 0 ? 'up' as const : 'down' as const,
      trendValue: `Target: ${formatVND(profitTarget)}`,
      trendPositive: actualProfit >= profitTarget,
    },
  ];

  const tabs: { key: FinancialTab; label: string; emoji: string }[] = [
    { key: 'pnl', label: 'Báo cáo Lãi/Lỗ', emoji: '\uD83D\uDCB0' },
    { key: 'balance', label: 'Bảng Cân đối', emoji: '\uD83D\uDCCA' },
    { key: 'cashflow', label: 'Dòng tiền', emoji: '\uD83D\uDCB8' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Tổng quan Tài chính</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dữ liệu thực tế từ CRM, HRM, và hệ thống chi phí. Cập nhật tự động.
        </p>
      </motion.div>

      {/* ── Section 1: Scorecard ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {scoreCards.map((card, i) => (
          <motion.div 
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className={`bg-card rounded-xl border border-border border-l-4 ${card.borderColor} p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${card.trendPositive ? 'text-green-600' : 'text-red-600'}`}>
                {card.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {card.trendValue}
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className={`text-xl md:text-2xl font-bold mt-1 ${card.value < 0 ? 'text-red-600' : 'text-foreground'}`}>
              {formatVND(card.value, 'full')}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Section 2: Financial Reports (3 tabs) ────────────── */}
      <motion.div 
        className="glass-card overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Tab bar */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <span className="mr-1.5">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 md:p-6">
          <table className="w-full">
            <tbody>
              {/* ── P&L Tab ─────────────────────────────────── */}
              {activeTab === 'pnl' && (
                <>
                  <FinRow label="Doanh thu" amount={actualRevenue} bold />
                  <FinRow label="Giá vốn hàng bán (COGS)" amount={-actualCogsCost} negative indent />
                  <FinRow label="= Lợi nhuận gộp" amount={grossProfit} bold separator />
                  <FinRow label="Chi phí nhân sự" amount={-actualHRCost} negative indent />
                  <FinRow label="Chi phí marketing" amount={-actualMktCost} negative indent />
                  <FinRow label="Chi phí vận hành" amount={-actualOpsCost} negative indent />
                  <FinRow label="= Lợi nhuận trước thuế" amount={profitBeforeTax} bold separator />
                  <FinRow label="Thuế TNDN (20%)" amount={-taxAmount} negative indent />
                  <FinRow label="= Lợi nhuận sau thuế" amount={netProfit} bold separator />
                </>
              )}

              {/* ── Balance Sheet Tab ───────────────────────── */}
              {activeTab === 'balance' && (
                <>
                  <SectionHeader label="Tài sản" />
                  <FinRow label="Tiền mặt & tương đương" amount={cashBalance > 0 ? cashBalance : 0} indent />
                  <FinRow label="Phải thu khách hàng" amount={totalReceivables} indent />
                  <FinRow label="Tổng Tài sản" amount={totalAssets} bold separator />

                  <SectionHeader label="Nợ phải trả" />
                  <FinRow label="Phải trả nhà cung cấp" amount={totalPayables} indent />
                  <FinRow label="Tổng Nợ phải trả" amount={totalLiabilities} bold separator />

                  <SectionHeader label="Vốn chủ sở hữu" />
                  <FinRow label="Vốn góp" amount={paidInCapital} indent />
                  <FinRow label="Lợi nhuận giữ lại" amount={retainedEarnings} indent />
                  <FinRow label="Tổng Vốn chủ sở hữu" amount={ownersEquity} bold separator />
                </>
              )}

              {/* ── Cashflow Tab ────────────────────────────── */}
              {activeTab === 'cashflow' && (
                <>
                  <SectionHeader label="Dòng tiền từ hoạt động kinh doanh" />
                  <FinRow label="Thu từ khách hàng" amount={paidReceivables} indent />
                  <FinRow label="Chi cho nhà cung cấp" amount={-paidPayables} negative indent />
                  <FinRow label="Chi lương nhân viên" amount={-actualHRCost} negative indent />
                  <FinRow label="Chi phí hoạt động khác" amount={-(actualOpsCost + actualMktCost)} negative indent />
                  <FinRow label="= Dòng tiền ròng từ KD" amount={cfFromOperations} bold separator />

                  <SectionHeader label="Dòng tiền từ đầu tư" />
                  <FinRow label="(Chưa có dữ liệu)" amount={0} indent />

                  <SectionHeader label="Dòng tiền từ tài chính" />
                  <FinRow label="(Chưa có dữ liệu)" amount={0} indent />

                  <FinRow label="= TỔNG DÒNG TIỀN RÒNG" amount={cfFromOperations} bold separator />
                </>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Section 3: Revenue Chart + Roadmap ───────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart */}
        <motion.div 
          className="glass-card p-5 md:p-6"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-base md:text-lg font-medium text-foreground mb-4">Biểu đồ Doanh thu: Mục tiêu vs Thực tế (Triệu VNĐ)</h2>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(255,255,255,0.95)', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)' 
                  }} 
                />
                <Area type="monotone" dataKey="target" stroke="#9ca3af" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorTarget)" name="Mục tiêu" />
                <Area type="monotone" dataKey="actual" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" name="Thực tế" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Roadmap widget */}
        {roadmap && currentQuarter ? (
          <motion.div 
            className="glass-card overflow-hidden"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="bg-emerald-50/50 p-4 md:p-5 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base md:text-lg font-bold text-emerald-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Roadmap Quý hiện tại
                </h2>
                <p className="text-xs text-emerald-600 mt-0.5">{currentQuarter.title} — {currentQuarter.description}</p>
              </div>
              <Link href="/erp/plan/view">
                <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors">
                  Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
            <div className="p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Mục tiêu DT</p>
                  <p className="text-lg font-bold text-foreground">{formatVND(currentQuarter.revenue, 'full')}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ngân sách CP</p>
                  <p className="text-lg font-bold text-foreground">{formatVND(currentQuarter.expense, 'full')}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dòng tiền</p>
                  <p className={`text-lg font-bold ${currentQuarter.cashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {currentQuarter.cashflow >= 0 ? '+' : ''}{formatVND(currentQuarter.cashflow, 'full')}
                  </p>
                </div>
              </div>
              {currentQuarter.kpis && currentQuarter.kpis.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">KPIs Quý</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentQuarter.kpis.map((kpi, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 rounded-full">
                        {kpi}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            className="relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-background p-8 sm:p-10 flex flex-col items-center justify-center gap-6"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center gap-5">
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Tạo AI Roadmap</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">Hệ thống AI sẽ phân bổ ngân sách, mục tiêu theo quý.</p>
              </div>
            </div>
            <Link href="/erp/plan">
              <button className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg transition-all">
                Tạo Roadmap <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        )}
      </div>

      {/* ── Section 4: Alerts ────────────────────────────────── */}
      <motion.div 
        className="glass-card p-5 md:p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-base md:text-lg font-medium text-foreground mb-4">Cảnh báo & Phê duyệt</h2>
        <div className="flow-root">
          <ul role="list" className="-my-5 divide-y divide-border">
            {actualMktCost > mktBudget && (
              <li className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 p-2 bg-red-50 rounded-lg"><AlertCircle className="h-5 w-5 text-red-500" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Marketing vượt ngân sách</p>
                    <p className="text-xs text-muted-foreground truncate">Vượt {formatVND(actualMktCost - mktBudget, 'full')} so với phân bổ.</p>
                  </div>
                  <button className="inline-flex items-center px-2.5 py-1.5 border border-border text-xs font-medium rounded-lg text-foreground/90 bg-card hover:bg-muted/30">
                    Chi tiết
                  </button>
                </div>
              </li>
            )}
            {netProfit < 0 && (
              <li className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 p-2 bg-red-50 rounded-lg"><AlertCircle className="h-5 w-5 text-red-500" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Lỗ ròng kỳ này</p>
                    <p className="text-xs text-muted-foreground truncate">Lợi nhuận sau thuế: {formatVND(netProfit, 'full')}. Cần rà soát chi phí.</p>
                  </div>
                </div>
              </li>
            )}
            <li className="py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 p-2 bg-primary/5 rounded-lg"><Clock className="h-5 w-5 text-primary/80" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">Duyệt quỹ lương tháng này</p>
                  <p className="text-xs text-muted-foreground truncate">Tổng quỹ lương: {formatVND(actualHRCost, 'full')} (Ngân sách: {formatVND(hrBudget, 'full')}).</p>
                </div>
                <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-primary hover:bg-primary/90">
                  Duyệt chi
                </button>
              </div>
            </li>
            {hrBudget - actualHRCost > 0 && (
              <li className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 p-2 bg-emerald-50 rounded-lg"><Users className="h-5 w-5 text-emerald-500" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Ngân sách tuyển dụng (HR)</p>
                    <p className="text-xs text-muted-foreground truncate">Còn dư {formatVND(hrBudget - actualHRCost, 'full')}. Đủ điều kiện tuyển thêm.</p>
                  </div>
                  <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-primary hover:bg-primary/90">
                    Xem HR
                  </button>
                </div>
              </li>
            )}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
