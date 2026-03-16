"use client"

import { CashflowStatus } from "@/lib/roadmap-types"
import { formatVND } from '@/lib/format'

const statusConfig: Record<CashflowStatus, { label: string; barColor: string; borderColor: string }> = {
  healthy: { label: 'Dòng tiền khoẻ', barColor: '#10b981', borderColor: 'border-emerald-300' },
  warning: { label: 'Cần lưu ý', barColor: '#f59e0b', borderColor: 'border-amber-300' },
  danger: { label: 'Nguy hiểm', barColor: '#ef4444', borderColor: 'border-red-300' },
}

export function CashflowBar({ revenue, expense, cashflow, status }: {
  revenue: number; expense: number; cashflow: number; status: CashflowStatus;
}) {
  const cfg = statusConfig[status];
  const pct = revenue > 0 ? Math.min(Math.round((expense / revenue) * 100), 100) : 100;

  return (
    <div className={`rounded-xl border bg-white p-4 ${cfg.borderColor}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-zinc-800">{cfg.label}</span>
        <span className="text-sm font-bold text-zinc-900">
          {cashflow >= 0 ? '+' : ''}{formatVND(cashflow)}
        </span>
      </div>
      
      <div className="flex h-2 rounded-full overflow-hidden bg-zinc-100">
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: cfg.barColor }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs font-medium text-zinc-500">
        <span>Chi phí: {formatVND(expense)} ({pct}%)</span>
        <span>Doanh thu: {formatVND(revenue)}</span>
      </div>
    </div>
  )
}
