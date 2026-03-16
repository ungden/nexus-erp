/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { memo } from "react"
import { Handle, Position } from "@xyflow/react"
import { Users, DollarSign, Target, Briefcase, TrendingUp } from "lucide-react"
import { formatVND } from '@/lib/format'

const icons: Record<string, any> = {
  company: Briefcase,
  sales: DollarSign,
  marketing: Users,
  product: Target,
  admin: TrendingUp,
}

const colors: Record<string, string> = {
  company: "#3b82f6",
  sales: "#3b82f6",
  marketing: "#8b5cf6",
  product: "#10b981",
  admin: "#f59e0b",
}

export const GlassNode = memo(({ data }: any) => {
  const Icon = icons[data.type] || Briefcase
  const color = colors[data.type] || "#3b82f6"
  const isRoot = data.type === "company"

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !border-2 !border-background" style={{ backgroundColor: color }} />
      
      <div className={`
        rounded-2xl border border-border bg-card text-foreground shadow-lg
        ${isRoot ? "w-[280px]" : "w-[260px]"}
        hover:border-primary/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300
      `}>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border border-border/50 bg-background shadow-sm" style={{ color }}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm text-foreground leading-tight truncate tracking-tight">{data.label}</h3>
              <p className="text-[#64748b] font-medium text-xs leading-tight mt-0.5">{data.description}</p>
            </div>
          </div>
          
          <div className="flex items-end justify-between pt-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pb-1">Ngân sách</span>
            <span className="text-xl font-black tracking-tight" style={{ color }}>{formatVND(data.budget)}</span>
          </div>

          {(data.headcount || data.kpi) && (
            <div className="space-y-2 pt-3 border-t border-border">
              {data.headcount && (
                <div className="flex justify-between text-xs items-center">
                  <span className="text-[#64748b] font-medium">Nhân sự</span>
                  <span className="text-foreground font-bold bg-secondary px-2 py-0.5 rounded-full border border-border">{data.headcount}</span>
                </div>
              )}
              {data.kpi && (
                <div className="text-xs pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">KPI Q1</span>
                  <span className="text-foreground font-semibold leading-tight block">{data.kpi}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !border-2 !border-background" style={{ backgroundColor: color }} />
    </>
  )
})
GlassNode.displayName = "GlassNode"
