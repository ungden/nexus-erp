"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Loader2, TrendingUp, Wallet, DollarSign, Circle, User, BarChart3 } from "lucide-react"
import { RoadmapNode, CashflowStatus, LEVEL_ICONS } from "@/lib/roadmap-types"
import { formatVND } from '@/lib/format'

const statusColors: Record<CashflowStatus, { dot: string; text: string; badge: string }> = {
  healthy: { dot: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  danger: { dot: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-50 text-red-700 border-red-200' },
}

interface Props {
  node: RoadmapNode;
  depth: number;
  onExpand: (nodeId: string) => void;
}

export function RoadmapNodeCard({ node, depth, onExpand }: Props) {
  const colors = statusColors[node.cashflowStatus];
  const isTask = node.level === 'task';
  const isDay = node.level === 'day';
  const isQuarter = node.level === 'quarter';
  const canExpand = !isTask;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative">
      {/* Decorative connecting line for children (added dynamically via wrapper) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`
          glass-card overflow-hidden transition-all duration-300 ease-out
          ${isTask ? 'border-l-2' : 'border-l-4'}
          ${node.cashflowStatus === 'healthy' ? 'border-l-emerald-400' : node.cashflowStatus === 'warning' ? 'border-l-amber-400' : 'border-l-red-400'}
          ${canExpand ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : 'hover:border-primary/30'}
        `}
        onClick={() => canExpand && onExpand(node.id)}
      >
        <div className={`${isTask ? 'p-3' : 'p-4 md:p-5'}`}>
          {/* Header Row */}
          <div className="flex items-start gap-3">
            {/* Expand/Collapse icon */}
            <div className="pt-0.5 shrink-0">
              {node.isLoading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : canExpand ? (
                <motion.div 
                  initial={false}
                  animate={{ rotate: node.isExpanded ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 mt-0.5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">{LEVEL_ICONS[node.level]}</span>
                <h3 className={`font-bold text-foreground ${isTask ? 'text-sm' : 'text-base'} tracking-tight`}>
                  {node.title}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                  {node.cashflowStatus === 'healthy' ? 'Khoẻ' : node.cashflowStatus === 'warning' ? 'Lưu ý' : 'Nguy hiểm'}
                </span>
                {node.department && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {node.department}
                  </span>
                )}
              </div>
              
              {node.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{node.description}</p>
              )}

              {/* Quarter-level: theme subtitle */}
              {isQuarter && node.theme && (
                <p className="text-sm font-semibold text-primary mt-1.5 tracking-tight">
                  🎯 {node.theme}
                </p>
              )}

              {/* Quarter-level: milestones badges */}
              {isQuarter && node.milestones && node.milestones.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {node.milestones.map((ms, i) => (
                    <span key={i} className="inline-flex items-center text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
                      🏁 {ms}
                    </span>
                  ))}
                </div>
              )}

              {/* Financial summary — only for non-task nodes */}
              {!isTask && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">Doanh thu:</span>
                    <span className="font-bold text-foreground">{formatVND(node.revenue)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5 text-red-400" />
                    <span className="font-medium">Chi phí:</span>
                    <span className="font-bold text-foreground">{formatVND(node.expense)}</span>
                  </span>
                  <span className={`flex items-center gap-1.5 font-bold ${colors.text}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    {node.cashflow >= 0 ? '+' : ''}{formatVND(node.cashflow)}
                  </span>
                </div>
              )}

              {/* Task-level: compact financial */}
              {isTask && node.revenue > 0 && (
                <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                  <span className="text-emerald-600 font-semibold">+{formatVND(node.revenue)}</span>
                  <span className="text-red-400 font-medium">-{formatVND(node.expense)}</span>
                </div>
              )}

              {/* Assignee display for task-level nodes */}
              {isTask && node.assigneeName && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    <User className="w-3 h-3" />
                    {node.assigneeName}
                  </span>
                </div>
              )}

              {/* Task-level: personal KPI */}
              {isTask && node.personalKPI && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                  <BarChart3 className="w-3 h-3 text-primary" />
                  <span className="font-medium">{node.personalKPI}</span>
                </div>
              )}

              {/* Task-level: bonus info */}
              {isTask && node.bonusPercent != null && node.bonusAmount != null && (
                <div className="mt-1.5 text-[11px] font-semibold text-emerald-600">
                  💰 Thưởng: +{node.bonusPercent}% lương (~{formatVND(node.bonusAmount)})
                </div>
              )}

              {/* Day-level: show date range */}
              {isDay && node.startDate && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                  <span className="font-medium">{node.startDate}</span>
                </div>
              )}

              {/* KPIs */}
              {node.kpis.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {node.kpis.map((kpi, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-full">
                      {kpi}
                    </span>
                  ))}
                </div>
              )}

              {/* Expand hint */}
              {canExpand && !hasChildren && !node.isLoading && (
                <p className="text-[11px] text-primary/60 font-medium mt-2 flex items-center gap-1">
                  <Loader2 className="w-3 h-3" />
                  Click để AI phân tích chi tiết
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {node.isExpanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative space-y-2 mt-2 ml-5 pl-4 border-l-2 border-border/60"
          >
            {/* The horizontal connecting line for the first child if needed, but border-l is enough for modern UI */}
            {node.children.map((child, i) => (
              <motion.div
                key={child.id}
                className="relative"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {/* Horizontal tick mark connecting to child */}
                <div className="absolute -left-4 top-6 w-3 border-t-2 border-border/60" />
                <RoadmapNodeCard
                  node={child}
                  depth={depth + 1}
                  onExpand={onExpand}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
