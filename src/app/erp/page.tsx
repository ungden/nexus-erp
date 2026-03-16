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
  ArrowUpRight
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

const revenueData = [
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
  const { finance, setFinance, deals, employees, expenses } = useAppContext();
  
  const targetRevenue = finance.targetRevenue;
  const allocations = finance.allocations;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatShort = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} tr`;
    return formatCurrency(value);
  };

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
      iconBg: 'bg-primary/10',
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
      iconBg: 'bg-blue-50',
      trend: actualHRCost <= hrBudget ? 'up' : 'down',
      trendValue: actualHRCost <= hrBudget ? `Dư ${formatShort(hrBudget - actualHRCost)}` : `Vượt ${formatShort(actualHRCost - hrBudget)}`,
      trendPositive: actualHRCost <= hrBudget
    },
    { 
      label: 'Chi phí Marketing', 
      sublabel: 'Thực tế',
      value: actualMktCost, 
      icon: TrendingUp,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
      trend: actualMktCost <= mktBudget ? 'up' : 'down',
      trendValue: actualMktCost <= mktBudget ? `Dư ${formatShort(mktBudget - actualMktCost)}` : `Vượt ${formatShort(actualMktCost - mktBudget)}`,
      trendPositive: actualMktCost <= mktBudget
    },
    { 
      label: 'Lợi nhuận tạm tính', 
      sublabel: 'Doanh thu - Chi phí',
      value: actualProfit, 
      icon: DollarSign,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      trend: actualProfit >= 0 ? 'up' : 'down',
      trendValue: `Target: ${formatShort(profitTarget)}`,
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
              type="number" 
              className="w-32 md:w-40 px-3 py-1.5 border border-border rounded-md focus:ring-primary/50 focus:border-primary font-semibold text-primary/90 text-sm"
              value={targetRevenue}
              onChange={(e) => setTargetRevenue(Number(e.target.value))}
              step="100000000"
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
                    <p className="text-lg font-bold text-foreground">{formatCurrency(item.value)}</p>
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
      <h2 className="text-lg font-bold text-foreground mt-8">Tình hình Thực tế (Actuals)</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actualCards.map((card, i) => (
          <motion.div 
            key={card.label}
            custom={i}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="glass-card p-5 md:p-6 hover:shadow-lg transition-shadow"
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
            <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{formatCurrency(card.value)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{card.sublabel}</p>
          </motion.div>
        ))}
      </div>

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
                      <p className="text-xs text-muted-foreground truncate">Chi phí thực tế vượt ngân sách phân bổ {formatCurrency(actualMktCost - mktBudget)}.</p>
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
                    <p className="text-xs text-muted-foreground truncate">Tổng quỹ lương: {formatCurrency(actualHRCost)} (Ngân sách: {formatCurrency(hrBudget)}).</p>
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
                      <p className="text-xs text-muted-foreground truncate">Ngân sách HR còn dư {formatCurrency(hrBudget - actualHRCost)}. Đủ điều kiện tuyển thêm.</p>
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
                    formatter={(value: unknown) => formatCurrency(Number(value))}
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
