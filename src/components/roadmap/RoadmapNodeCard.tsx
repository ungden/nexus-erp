"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronDown, Loader2, TrendingUp, Wallet, DollarSign, Circle } from "lucide-react"
import { RoadmapNode, CashflowStatus, LEVEL_ICONS } from "@/lib/roadmap-types"

const statusColors: Record<CashflowStatus, { dot: string; text: string; badge: string }> = {
  healthy: { dot: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  danger: { dot: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-50 text-red-700 border-red-200' },
}

function formatVND(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} tr`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('vi-VN').format(val);
}

interface Props {
  node: RoadmapNode;
  depth: number;
  onExpand: (nodeId: string) => void;
}

export function RoadmapNodeCard({ node, depth, onExpand }: Props) {
  const colors = statusColors[node.cashflowStatus];
  const isTask = node.level === 'task';
  const canExpand = !isTask;
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 1;

  return (
    <div style={{ marginLeft: `${indent}rem` }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`
          glass-card overflow-hidden transition-all duration-200
          ${isTask ? 'border-l-2' : 'border-l-4'}
          ${node.cashflowStatus === 'healthy' ? 'border-l-emerald-400' : node.cashflowStatus === 'warning' ? 'border-l-amber-400' : 'border-l-red-400'}
          ${canExpand ? 'hover:shadow-lg cursor-pointer' : ''}
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
                node.isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )
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
            className="space-y-2 mt-2"
          >
            {node.children.map((child, i) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
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
