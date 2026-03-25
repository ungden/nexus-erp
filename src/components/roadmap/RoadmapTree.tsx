"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RoadmapNode, Roadmap } from "@/lib/roadmap-types"
import { CashflowBar } from "./CashflowBar"
import { formatVND } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAppContext, Task, Employee } from "@/context/AppContext"
import {
  ChevronRight, ChevronDown, Calendar, Target, Users,
  Send, Edit2, X, ArrowRight, Building2, UserCheck, AlertCircle,
  BarChart3, Filter, RefreshCw, Sparkles, Loader2,
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

/* ── Assignee / Department Summary Helpers ───────────── */

interface AssigneeSummary {
  id: number | undefined
  name: string
  department: string
  taskCount: number
}

interface DepartmentSummary {
  name: string
  taskCount: number
  assigneeCount: number
}

interface TreeStats {
  totalTasks: number
  assignees: AssigneeSummary[]
  departments: DepartmentSummary[]
  unassignedCount: number
  uniqueAssigneeCount: number
  uniqueDepartmentCount: number
}

function collectTreeStats(node: RoadmapNode): TreeStats {
  const taskNodes: RoadmapNode[] = []

  function gather(n: RoadmapNode) {
    if (n.level === "task") {
      taskNodes.push(n)
    } else {
      for (const c of n.children ?? []) gather(c)
    }
  }
  gather(node)

  const assigneeMap = new Map<string, AssigneeSummary>()
  const deptMap = new Map<string, { taskCount: number; assigneeIds: Set<string> }>()
  let unassignedCount = 0

  for (const t of taskNodes) {
    const key = t.assigneeId != null ? String(t.assigneeId) : "__unassigned__"
    const name = t.assigneeName || "Chưa gán"
    const dept = t.department || "Chưa phân bổ"

    if (t.assigneeId == null && !t.assigneeName) {
      unassignedCount++
    }

    if (!assigneeMap.has(key)) {
      assigneeMap.set(key, { id: t.assigneeId, name, department: dept, taskCount: 0 })
    }
    assigneeMap.get(key)!.taskCount++

    if (!deptMap.has(dept)) {
      deptMap.set(dept, { taskCount: 0, assigneeIds: new Set() })
    }
    deptMap.get(dept)!.taskCount++
    deptMap.get(dept)!.assigneeIds.add(key)
  }

  const assignees = Array.from(assigneeMap.values()).sort((a, b) => b.taskCount - a.taskCount)
  const departments: DepartmentSummary[] = Array.from(deptMap.entries())
    .map(([name, d]) => ({ name, taskCount: d.taskCount, assigneeCount: d.assigneeIds.size }))
    .sort((a, b) => b.taskCount - a.taskCount)

  return {
    totalTasks: taskNodes.length,
    assignees,
    departments,
    unassignedCount,
    uniqueAssigneeCount: assigneeMap.size - (unassignedCount > 0 ? 1 : 0),
    uniqueDepartmentCount: deptMap.size,
  }
}

function countChildMonths(node: RoadmapNode): number {
  if (node.level === "month") return 1
  return (node.children ?? []).reduce((s, c) => s + countChildMonths(c), 0)
}

function countChildWeeks(node: RoadmapNode): number {
  if (node.level === "week") return 1
  return (node.children ?? []).reduce((s, c) => s + countChildWeeks(c), 0)
}

/* ── Summary Bar (reused at every level) ─────────────── */

function SummaryBar({ stats }: { stats: TreeStats }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="flex items-center gap-1.5 font-semibold text-foreground bg-primary/10 px-3 py-1 rounded-full">
        <Target className="w-3.5 h-3.5 text-primary" />
        {stats.totalTasks} c&ocirc;ng việc
      </span>
      <span className="flex items-center gap-1.5 font-semibold text-foreground bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
        <Users className="w-3.5 h-3.5 text-blue-600" />
        {stats.uniqueAssigneeCount} nh&acirc;n sự
      </span>
      <span className="flex items-center gap-1.5 font-semibold text-foreground bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
        <Building2 className="w-3.5 h-3.5 text-violet-600" />
        {stats.uniqueDepartmentCount} ph&ograve;ng ban
      </span>
      {stats.unassignedCount > 0 && (
        <span className="flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5" />
          {stats.unassignedCount} chưa g&aacute;n
        </span>
      )}
    </div>
  )
}

/* ── Assignee Summary Panel ──────────────────────────── */

function AssigneeSummaryPanel({ stats, maxTasks }: { stats: TreeStats; maxTasks?: number }) {
  const max = maxTasks ?? Math.max(...stats.assignees.map((a) => a.taskCount), 1)

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-blue-600" />
        Ph&acirc;n c&ocirc;ng nh&acirc;n sự
      </h3>
      {stats.assignees.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa c&oacute; c&ocirc;ng việc n&agrave;o.</p>
      ) : (
        <div className="space-y-2.5">
          {stats.assignees.map((a, i) => {
            const pct = Math.round((a.taskCount / max) * 100)
            const isUnassigned = a.name === "Chưa gán"
            return (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    isUnassigned ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700",
                  )}
                >
                  {a.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-foreground truncate">{a.name}</span>
                    <span className="text-xs font-bold text-muted-foreground shrink-0 ml-2">{a.taskCount}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", isUnassigned ? "bg-amber-400" : "bg-blue-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Department Summary Panel ────────────────────────── */

function DepartmentSummaryPanel({ stats }: { stats: TreeStats }) {
  const max = Math.max(...stats.departments.map((d) => d.taskCount), 1)

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Building2 className="w-4 h-4 text-violet-600" />
        Ph&acirc;n bổ theo ph&ograve;ng ban
      </h3>
      {stats.departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa c&oacute; dữ liệu.</p>
      ) : (
        <div className="space-y-2.5">
          {stats.departments.map((d, i) => {
            const pct = Math.round((d.taskCount / max) * 100)
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-foreground">{d.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.taskCount} việc &middot; {d.assigneeCount} người
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Drill-down Button ───────────────────────────────── */

function DrillDownButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2.5 bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-primary/20 hover:border-primary shadow-sm hover:shadow-md"
    >
      {label || "Xem chi tiết"}
      <ArrowRight className="w-4 h-4" />
    </button>
  )
}

/* ── Main Component ──────────────────────────────────── */

export function RoadmapTree({ roadmap, onUpdate }: Props) {
  const { employees, tasks, setTasks, setEmployees, kpis, setKpis } = useAppContext()
  const tree = roadmap.tree

  /* Navigation stack — last item is the "active" node ID */
  const [navStack, setNavStack] = useState<string[]>([tree.id])
  const [editingTask, setEditingTask] = useState<RoadmapNode | null>(null)
  const [weekViewMode, setWeekViewMode] = useState<"day" | "assignee">("day")
  const [monthGroupBy, setMonthGroupBy] = useState<"none" | "department" | "assignee">("none")
  const [drillThinking, setDrillThinking] = useState("")

  /* Sync navStack when tree root ID changes (e.g. after generation or roadmap switch) */
  const treeRootId = tree.id
  const currentNavRoot = navStack[0]
  if (currentNavRoot !== treeRootId) {
    setNavStack([treeRootId])
  }

  /* Derived: current node from the live tree */
  const activeId = navStack[navStack.length - 1]
  const currentNode = useMemo(() => findNode(tree, activeId) ?? tree, [tree, activeId])

  /* ── Drill-down helpers ─────────────────────────────── */

  function getTargetLevel(level: string): 'month' | 'week' | 'day' | null {
    switch (level) {
      case 'quarter': return 'month';
      case 'month': return 'week';
      case 'week': return 'day';
      default: return null;
    }
  }

  async function drillDown(parentNode: RoadmapNode, targetLevel: 'month' | 'week' | 'day') {
    // 1. Set loading state on parent node
    const loadingTree = updateNodeInTree(roadmap.tree, parentNode.id, (n) => ({
      ...n, isLoading: true
    }));
    onUpdate({ ...roadmap, tree: loadingTree });
    setDrillThinking("");

    try {
      // 2. Build request
      const body: Record<string, unknown> = {
        profile: roadmap.company,
        board: roadmap.board,
        parentNode,
        targetLevel,
      };

      // Include employees for day-level expansion (task assignment)
      if (targetLevel === 'day' && employees && employees.length > 0) {
        body.employees = employees.map(e => ({
          id: e.id, name: e.name, department: e.department,
          role: e.role, baseSalary: e.baseSalary
        }));
      }

      const res = await fetch('/api/roadmap/drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('API failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = "";
      let resultChildren: RoadmapNode[] | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'drill-thinking') {
              setDrillThinking(event.text);
            } else if (event.type === 'drill-result') {
              resultChildren = event.children;
            } else if (event.type === 'drill-error') {
              throw new Error(event.message);
            }
          } catch { /* skip malformed */ }
        }
      }

      if (resultChildren && resultChildren.length > 0) {
        const expandedTree = updateNodeInTree(roadmap.tree, parentNode.id, (n) => ({
          ...n, children: resultChildren, isExpanded: true, isLoading: false
        }));
        onUpdate({ ...roadmap, tree: expandedTree });
      } else {
        throw new Error('No children generated');
      }
    } catch (err) {
      console.error('Drill-down failed:', err);
      // Clear loading state
      const clearedTree = updateNodeInTree(roadmap.tree, parentNode.id, (n) => ({
        ...n, isLoading: false
      }));
      onUpdate({ ...roadmap, tree: clearedTree });
    } finally {
      setDrillThinking("");
    }
  }

  /* ── Navigation ─────────────────────────────────────── */

  function navigateTo(nodeId: string) {
    const targetNode = findNode(tree, nodeId);
    if (!targetNode) return;

    // If node has no children and is expandable, trigger AI drill-down
    if (!targetNode.children && !targetNode.isLoading && targetNode.level !== 'task') {
      const targetLevel = getTargetLevel(targetNode.level);
      if (targetLevel) {
        drillDown(targetNode, targetLevel);
      }
    }

    setNavStack((prev) => [...prev, nodeId]);
  }

  function navigateToIndex(idx: number) {
    setNavStack((prev) => prev.slice(0, idx + 1))
  }

  /* ── Breadcrumb ─────────────────────────────────────── */

  function Breadcrumb() {
    const crumbs = navStack.map((id) => findNode(tree, id))
    return (
      <nav className="flex items-center gap-1 text-sm flex-wrap bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-border/50 shadow-sm">
        {crumbs.map((node, idx) => {
          if (!node) return null
          const isLast = idx === crumbs.length - 1
          return (
            <span key={node.id} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              {isLast ? (
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  {node.level === "year" && "🏢"}
                  {node.level === "quarter" && "📅"}
                  {node.level === "month" && "📆"}
                  {node.level === "week" && "📋"}
                  {node.title}
                </span>
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

  /* ── HR Auto-sync Helper ────────────────────────────── */

  function ensureEmployeesSynced(): typeof employees {
    if (employees && employees.length > 0) return employees;
    if (!setEmployees) return employees;

    const hrPlan = roadmap.board.hr;
    if (!hrPlan || !hrPlan.departments) return employees;

    let newId = Date.now();
    const newEmployees: Employee[] = [];

    hrPlan.departments.forEach((dept) => {
      for (let i = 0; i < dept.headcount; i++) {
        const role = dept.keyRoles[i] || dept.keyRoles[0] || 'Nhân sự';
        newEmployees.push({
          id: newId++,
          name: `${role} (Tuyển mới)`,
          role: role,
          department: dept.name,
          email: '',
          phone: '',
          status: 'Đang làm việc',
          joinDate: new Date().toISOString().split('T')[0],
          baseSalary: dept.avgSalary,
          managerId: null
        });
      }
    });

    setEmployees(newEmployees);
    return newEmployees;
  }

  /* ── Sync to ERP ────────────────────────────────────── */

  function handlePushKpisToERP() {
    const sKpis = roadmap.board.ceo.structuredKpis
    if (!sKpis || !setKpis || !kpis) return

    const newKpis = sKpis.filter(sk => !kpis.some(k => k.id === sk.id)).map(sk => ({
      id: sk.id,
      title: sk.title,
      target: sk.target,
      current: 0,
      progress: 0,
      status: "on-track" as const,
      department: "Chung"
    }))

    if (newKpis.length > 0) {
      setKpis([...kpis, ...newKpis])
      alert(`Đã đồng bộ ${newKpis.length} KPIs sang ERP!`)
    } else {
      alert("Tất cả KPIs đã được đồng bộ từ trước.")
    }
  }

  function collectUnsyncedTasks(node: RoadmapNode): RoadmapNode[] {
    if (node.level === "task" && !node.syncedToTasks) return [node]
    return (node.children ?? []).flatMap((c) => collectUnsyncedTasks(c))
  }

  function handlePushToERP(weekNode: RoadmapNode) {
    const unsynced = collectUnsyncedTasks(weekNode)
    if (unsynced.length === 0) return

    const activeEmps = ensureEmployeesSynced()
    const fallbackEmpId = activeEmps && activeEmps.length > 0 ? activeEmps[0].id : 1

    const newTasks = unsynced.map((task) => ({
      id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: task.title,
      assigneeId: task.assigneeId || fallbackEmpId,
      dueDate: task.startDate || new Date().toISOString().split("T")[0],
      priority: "medium" as const,
      status: "todo" as const,
      department: task.department || "Chung",
      bonusAmount: task.bonusAmount || 0,
      roadmapNodeId: task.id,
      linkedKpiId: task.linkedKpiId,
      kpiContribution: task.kpiContribution,
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

  /* ── Drill Loading View ─────────────────────────────── */

  function DrillLoadingView({ node }: { node: RoadmapNode }) {
    const levelLabel = node.level === 'quarter' ? 'tháng' : node.level === 'month' ? 'tuần' : 'ngày & công việc';
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <Sparkles className="w-5 h-5 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-bold text-foreground">
              AI đang phân tích chi tiết {levelLabel}...
            </h3>
            <p className="text-sm text-muted-foreground">
              Gemini đang suy nghĩ để tạo kế hoạch {levelLabel} chi tiết,
              phù hợp với chiến lược và ngân sách của bạn.
            </p>
          </div>
          {drillThinking && (
            <div className="w-full max-w-lg rounded-xl bg-muted/30 border border-border p-4">
              <p className="text-xs text-muted-foreground italic line-clamp-4 leading-relaxed">
                💭 {drillThinking}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Regenerate Button ─────────────────────────────── */

  function RegenerateButton({ node }: { node: RoadmapNode }) {
    const targetLevel = getTargetLevel(node.level);
    if (!targetLevel || !node.children) return null;

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          // Clear children and re-drill
          const clearedTree = updateNodeInTree(roadmap.tree, node.id, (n) => ({
            ...n, children: undefined, isExpanded: false
          }));
          onUpdate({ ...roadmap, tree: clearedTree });
          drillDown(node, targetLevel);
        }}
        disabled={!!node.isLoading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all disabled:opacity-50"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", node.isLoading && "animate-spin")} />
        Tạo lại với AI
      </button>
    );
  }

  /* ────────────────────────────────────────────────────── */
  /*  LEVEL VIEWS                                          */
  /* ────────────────────────────────────────────────────── */

  /* ── YEAR VIEW ──────────────────────────────────────── */

  function YearView({ node }: { node: RoadmapNode }) {
    const quarters = node.children ?? []
    const yearStats = useMemo(() => collectTreeStats(node), [node])

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
          <div className="mt-4">
            <SummaryBar stats={yearStats} />
          </div>
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
          {roadmap.board.ceo.structuredKpis && roadmap.board.ceo.structuredKpis.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => handlePushKpisToERP()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Đồng bộ {roadmap.board.ceo.structuredKpis.length} KPIs chiến lược sang ERP
              </button>
            </div>
          )}
        </div>

        {/* Quarter cards — 2x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {quarters.map((q, qi) => {
            const qStats = collectTreeStats(q)
            const monthCount = countChildMonths(q)
            const weekCount = countChildWeeks(q)

            return (
              <div
                key={q.id}
                className="glass-card p-0 flex flex-col text-left hover:ring-2 hover:ring-primary/40 transition-all group overflow-hidden"
              >
                {/* Card content area (clickable) */}
                <button
                  onClick={() => navigateTo(q.id)}
                  className="p-5 flex flex-col gap-3 text-left cursor-pointer flex-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Quý {qi + 1}</span>
                    <StatusPill status={q.cashflowStatus} />
                  </div>

                  {q.theme && <p className="text-sm font-bold text-indigo-700 leading-snug">🎯 {q.theme}</p>}

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{q.description}</p>

                  {/* Summary stats row */}
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{monthCount} tháng</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{weekCount} tuần</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{qStats.totalTasks} công việc</span>
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">{qStats.uniqueAssigneeCount} nhân sự</span>
                  </div>

                  {/* Financial */}
                  <div className="flex items-center gap-4 text-xs mt-1">
                    <span className="font-bold text-emerald-600">+{formatVND(q.revenue)}</span>
                    <span className="font-bold text-red-500">-{formatVND(q.expense)}</span>
                  </div>

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
                </button>

                {/* Prominent drill-down button */}
                <div className="px-5 pb-4">
                  <DrillDownButton onClick={() => navigateTo(q.id)} label="Xem chi tiết quý" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ── QUARTER VIEW ───────────────────────────────────── */

  function QuarterView({ node }: { node: RoadmapNode }) {
    const months = node.children ?? []
    const quarterStats = useMemo(() => collectTreeStats(node), [node])

    return (
      <div className="space-y-6">
        {/* Dashboard header */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">📅 {node.title}</h2>
              {node.theme && <p className="text-base font-bold text-indigo-700 mt-1">🎯 {node.theme}</p>}
            </div>
            <RegenerateButton node={node} />
          </div>

          {/* Summary bar */}
          <SummaryBar stats={quarterStats} />

          {/* Financial summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Doanh thu</p>
              <p className="text-lg font-bold text-emerald-800">{formatVND(node.revenue)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-200">
              <p className="text-[10px] font-bold text-red-600 uppercase">Chi phí</p>
              <p className="text-lg font-bold text-red-800">{formatVND(node.expense)}</p>
            </div>
            <div className={cn("rounded-xl p-3 border", node.cashflow >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200")}>
              <p className="text-[10px] font-bold uppercase" style={{ color: node.cashflow >= 0 ? '#2563eb' : '#dc2626' }}>Dòng tiền</p>
              <p className="text-lg font-bold" style={{ color: node.cashflow >= 0 ? '#1e40af' : '#991b1b' }}>{node.cashflow >= 0 ? '+' : ''}{formatVND(node.cashflow)}</p>
            </div>
          </div>

          {/* KPIs & Milestones */}
          <div className="flex flex-wrap gap-2">
            {node.kpis?.map((kpi, i) => (
              <span key={i} className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 flex items-center gap-1.5">
                <Target className="w-3 h-3" /> {kpi}
              </span>
            ))}
            {node.milestones?.map((ms, i) => (
              <span key={`ms-${i}`} className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">🏁 {ms}</span>
            ))}
          </div>
        </div>

        {/* Assignee & Department summary panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AssigneeSummaryPanel stats={quarterStats} />
          <DepartmentSummaryPanel stats={quarterStats} />
        </div>

        {/* Month cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {months.map((m) => {
            const mStats = collectTreeStats(m)
            const revenueBar = node.revenue > 0 ? Math.round((m.revenue / node.revenue) * 100) : 33
            return (
              <div
                key={m.id}
                className="glass-card p-0 flex flex-col text-left hover:ring-2 hover:ring-primary/40 transition-all group overflow-hidden"
              >
                {/* Revenue bar header */}
                <div className="relative h-2 bg-muted/30">
                  <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-r-full transition-all" style={{ width: `${revenueBar}%` }} />
                </div>

                <button
                  onClick={() => navigateTo(m.id)}
                  className="p-4 flex flex-col gap-2 flex-1 text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-foreground">{m.title}</span>
                    <StatusPill status={m.cashflowStatus} />
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-1">{m.description}</p>

                  {/* Mini financial row */}
                  <div className="flex items-center gap-3 text-xs mt-1">
                    <span className="text-emerald-600 font-semibold">+{formatVND(m.revenue)}</span>
                    <span className="text-red-500 font-semibold">-{formatVND(m.expense)}</span>
                  </div>

                  {/* Stats chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{mStats.totalTasks} công việc</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">{mStats.uniqueAssigneeCount} nhân sự</span>
                  </div>

                  {m.kpis?.slice(0, 1).map((k, i) => <KpiPill key={i} text={k} />)}
                </button>

                {/* Prominent drill-down button */}
                <div className="px-4 pb-3">
                  <DrillDownButton onClick={() => navigateTo(m.id)} label="Xem chi tiết tháng" />
                </div>
              </div>
            )
          })}
          {months.length === 0 && !node.isLoading && (
            <div className="col-span-3 glass-card p-8 text-center space-y-4">
              <Sparkles className="w-8 h-8 text-primary/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu tháng. Click để AI phân tích.</p>
              <button onClick={() => drillDown(node, 'month')} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">
                <Sparkles className="w-4 h-4 inline mr-1" /> Generate với AI
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── TASK CARD COMPONENT ────────────────────────────── */

  function TaskCard({ task }: { task: RoadmapNode }) {
    const assigneeName = task.assigneeName || "Chưa gán"
    const isUnassigned = !task.assigneeName

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

        {/* Prominent assignee row at top */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
              isUnassigned ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-blue-100 text-blue-700 border border-blue-300",
            )}
          >
            {assigneeName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <span className={cn("text-xs font-bold truncate block", isUnassigned ? "text-amber-700" : "text-foreground")}>
              {assigneeName}
            </span>
            {task.department && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Building2 className="w-2.5 h-2.5" /> {task.department}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm font-bold text-foreground line-clamp-2 pr-5">{task.title}</p>

        {task.personalKPI && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.personalKPI}
          </p>
        )}

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
    const monthStats = useMemo(() => collectTreeStats(node), [node])

    /* Gather all tasks in this month for grouping */
    const allMonthTasks = useMemo(() => {
      const result: RoadmapNode[] = []
      function gather(n: RoadmapNode) {
        if (n.level === "task") result.push(n)
        else for (const c of n.children ?? []) gather(c)
      }
      gather(node)
      return result
    }, [node])

    /* Grouped tasks */
    const groupedByDepartment = useMemo(() => {
      const map = new Map<string, RoadmapNode[]>()
      for (const t of allMonthTasks) {
        const key = t.department || "Chưa phân bổ"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      }
      return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
    }, [allMonthTasks])

    const groupedByAssignee = useMemo(() => {
      const map = new Map<string, RoadmapNode[]>()
      for (const t of allMonthTasks) {
        const key = t.assigneeName || "Chưa gán"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      }
      return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
    }, [allMonthTasks])

    return (
      <div className="space-y-6">
        {/* Dashboard header */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
              📆 {node.title}
            </h2>
            <RegenerateButton node={node} />
          </div>
          <p className="text-sm text-muted-foreground">{node.description}</p>
          <SummaryBar stats={monthStats} />
          <CashflowBar revenue={node.revenue} expense={node.expense} cashflow={node.cashflow} status={node.cashflowStatus} />
          {node.kpis?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {node.kpis.map((kpi, i) => <KpiPill key={i} text={kpi} />)}
            </div>
          )}
        </div>

        {/* Assignee & Department summary panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AssigneeSummaryPanel stats={monthStats} />
          <DepartmentSummaryPanel stats={monthStats} />
        </div>

        {/* Filter/Group by toggle */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">Nhóm theo:</span>
          {(["none", "department", "assignee"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMonthGroupBy(mode)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                monthGroupBy === mode
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-muted-foreground border-border hover:border-primary/40",
              )}
            >
              {mode === "none" ? "Tuần (mặc định)" : mode === "department" ? "Phòng ban" : "Nhân sự"}
            </button>
          ))}
        </div>

        {/* Grouped Views */}
        {monthGroupBy === "department" && (
          <div className="flex overflow-x-auto custom-scrollbar gap-4 pb-4 items-start">
            {groupedByDepartment.map(([dept, deptTasks]) => (
              <div key={dept} className="min-w-[320px] w-[320px] shrink-0 bg-muted/30 rounded-2xl flex flex-col max-h-[70vh]">
                <div className="p-4 border-b border-border/50 bg-white/50 rounded-t-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-bold text-foreground flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-violet-600" /> {dept}
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {deptTasks.length} việc
                    </span>
                  </div>
                </div>
                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                  {deptTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {monthGroupBy === "assignee" && (
          <div className="flex overflow-x-auto custom-scrollbar gap-4 pb-4 items-start">
            {groupedByAssignee.map(([name, assigneeTasks]) => (
              <div key={name} className="min-w-[320px] w-[320px] shrink-0 bg-muted/30 rounded-2xl flex flex-col max-h-[70vh]">
                <div className="p-4 border-b border-border/50 bg-white/50 rounded-t-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      name === "Chưa gán" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700",
                    )}>
                      {name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-foreground flex-1 truncate">{name}</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold shrink-0">
                      {assigneeTasks.length} việc
                    </span>
                  </div>
                </div>
                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                  {assigneeTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Default: Trello Kanban Board for Weeks */}
        {monthGroupBy === "none" && (
          <>
            {weeks.length === 0 ? (
              <div className="glass-card p-8 text-center space-y-4">
                <Sparkles className="w-8 h-8 text-primary/40 mx-auto" />
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu tuần cho tháng này.</p>
                {!node.isLoading && (
                  <button onClick={() => drillDown(node, 'week')} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">
                    <Sparkles className="w-4 h-4 inline mr-1" /> Generate với AI
                  </button>
                )}
              </div>
            ) : (
              <div className="flex overflow-x-auto custom-scrollbar gap-4 pb-4 items-start">
                {weeks.map((w, wi) => {
                  const weekTasks = (w.children ?? []).flatMap((day) => day.children ?? [])
                  const dateRange = w.startDate && w.endDate
                    ? `${new Date(w.startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} – ${new Date(w.endDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`
                    : null

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
                          </div>
                        </div>
                        {dateRange && (
                          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {dateRange}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{w.title}</p>
                        <div className="flex items-center gap-3 text-xs mt-1.5">
                          <span className="font-semibold text-emerald-600">+{formatVND(w.revenue)}</span>
                          <span className="font-semibold text-red-500">-{formatVND(w.expense)}</span>
                        </div>
                      </div>

                      {/* Task Cards */}
                      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                        {weekTasks.length > 0 ? (
                          weekTasks.map((task) => <TaskCard key={task.id} task={task} />)
                        ) : (
                          <div className="text-center text-xs text-muted-foreground py-4">Chưa có công việc</div>
                        )}
                      </div>

                      {/* Column Footer */}
                      <div className="p-3 pt-0">
                        <DrillDownButton onClick={() => navigateTo(w.id)} label="Xem chi tiết tuần" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  /* ── WEEK VIEW — Full Company Kanban ────────────────── */

  function WeekView({ node }: { node: RoadmapNode }) {
    const days = (node.children ?? []).slice(0, 5)
    const dayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"]
    const unsynced = collectUnsyncedTasks(node)
    const weekStats = useMemo(() => collectTreeStats(node), [node])

    /* All tasks for assignee view */
    const allWeekTasks = useMemo(() => {
      const result: RoadmapNode[] = []
      function gather(n: RoadmapNode) {
        if (n.level === "task") result.push(n)
        else for (const c of n.children ?? []) gather(c)
      }
      gather(node)
      return result
    }, [node])

    const groupedByAssignee = useMemo(() => {
      const map = new Map<string, RoadmapNode[]>()
      for (const t of allWeekTasks) {
        const key = t.assigneeName || "Chưa gán"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      }
      return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
    }, [allWeekTasks])

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                📋 {node.title}
              </h2>
              {node.startDate && node.endDate && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(node.startDate).toLocaleDateString("vi-VN")} – {new Date(node.endDate).toLocaleDateString("vi-VN")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <RegenerateButton node={node} />
            {/* Prominent sync button */}
            <button
              onClick={() => handlePushToERP(node)}
              disabled={unsynced.length === 0}
              className={cn(
                "px-6 py-3 rounded-xl font-bold flex items-center gap-2.5 transition-all text-base",
                unsynced.length > 0
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:-translate-y-0.5 cursor-pointer shadow-md ring-2 ring-emerald-200"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-70",
              )}
            >
              <Send className="w-5 h-5" />
              Đồng bộ Thực thi ({unsynced.length})
            </button>
            </div>
          </div>

          {/* Summary bar */}
          <SummaryBar stats={weekStats} />

          {/* Financial row */}
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-emerald-600">Doanh thu: {formatVND(node.revenue)}</span>
            <span className="font-semibold text-red-500">Chi phí: {formatVND(node.expense)}</span>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">Chế độ xem:</span>
          <button
            onClick={() => setWeekViewMode("day")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer",
              weekViewMode === "day"
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-muted-foreground border-border hover:border-primary/40",
            )}
          >
            Theo ngày
          </button>
          <button
            onClick={() => setWeekViewMode("assignee")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer",
              weekViewMode === "assignee"
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-muted-foreground border-border hover:border-primary/40",
            )}
          >
            Theo nhân sự
          </button>
        </div>

        {/* Assignee view */}
        {weekViewMode === "assignee" && (
          <div className="flex overflow-x-auto custom-scrollbar gap-4 pb-4 items-start">
            {groupedByAssignee.map(([name, assigneeTasks]) => (
              <div key={name} className="min-w-[300px] w-[300px] shrink-0 bg-muted/30 rounded-2xl flex flex-col max-h-[75vh]">
                <div className="p-3 border-b border-border/50 bg-white/50 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      name === "Chưa gán" ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-blue-100 text-blue-700 border border-blue-300",
                    )}>
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-foreground truncate block">{name}</span>
                      <span className="text-[10px] text-muted-foreground">{assigneeTasks.length} công việc</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                  {assigneeTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            ))}
            {groupedByAssignee.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8 w-full">Chưa có công việc nào trong tuần.</div>
            )}
          </div>
        )}

        {/* Day view (default kanban) */}
        {weekViewMode === "day" && (
          <>
            {days.length === 0 ? (
              <div className="glass-card p-8 text-center space-y-4">
                <Sparkles className="w-8 h-8 text-primary/40 mx-auto" />
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu ngày cho tuần này.</p>
                {!node.isLoading && (
                  <button onClick={() => drillDown(node, 'day')} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">
                    <Sparkles className="w-4 h-4 inline mr-1" /> Generate với AI
                  </button>
                )}
              </div>
            ) : (
              <div className="flex overflow-x-auto custom-scrollbar gap-4 pb-4 items-start">
                {days.map((d, di) => {
                  const dayTasks = d.children ?? []

                  return (
                    <div key={d.id} className="min-w-[300px] w-[300px] shrink-0 bg-muted/30 rounded-2xl flex flex-col max-h-[75vh]">
                      {/* Column Header */}
                      <div className="p-3 border-b border-border/50 bg-white/50 rounded-t-2xl">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">{dayLabels[di] ?? d.title}</span>
                          {d.startDate && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {new Date(d.startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                          <span className="text-emerald-600 font-semibold">+{formatVND(d.revenue)}</span>
                          <span className="text-red-500 font-semibold">-{formatVND(d.expense)}</span>
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold ml-auto">{dayTasks.length}</span>
                        </div>
                      </div>

                      {/* Task Cards */}
                      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                        {dayTasks.length > 0 ? (
                          dayTasks.map((task) => <TaskCard key={task.id} task={task} />)
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
          </>
        )}
      </div>
    )
  }

  /* ── Level Router ───────────────────────────────────── */

  function renderLevel(node: RoadmapNode) {
    // Show loading view when AI is generating children
    if (node.isLoading) {
      return <DrillLoadingView node={node} />;
    }

    // Show loading view when navigated to a node with no children yet
    if (!node.children && node.level !== 'year' && node.level !== 'task') {
      return <DrillLoadingView node={node} />;
    }

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
