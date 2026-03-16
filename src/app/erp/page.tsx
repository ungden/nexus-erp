'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Clock,
  DollarSign,
  Wallet,
  ArrowDownRight,
  Target,
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAppContext } from '@/context/AppContext';
import { formatVND, formatNumber } from '@/lib/format';
import Link from 'next/link';

const defaultRevenueData = [
  { name: 'T1', actual: 400, target: 500 },
  { name: 'T2', actual: 600, target: 600 },
  { name: 'T3', actual: 800, target: 700 },
  { name: 'T4', actual: 750, target: 800 },
  { name: 'T5', actual: 900, target: 900 },
  { name: 'T6', actual: 950, target: 1000 },
];

const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } })
};

export default function Dashboard() {
  const { finance, setFinance, deals, employees, expenses, roadmap } = useAppContext();
  
  const targetRevenue = finance.targetRevenue;
  const allocations = finance.allocations;

  const handleAllocationChange = (key: keyof typeof allocations, value: number) => {
    setFinance(prev => ({
      ...prev,
      allocations: { ...prev.allocations, [key]: value }
    }));
  };

  const setTargetRevenue = (value: number) => {
    setFinance(prev => ({ ...prev, targetRevenue: value }));
  };

  const budgetData = [
    { name: 'Giá vốn (COGS)', value: (targetRevenue * allocations.cogs) / 100, color: COLORS[0] },
    { name: 'Nhân sự (HR)', value: (targetRevenue * allocations.hr) / 100, color: COLORS[1] },
    { name: 'Marketing', value: (targetRevenue * allocations.mkt) / 100, color: COLORS[2] },
    { name: 'Vận hành (Ops)', value: (targetRevenue * allocations.ops) / 100, color: COLORS[3] },
    { name: 'Lợi nhuận (Profit)', value: (targetRevenue * allocations.profit) / 100, color: COLORS[4] },
  ];

  const pieData = budgetData.map(item => ({ name: item.name, value: item.value }));

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

  // Derive revenue chart data from roadmap quarters if available
  const revenueData = useMemo(() => {
    if (roadmap?.tree?.children && roadmap.tree.children.length >= 4) {
      const quarters = roadmap.tree.children;
      // Expand 4 quarters into ~6 data points (Q1 → T1/T2, Q2 → T3/T4, Q3 → T5, Q4 → T6)
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

  // Get current quarter data from roadmap
  const currentQuarter = useMemo(() => {
    if (!roadmap?.tree?.children || roadmap.tree.children.length === 0) return null;
    const currentQ = Math.ceil((new Date().getMonth() + 1) / 3) - 1; // 0-indexed
    return roadmap.tree.children[Math.min(currentQ, roadmap.tree.children.length - 1)];
  }, [roadmap]);

  const hrBudget = (targetRevenue * allocations.hr) / 100;
  const mktBudget = (targetRevenue * allocations.mkt) / 100;
  const profitTarget = (targetRevenue * allocations.profit) / 100;
  const revenuePercent = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;

  const actualCards = [
    { 
      label: 'Doanh thu thực tế', 
      sublabel: 'Từ CRM',
      value: actualRevenue, 
      icon: Wallet,
      iconColor: 'text-primary',
      iconBg: 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20',
      trend: revenuePercent >= 50 ? 'up' : 'down',
      trendValue: `${revenuePercent}% Mục tiêu`,
      trendPositive: actualRevenue >= targetRevenue
    },
    { 
      label: 'Quỹ lương', 
      sublabel: 'Từ HRM',
      value: actualHRCost, 
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200',
      trend: actualHRCost <= hrBudget ? 'up' : 'down',
      trendValue: actualHRCost <= hrBudget ? `Dư ${formatVND(hrBudget - actualHRCost)}` : `Vượt ${formatVND(actualHRCost - hrBudget)}`,
      trendPositive: actualHRCost <= hrBudget
    },
    { 
      label: 'Chi phí Marketing', 
      sublabel: 'Thực tế',
      value: actualMktCost, 
      icon: TrendingUp,
      iconColor: 'text-amber-500',
      iconBg: 'bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200',
      trend: actualMktCost <= mktBudget ? 'up' : 'down',
      trendValue: actualMktCost <= mktBudget ? `Dư ${formatVND(mktBudget - actualMktCost)}` : `Vượt ${formatVND(actualMktCost - mktBudget)}`,
      trendPositive: actualMktCost <= mktBudget
    },
    { 
      label: 'Lợi nhuận tạm tính', 
      sublabel: 'Doanh thu - Chi phí',
      value: actualProfit, 
      icon: DollarSign,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200',
      trend: actualProfit >= 0 ? 'up' : 'down',
      trendValue: `Target: ${formatVND(profitTarget)}`,
      trendPositive: actualProfit >= profitTarget
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Tổng quan (Dẫn dắt bởi Dòng tiền)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mô hình quản trị lấy Dòng tiền làm trung tâm. Mọi ngân sách phòng ban được phân bổ từ Mục tiêu Doanh thu.
        </p>
      </motion.div>

      {/* Finance-Led Planning Section */}
      <motion.div 
        className="glass-card overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="bg-primary/5 p-4 md:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-primary flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Hoạch định Ngân sách (Top-Down)
            </h2>
            <p className="text-xs md:text-sm text-primary/90 mt-1">Nhập mục tiêu doanh thu để tự động phân bổ ngân sách cho các phòng ban.</p>
          </div>
          <div className="flex items-center space-x-3 bg-card p-2 rounded-lg border border-primary/30 shadow-sm">
            <label className="text-xs md:text-sm font-medium text-foreground/90 whitespace-nowrap">Mục tiêu DT:</label>
            <input 
              type="text" 
              className="w-32 md:w-40 px-3 py-1.5 border border-border rounded-md focus:ring-primary/50 focus:border-primary font-semibold text-primary/90 text-sm"
              value={targetRevenue ? formatNumber(Number(String(targetRevenue).replace(/\D/g, ''))) : ''}
              onChange={(e) => setTargetRevenue(Number(e.target.value.replace(/\D/g, '')))}
            />
            <span className="text-xs md:text-sm font-medium text-muted-foreground">VNĐ</span>
          </div>
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Allocation Inputs */}
          <div className="space-y-4 lg:col-span-1">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Tỷ lệ Phân bổ (%)</h3>
            {Object.entries(allocations).map(([key, value], index) => {
              const labels: Record<string, string> = {
                cogs: 'Giá vốn (COGS)', hr: 'Nhân sự (HRM)', mkt: 'Marketing', ops: 'Vận hành', profit: 'Lợi nhuận mục tiêu'
              };
              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index] }}></div>
                    <span className="text-sm text-foreground/90">{labels[key]}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="number" 
                      className="w-16 px-2 py-1 text-right border border-border rounded-md text-sm"
                      value={value}
                      onChange={(e) => handleAllocationChange(key as keyof typeof allocations, Number(e.target.value))}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t flex justify-between items-center font-bold">
              <span className="text-sm text-foreground">Tổng cộng:</span>
              <span className={`text-sm ${Object.values(allocations).reduce((a, b) => a + b, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                {Object.values(allocations).reduce((a, b) => a + b, 0)}%
              </span>
            </div>
          </div>

          {/* Budget Drop-down Results */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {budgetData.map((item, index) => (
              <motion.div 
                key={item.name} 
                custom={index}
                variants={fadeIn}
                initial="hidden"
                animate="show"
                className="bg-muted/30 rounded-xl p-4 border border-border relative overflow-hidden hover:border-primary/20 transition-colors"
              >
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: item.color }}></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{item.name}</p>
                    <p className="text-lg font-bold text-foreground">{formatVND(item.value, 'full')}</p>
                  </div>
                  <div className="p-2 bg-card rounded-md shadow-sm">
                    <ArrowDownRight className="w-4 h-4 text-muted-foreground/70" />
                  </div>
                </div>
                {item.name === 'Nhân sự (HR)' && (
                  <p className="text-xs text-primary mt-2 font-medium bg-primary/5 inline-block px-2 py-1 rounded">
                    {'→'} Ngân sách cho HRM Module
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Actual Performance Grid */}
      <h2 className="text-lg font-bold text-foreground mt-10">Tình hình Thực tế (Actuals)</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actualCards.map((card, i) => (
          <motion.div 
            key={card.label}
            custom={i}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            whileHover={{ y: -4, scale: 1.02 }}
            className="glass-card p-5 md:p-6 hover:shadow-lg transition-all duration-300 ease-out cursor-default"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${card.trendPositive ? 'text-green-600' : 'text-red-600'}`}>
                {card.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {card.trendValue}
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{formatVND(card.value, 'full')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{card.sublabel}</p>
          </motion.div>
        ))}
      </div>

      {/* Roadmap Quý hiện tại */}
      {roadmap && currentQuarter ? (
        <motion.div 
          className="glass-card overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="bg-emerald-50 p-4 md:p-5 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base md:text-lg font-bold text-emerald-800 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Roadmap Quý hiện tại
              </h2>
              <p className="text-xs text-emerald-600 mt-0.5">{currentQuarter.title} — {currentQuarter.description}</p>
            </div>
            <Link href="/erp/plan/view">
              <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors">
                Xem chi tiết Roadmap <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
          <div className="p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Mục tiêu Doanh thu</p>
                <p className="text-lg font-bold text-foreground">{formatVND(currentQuarter.revenue, 'full')}</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Ngân sách Chi phí</p>
                <p className="text-lg font-bold text-foreground">{formatVND(currentQuarter.expense, 'full')}</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Dòng tiền</p>
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-bold ${currentQuarter.cashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {currentQuarter.cashflow >= 0 ? '+' : ''}{formatVND(currentQuarter.cashflow, 'full')}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    currentQuarter.cashflowStatus === 'healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    currentQuarter.cashflowStatus === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {currentQuarter.cashflowStatus === 'healthy' ? 'Khoẻ' : currentQuarter.cashflowStatus === 'warning' ? 'Lưu ý' : 'Nguy hiểm'}
                  </span>
                </div>
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
          className="relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-background p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-soft" />
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 relative">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Tạo AI Roadmap để theo dõi kế hoạch</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Hệ thống AI sẽ tự động phân bổ ngân sách, mục tiêu, và công việc hàng ngày dựa trên doanh thu kỳ vọng.</p>
            </div>
          </div>
          <Link href="/erp/plan" className="relative z-10 shrink-0">
            <button className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1">
              Tạo Roadmap Ngay <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </motion.div>
      )}

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
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" name="Thực tế" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Alerts & Pie */}
        <motion.div 
          className="glass-card p-5 md:p-6"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-base md:text-lg font-medium text-foreground mb-4">Cảnh báo & Phê duyệt (Finance)</h2>
          <div className="flow-root">
            <ul role="list" className="-my-5 divide-y divide-border">
              {actualMktCost > mktBudget && (
                <li className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 p-2 bg-red-50 rounded-lg"><AlertCircle className="h-5 w-5 text-red-500" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">Marketing vượt ngân sách</p>
                      <p className="text-xs text-muted-foreground truncate">Chi phí thực tế vượt ngân sách phân bổ {formatVND(actualMktCost - mktBudget, 'full')}.</p>
                    </div>
                    <button className="inline-flex items-center px-2.5 py-1.5 border border-border text-xs font-medium rounded-lg text-foreground/90 bg-card hover:bg-muted/30">
                      Chi tiết
                    </button>
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
                      <p className="text-xs text-muted-foreground truncate">Ngân sách HR còn dư {formatVND(hrBudget - actualHRCost, 'full')}. Đủ điều kiện tuyển thêm.</p>
                    </div>
                    <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-primary hover:bg-primary/90">
                      Xem HR
                    </button>
                  </div>
                </li>
              )}
            </ul>
          </div>
          
          {/* Mini Pie Chart */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Phân bổ Ngân sách</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: unknown) => formatVND(Number(value), 'full')}
                    contentStyle={{ 
                      background: 'rgba(255,255,255,0.95)', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '12px' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
