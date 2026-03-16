"use client"

import { CashflowStatus } from "@/lib/roadmap-types"
import { formatVND } from '@/lib/format'

const statusConfig: Record<CashflowStatus, { label: string; color: string; bg: string; icon: string }> = {
  healthy: { label: 'Dòng tiền khoẻ', color: 'text-emerald-700', bg: 'bg-emerald-50/80 border-emerald-200', icon: '💚' },
  warning: { label: 'Cần lưu ý', color: 'text-amber-700', bg: 'bg-amber-50/80 border-amber-200', icon: '🟡' },
  danger: { label: 'Nguy hiểm', color: 'text-red-700', bg: 'bg-red-50/80 border-red-200', icon: '🔴' },
}

export function CashflowBar({ revenue, expense, cashflow, status }: {
  revenue: number; expense: number; cashflow: number; status: CashflowStatus;
}) {
  const cfg = statusConfig[status];
  const pct = revenue > 0 ? Math.min(Math.round((expense / revenue) * 100), 100) : 100;

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cfg.icon}</span>
          <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <span className={`text-sm font-bold ${cfg.color}`}>
          {cashflow >= 0 ? '+' : ''}{formatVND(cashflow)}
        </span>
      </div>
      
      <div className="flex h-2 rounded-full overflow-hidden bg-white/60 border border-white">
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: `${pct}%`,
            background: status === 'healthy' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444'
          }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs font-medium">
        <span className={cfg.color}>Chi phí: {formatVND(expense)} ({pct}%)</span>
        <span className={cfg.color}>Doanh thu: {formatVND(revenue)}</span>
      </div>
    </div>
  )
}
