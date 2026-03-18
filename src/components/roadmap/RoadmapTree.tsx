"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RoadmapNode, Roadmap } from "@/lib/roadmap-types"
import { CashflowBar } from "./CashflowBar"
import { formatVND } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAppContext, Task } from "@/context/AppContext"
import {
  Sparkles, ChevronRight, Calendar, Target, Users,
  Loader2, RefreshCw, Send, Edit2, X,
} from "lucide-react"

/* ── Props ────────────────────────────────────────────── */

interface Props {
  roadmap: Roadmap
  onUpdate: (roadmap: Roadmap) => void
}

/* ── Helpers ──────────────────────────────────────────── */

function findNode(root: RoadmapNode, id: string): RoadmapNode | null {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

function updateNodeInTree(
  root: RoadmapNode,
  nodeId: string,
  updater: (n: RoadmapNode) => RoadmapNode,
): RoadmapNode {
  if (root.id === nodeId) return updater(root)
  if (!root.children) return root
  return {
    ...root,
    children: root.children.map((c) => updateNodeInTree(c, nodeId, updater)),
  }
}

function updateNodesInTree(
  root: RoadmapNode,
  updates: Record<string, Partial<RoadmapNode>>,
): RoadmapNode {
  let node = root
  if (updates[root.id]) node = { ...root, ...updates[root.id] }
  if (!node.children) return node
  return { ...node, children: node.children.map((c) => updateNodesInTree(c, updates)) }
}

/* ── Shared Presentational Atoms ─────────────────────── */

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  healthy: { label: "Khoẻ", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  warning: { label: "Lưu ý", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  danger: { label: "Nguy hiểm", cls: "bg-red-100 text-red-700 border-red-200" },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.healthy
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1", cfg.cls)}>
      {status === "healthy" ? "💚" : status === "warning" ? "🟡" : "🔴"} {cfg.label}
    </span>
  )
}

function KpiPill({ text }: { text: string }) {
  return (
    <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 truncate max-w-[180px] inline-block">
      {text}
    </span>
  )
}

function countTasks(node: RoadmapNode): number {
  if (node.level === "task") return 1
  return (node.children ?? []).reduce((s, c) => s + countTasks(c), 0)
}

/* ── Main Component ──────────────────────────────────── */

export function RoadmapTree({ roadmap, onUpdate }: Props) {
  const { employees, tasks, setTasks } = useAppContext()
  const tree = roadmap.tree

  /* Navigation stack — last item is the "active" node ID */
  const [navStack, setNavStack] = useState<string[]>([tree.id])
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingTask, setEditingTask] = useState<RoadmapNode | null>(null)

  /* Sync navStack when tree root ID changes (e.g. after generation or roadmap switch) */
  const treeRootId = tree.id
  const currentNavRoot = navStack[0]
  if (currentNavRoot !== treeRootId) {
    setNavStack([treeRootId])
  }

  /* Derived: current node from the live tree */
  const activeId = navStack[navStack.length - 1]
  const currentNode = useMemo(() => findNode(tree, activeId) ?? tree, [tree, activeId])

  /* ── Navigation ─────────────────────────────────────── */

  function navigateTo(nodeId: string) {
    setNavStack((prev) => [...prev, nodeId])
  }

  function navigateToIndex(idx: number) {
    setNavStack((prev) => prev.slice(0, idx + 1))
  }

  /* ── Breadcrumb ─────────────────────────────────────── */

  function Breadcrumb() {
    const crumbs = navStack.map((id) => findNode(tree, id))
    return (
      <nav className="flex items-center gap-1 text-sm flex-wrap">
        {crumbs.map((node, idx) => {
          if (!node) return null
          const isLast = idx === crumbs.length - 1
          return (
            <span key={node.id} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              {isLast ? (
                <span className="font-bold text-foreground">{node.title}</span>
              ) : (
                <button
                  onClick={() => navigateToIndex(idx)}
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  {node.title}
                </button>
              )}
            </span>
          )
        })}
      </nav>
    )
  }

  /* ── API calls ──────────────────────────────────────── */

  async function handleExpandQuarters() {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/roadmap/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "expand-quarters",
          tree,
          profile: roadmap.company,
          board: roadmap.board,
        }),
      })
      const data = await res.json()
      if (data.tree) {
        // Reset nav to root because child IDs changed
        setNavStack([data.tree.id])
        onUpdate({ ...roadmap, tree: data.tree })
      }
    } catch (e) {
      console.error("Batch expand quarters failed", e)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleExpandMonths() {
    setIsGenerating(true)
    try {
      const empPayload = employees?.map((e) => ({
        id: e.id,
        name: e.name,
        department: e.department,
        role: e.role,
        baseSalary: e.baseSalary ?? 0,
      }))
      const res = await fetch("/api/roadmap/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "expand-months",
          tree: roadmap.tree,
          profile: roadmap.company,
          board: roadmap.board,
          employees: empPayload,
        }),
      })
      const data = await res.json()
      if (data.tree) {
        // Reset nav to root because child IDs changed
        setNavStack([data.tree.id])
        onUpdate({ ...roadmap, tree: data.tree })
      }
    } catch (e) {
      console.error("Batch expand months failed", e)
    } finally {
      setIsGenerating(false)
    }
  }

  /* ── Sync to ERP ────────────────────────────────────── */

  function collectUnsyncedTasks(node: RoadmapNode): RoadmapNode[] {
    if (node.level === "task" && !node.syncedToTasks) return [node]
    return (node.children ?? []).flatMap((c) => collectUnsyncedTasks(c))
  }

  function handlePushToERP(weekNode: RoadmapNode) {
    const unsynced = collectUnsyncedTasks(weekNode)
    if (unsynced.length === 0) return

    const newTasks = unsynced.map((task) => ({
      id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: task.title,
      assigneeId: task.assigneeId || 1,
      dueDate: task.startDate || new Date().toISOString().split("T")[0],
      priority: "medium" as const,
      status: "todo" as const,
      department: task.department || "Chung",
      bonusAmount: task.bonusAmount || 0,
      roadmapNodeId: task.id,
    }))

    if (setTasks && tasks) {
      setTasks([...tasks, ...newTasks] as Task[])
    }

    const updates: Record<string, Partial<RoadmapNode>> = {}
    unsynced.forEach((t) => { updates[t.id] = { syncedToTasks: true } })
    const newTree = updateNodesInTree(roadmap.tree, updates)
    onUpdate({ ...roadmap, tree: newTree })
    alert(`Đã đồng bộ ${unsynced.length} công việc sang ERP thành công!`)
  }

  /* ── Edit task ──────────────────────────────────────── */

  function handleSaveTaskEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTask) return
    const newTree = updateNodeInTree(roadmap.tree, editingTask.id, () => editingTask)
    onUpdate({ ...roadmap, tree: newTree })
    setEditingTask(null)
  }

  /* ────────────────────────────────────────────────────── */
  /*  LEVEL VIEWS                                          */
  /* ────────────────────────────────────────────────────── */

  /* ── YEAR VIEW ──────────────────────────────────────── */

  function YearView({ node }: { node: RoadmapNode }) {
    const quarters = node.children ?? []
    const hasMonths = quarters.some((q) => (q.children?.length ?? 0) > 0)

    return (
      <div className="space-y-6">
        {/* Header card */}
        <div className="glass-card p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            🏢 {node.title}
          </h1>
          <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-3xl">
            <span className="font-semibold text-foreground">Tầm nhìn:</span> {node.description}
          </p>
          <div className="mt-6">
            <CashflowBar revenue={node.revenue} expense={node.expense} cashflow={node.cashflow} status={node.cashflowStatus} />
          </div>
          {node.kpis?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {node.kpis.map((kpi, i) => (
                <span key={i} className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> {kpi}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quarter cards — 2×2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {quarters.map((q, qi) => (
            <button
              key={q.id}
              onClick={() => navigateTo(q.id)}
              className="glass-card p-5 flex flex-col gap-3 text-left hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Quý {qi + 1}</span>
                <span className="text-sm font-bold text-foreground">{formatVND(q.revenue)}</span>
              </div>
              {q.theme && <p className="text-sm font-bold text-indigo-700 leading-snug">🎯 {q.theme}</p>}
              <StatusPill status={q.cashflowStatus} />
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{q.description}</p>
              {q.kpis?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {q.kpis.slice(0, 3).map((kpi, i) => <KpiPill key={i} text={kpi} />)}
                </div>
              )}
              {(q.milestones?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {q.milestones!.slice(0, 2).map((ms, i) => (
                    <span key={i} className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                      🏁 {ms}
                    </span>
                  ))}
                </div>
              )}
              <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1">
                Xem chi tiết <ChevronRight className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>

        {/* AI Generate */}
        {!hasMonths ? (
          <button
            disabled={isGenerating}
            onClick={handleExpandQuarters}
            className={cn(
              "w-full py-5 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all shadow-lg",
              isGenerating
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl cursor-pointer",
            )}
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> AI đang tạo chi tiết 12 tháng…</>
            ) : (
              <><Sparkles className="w-5 h-5" /> AI Generate chi tiết 12 tháng</>
            )}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3 mt-6 p-6 rounded-2xl border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
              <span className="text-2xl">✨</span> AI đã tạo xong chi tiết 12 tháng!
            </div>
            <p className="text-sm text-emerald-800/80 font-medium">
              Click vào từng thẻ Quý ở trên để xem lịch trình, mục tiêu và phân bổ ngân sách chi tiết từng tháng.
            </p>
            <button
              onClick={handleExpandQuarters}
              disabled={isGenerating}
              className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1.5"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {isGenerating ? "Đang tạo lại..." : "Tạo lại kịch bản 12 tháng"}
            </button>
          </div>
        )}
      </div>
    )
  }

  /* ── QUARTER VIEW ───────────────────────────────────── */

  function QuarterView({ node }: { node: RoadmapNode }) {
    const months = node.children ?? []
    const hasWeeks = months.some((m) => (m.children?.length ?? 0) > 0)

    return (
      <div className="space-y-6">
        {/* Dashboard header */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            📅 {node.title}
          </h2>
          {node.theme && (
            <p className="text-base font-bold text-indigo-700">🎯 {node.theme}</p>
          )}
          <CashflowBar revenue={node.revenue} expense={node.expense} cashflow={node.cashflow} status={node.cashflowStatus} />

          {/* KPIs */}
          {node.kpis?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {node.kpis.map((kpi, i) => (
                <span key={i} className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> {kpi}
                </span>
              ))}
            </div>
          )}

          {/* Milestones */}
          {(node.milestones?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {node.milestones!.map((ms, i) => (
                <span key={i} className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                  🏁 {ms}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Month cards — 3-col */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {months.map((m) => (
            <button
              key={m.id}
              onClick={() => navigateTo(m.id)}
              className="glass-card p-4 flex flex-col gap-2 text-left hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">{m.title}</span>
                <span className="text-xs font-semibold text-muted-foreground">{formatVND(m.revenue)}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{m.description}</p>
              <StatusPill status={m.cashflowStatus} />
              {m.kpis?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.kpis.slice(0, 2).map((k, i) => <KpiPill key={i} text={k} />)}
                </div>
              )}
              <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1">
                Xem chi tiết <ChevronRight className="w-3 h-3" />
              </span>
            </button>
          ))}
          {months.length === 0 && (
            <div className="col-span-3 text-center text-muted-foreground text-sm py-4">
              Chưa có dữ liệu tháng cho quý này.
            </div>
          )}
        </div>

        {/* AI Generate */}
        {!hasWeeks && months.length > 0 ? (
          <button
            disabled={isGenerating}
            onClick={handleExpandMonths}
            className={cn(
              "w-full py-5 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all shadow-lg",
              isGenerating
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl cursor-pointer",
            )}
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> AI đang tạo tuần & công việc…</>
            ) : (
              <><Sparkles className="w-5 h-5" /> AI Generate tuần & công việc</>
            )}
          </button>
        ) : hasWeeks && months.length > 0 ? (
          <div className="flex flex-col items-center gap-3 mt-6 p-6 rounded-2xl border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
              <span className="text-2xl">✨</span> AI đã tạo xong lịch làm việc chi tiết!
            </div>
            <p className="text-sm text-emerald-800/80 font-medium">
              Click vào từng thẻ Tháng ở trên để xem lịch làm việc theo tuần và giao việc cụ thể cho nhân sự.
            </p>
            <button
              onClick={handleExpandMonths}
              disabled={isGenerating}
              className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1.5"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {isGenerating ? "Đang tạo lại..." : "Tạo lại kịch bản tuần & công việc"}
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  /* ── TASK CARD COMPONENT ────────────────────────────── */

  function TaskCard({ task }: { task: RoadmapNode }) {
    const assigneeName = task.assigneeName || "Chưa gán"

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => {
          e.stopPropagation()
          setEditingTask(task)
        }}
        className="group relative p-3 rounded-xl border bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left cursor-pointer flex flex-col gap-2"
      >
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
        </div>

        <p className="text-sm font-bold text-foreground line-clamp-2 pr-5">{task.title}</p>

        {task.personalKPI && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.personalKPI}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
            {assigneeName.charAt(0)}
          </div>
          <span className="text-xs font-semibold text-foreground truncate">
            {assigneeName}
          </span>
          {task.department && (
            <span className="text-[10px] text-muted-foreground truncate border rounded px-1.5 py-0.5 bg-muted/20 ml-auto shrink-0 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />
              {task.department}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          {task.bonusAmount ? (
            <span className="text-xs font-bold text-emerald-600">
              +{formatVND(task.bonusAmount, "full")}
            </span>
          ) : <span />}
          {task.startDate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" />
              {new Date(task.startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
        </div>

        {task.syncedToTasks && (
          <div className="mt-1 text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 w-max px-2 py-1 rounded-md">
            ✓ Đã đồng bộ
          </div>
        )}
      </motion.div>
    )
  }

  /* ── MONTH VIEW ─────────────────────────────────────── */

  function MonthView({ node }: { node: RoadmapNode }) {
    const weeks = node.children ?? []

    return (
      <div className="space-y-6">
        {/* Dashboard header */}
        <div className="glass-card p-6 space-y-3">
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            📆 {node.title}
          </h2>
          <p className="text-sm text-muted-foreground">{node.description}</p>
          <CashflowBar revenue={node.revenue} expense={node.expense} cashflow={node.cashflow} status={node.cashflowStatus} />
          {node.kpis?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {node.kpis.map((kpi, i) => <KpiPill key={i} text={kpi} />)}
            </div>
          )}
        </div>

        {/* Trello Kanban Board for Weeks */}
        {weeks.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            Chưa có dữ liệu tuần cho tháng này.
          </div>
        ) : (
          <div className="flex overflow-x-auto custom-scrollbar gap-4 pb-4 items-start">
            {weeks.map((w, wi) => {
              // Flatten all tasks for this week
              const tasks = (w.children ?? []).flatMap((day) => day.children ?? [])

              return (
                <div key={w.id} className="min-w-[320px] w-[320px] shrink-0 bg-muted/30 rounded-2xl flex flex-col max-h-[70vh]">
                  {/* Column Header */}
                  <div className="p-4 border-b border-border/50 bg-white/50 rounded-t-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-bold text-foreground">Tuần {wi + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                          {countTasks(w)} việc
                        </span>
                        {w.startDate && w.endDate && (
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {new Date(w.startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                            {" – "}
                            {new Date(w.endDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{w.title}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-emerald-600">+{formatVND(w.revenue)}</span>
                      <span className="font-semibold text-red-500">−{formatVND(w.expense)}</span>
                    </div>
                  </div>

                  {/* Task Cards */}
                  <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    {tasks.length > 0 ? (
                      tasks.map((task) => <TaskCard key={task.id} task={task} />)
                    ) : (
                      <div className="text-center text-xs text-muted-foreground py-4">Chưa có công việc</div>
                    )}
                  </div>

                  {/* Column Footer */}
                  <div className="p-3 pt-0">
                    <button
                      onClick={() => navigateTo(w.id)}
                      className="w-full py-2 bg-white rounded-xl text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors shadow-sm border cursor-pointer"
                    >
                      Xem chi tiết tuần →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ── WEEK VIEW — Full Company Kanban ────────────────── */

  function WeekView({ node }: { node: RoadmapNode }) {
    const days = (node.children ?? []).slice(0, 5)
    const dayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"]
    const unsynced = collectUnsyncedTasks(node)

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="glass-card p-5 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              📋 {node.title}
            </h2>
            {node.startDate && node.endDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(node.startDate).toLocaleDateString("vi-VN")} – {new Date(node.endDate).toLocaleDateString("vi-VN")}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="font-semibold text-emerald-600">Doanh thu: {formatVND(node.revenue)}</span>
              <span className="font-semibold text-red-500">Chi phí: {formatVND(node.expense)}</span>
            </div>
          </div>
          <button
            onClick={() => handlePushToERP(node)}
            disabled={unsynced.length === 0}
            className={cn(
              "px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md",
              unsynced.length > 0
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-70",
            )}
          >
            <Send className="w-4 h-4" />
            Đồng bộ Thực thi ({unsynced.length})
          </button>
        </div>

        {/* Kanban table */}
        {days.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu ngày cho tuần này.
          </div>
        ) : (
          <div className="flex overflow-x-auto custom-scrollbar gap-4 pb-4 items-start">
            {days.map((d, di) => {
              const tasks = d.children ?? []

              return (
                <div key={d.id} className="min-w-[300px] w-[300px] shrink-0 bg-muted/30 rounded-2xl flex flex-col max-h-[75vh]">
                  {/* Column Header */}
                  <div className="p-3 border-b border-border/50 bg-white/50 rounded-t-2xl text-center">
                    <span className="text-sm font-bold text-foreground">{dayLabels[di] ?? d.title}</span>
                    {d.startDate && (
                      <span className="block text-[11px] font-medium text-muted-foreground mt-0.5">
                        {new Date(d.startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {/* Task Cards */}
                  <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    {tasks.length > 0 ? (
                      tasks.map((task) => <TaskCard key={task.id} task={task} />)
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-6">
                        <span className="text-xs text-muted-foreground/60">—</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ── Level Router ───────────────────────────────────── */

  function renderLevel(node: RoadmapNode) {
    switch (node.level) {
      case "year":
        return <YearView node={node} />
      case "quarter":
        return <QuarterView node={node} />
      case "month":
        return <MonthView node={node} />
      case "week":
        return <WeekView node={node} />
      default:
        return <YearView node={node} />
    }
  }

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Loading overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="glass-card p-8 flex flex-col items-center gap-4 shadow-2xl">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-base font-bold text-foreground">AI đang tạo…</p>
              <p className="text-sm text-muted-foreground">Vui lòng chờ trong giây lát</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb navigation */}
      <Breadcrumb />

      {/* Active view */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          {renderLevel(currentNode)}
        </motion.div>
      </AnimatePresence>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold text-foreground">Chỉnh sửa công việc</h3>
                <button onClick={() => setEditingTask(null)} className="p-2 hover:bg-muted rounded-full cursor-pointer transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <form onSubmit={handleSaveTaskEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Tên công việc</label>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Nhân sự phụ trách</label>
                  <select
                    value={editingTask.assigneeId || ""}
                    onChange={(e) => {
                      const empId = Number(e.target.value)
                      const emp = employees?.find((em) => em.id === empId)
                      setEditingTask({
                        ...editingTask,
                        assigneeId: empId,
                        assigneeName: emp ? emp.name : editingTask.assigneeName,
                        department: emp ? emp.department : editingTask.department,
                      })
                    }}
                    className="w-full px-4 py-2 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm cursor-pointer"
                  >
                    <option value="">-- Chọn nhân sự --</option>
                    {employees?.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Thưởng KPI (VNĐ)</label>
                  <input
                    type="number"
                    value={editingTask.bonusAmount || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, bonusAmount: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">KPI Cá nhân</label>
                  <input
                    type="text"
                    value={editingTask.personalKPI || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, personalKPI: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    placeholder="VD: Viết xong 5 bài chuẩn SEO"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-5 py-2.5 rounded-xl font-semibold hover:bg-muted text-muted-foreground transition-colors cursor-pointer text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer text-sm"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
