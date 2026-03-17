"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RoadmapNode, Roadmap } from "@/lib/roadmap-types"
import { CashflowBar } from "./CashflowBar"
import { formatVND } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAppContext } from "@/context/AppContext"
import {
  Sparkles, ArrowLeft, ChevronDown, ChevronRight,
  Calendar, Target, Users, Loader2, RefreshCw,
} from "lucide-react"

interface Props {
  roadmap: Roadmap
  onUpdate: (roadmap: Roadmap) => void
}

type ViewLevel = "year" | "months" | "weeks"

/* ── Helpers ────────────────────────────────────────────── */

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  healthy: { label: "Khoẻ", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  warning: { label: "Lưu ý", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  danger:  { label: "Nguy hiểm", cls: "bg-red-100 text-red-700 border-red-200" },
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

/* ── Main Component ─────────────────────────────────────── */

export function RoadmapTree({ roadmap, onUpdate }: Props) {
  const { employees } = useAppContext()
  const tree = roadmap.tree

  const [viewLevel, setViewLevel] = useState<ViewLevel>("year")
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(0)

  const quarters = tree.children ?? []
  const hasMonths = quarters.some(q => q.children && q.children.length > 0)
  const hasWeeks = quarters.some(q => q.children?.some(m => m.children && m.children.length > 0))

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
        onUpdate({ ...roadmap, tree: data.tree })
        setViewLevel("months")
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
        onUpdate({ ...roadmap, tree: data.tree })
        setViewLevel("weeks")
      }
    } catch (e) {
      console.error("Batch expand months failed", e)
    } finally {
      setIsGenerating(false)
    }
  }

  /* ── VIEW 1: Year Overview ──────────────────────────── */

  function YearView() {
    return (
      <motion.div
        key="year"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="glass-card p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            🏢 {tree.title}
          </h1>
          <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-3xl">
            <span className="font-semibold text-foreground">Tầm nhìn:</span> {tree.description}
          </p>

          {/* Overall Cashflow */}
          <div className="mt-6">
            <CashflowBar revenue={tree.revenue} expense={tree.expense} cashflow={tree.cashflow} status={tree.cashflowStatus} />
          </div>

          {/* KPI Tags */}
          {tree.kpis?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tree.kpis.map((kpi, i) => (
                <span key={i} className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> {kpi}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quarter Cards — 2×2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {quarters.map((q, qi) => (
            <div key={q.id} className="glass-card p-5 flex flex-col gap-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Quý {qi + 1}
                </span>
                <span className="text-sm font-bold text-foreground">{formatVND(q.revenue)}</span>
              </div>

              {/* Theme */}
              {q.theme && (
                <p className="text-sm font-bold text-indigo-700 leading-snug">🎯 {q.theme}</p>
              )}

              {/* Status */}
              <StatusPill status={q.cashflowStatus} />

              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{q.description}</p>

              {/* KPIs */}
              {q.kpis?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {q.kpis.slice(0, 3).map((kpi, i) => <KpiPill key={i} text={kpi} />)}
                </div>
              )}

              {/* Milestones */}
              {(q.milestones?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {q.milestones!.slice(0, 2).map((ms, i) => (
                    <span key={i} className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                      🏁 {ms}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* AI Generate Button */}
        {hasMonths ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setViewLevel("months")}
              className="flex-1 py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all shadow-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl cursor-pointer"
            >
              Xem chi tiết 12 tháng
            </button>
            <button
              disabled={isGenerating}
              onClick={handleExpandQuarters}
              className={cn(
                "sm:w-auto px-6 py-4 rounded-2xl font-bold text-indigo-700 text-base flex items-center justify-center gap-2 transition-all border border-indigo-200 bg-white/80 hover:bg-indigo-50 backdrop-blur-sm",
                isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Tạo lại...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" /> Tạo lại với AI
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            disabled={isGenerating}
            onClick={handleExpandQuarters}
            className={cn(
              "w-full py-5 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all shadow-lg",
              isGenerating
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl cursor-pointer"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> AI đang tạo chi tiết 12 tháng…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> AI Generate chi tiết 12 tháng
              </>
            )}
            {!isGenerating && (
              <span className="text-sm font-normal opacity-80 hidden sm:inline ml-1">
                — AI sẽ phân tích từng quý và tạo kế hoạch 12 tháng
              </span>
            )}
          </button>
        )}
      </motion.div>
    )
  }

  /* ── VIEW 2: Monthly Detail ─────────────────────────── */

  function MonthsView() {
    // Re-read quarters from latest tree (may have been updated)
    const qs = roadmap.tree.children ?? []

    return (
      <motion.div
        key="months"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="space-y-6"
      >
        {/* Back button */}
        <button
          onClick={() => setViewLevel("year")}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Kế hoạch Năm
        </button>

        {/* Section header */}
        <div className="glass-card p-6">
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            📅 Chi tiết 12 tháng
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review kế hoạch từng tháng rồi bấm nút để AI tạo lịch tuần và công việc cụ thể.
          </p>
        </div>

        {/* Quarter sections with month cards */}
        {qs.map((q, qi) => {
          const months = q.children ?? []
          return (
            <div key={q.id} className="glass-card p-5 space-y-4">
              {/* Quarter header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  📅 Quý {qi + 1} — <span className="text-indigo-700">{q.theme ?? q.title}</span>
                </h3>
                <div className="flex items-center gap-3">
                  <StatusPill status={q.cashflowStatus} />
                  <span className="text-sm font-bold text-foreground">{formatVND(q.revenue)}</span>
                </div>
              </div>

              {/* 3-col month cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {months.map((m) => (
                  <div key={m.id} className="glass-card p-4 flex flex-col gap-2 border border-border/60">
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
                  </div>
                ))}
                {months.length === 0 && (
                  <div className="col-span-3 text-center text-muted-foreground text-sm py-4">
                    Chưa có dữ liệu tháng cho quý này.
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* AI Generate Button */}
        {hasWeeks ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setViewLevel("weeks")}
              className="flex-1 py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all shadow-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl cursor-pointer"
            >
              Xem lịch tuần & công việc
            </button>
            <button
              disabled={isGenerating}
              onClick={handleExpandMonths}
              className={cn(
                "sm:w-auto px-6 py-4 rounded-2xl font-bold text-indigo-700 text-base flex items-center justify-center gap-2 transition-all border border-indigo-200 bg-white/80 hover:bg-indigo-50 backdrop-blur-sm",
                isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Tạo lại...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" /> Tạo lại với AI
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            disabled={isGenerating}
            onClick={handleExpandMonths}
            className={cn(
              "w-full py-5 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all shadow-lg",
              isGenerating
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl cursor-pointer"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> AI đang tạo lịch tuần & công việc…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> AI Generate lịch tuần & công việc
              </>
            )}
            {!isGenerating && (
              <span className="text-sm font-normal opacity-80 hidden sm:inline ml-1">
                — AI sẽ tạo lịch tuần, gán nhân sự và KPI cho từng ngày trong 12 tháng
              </span>
            )}
          </button>
        )}
      </motion.div>
    )
  }

  /* ── VIEW 3: Weekly Swimlane ────────────────────────── */

  function WeeksView() {
    const latestTree = roadmap.tree
    // Flatten all months across quarters
    const allMonths: RoadmapNode[] = []
    ;(latestTree.children ?? []).forEach((q) => {
      ;(q.children ?? []).forEach((m) => allMonths.push(m))
    })

    const currentMonth = allMonths[selectedMonth] ?? allMonths[0]
    const weeks = currentMonth?.children ?? []

    return (
      <motion.div
        key="weeks"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="space-y-6"
      >
        {/* Back */}
        <button
          onClick={() => setViewLevel("months")}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Chi tiết Tháng
        </button>

        <div className="glass-card p-6">
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            📋 Lịch công việc chi tiết
          </h2>
        </div>

        {/* Month Tab Bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
          {allMonths.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setSelectedMonth(i)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                i === selectedMonth
                  ? "bg-primary text-white shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              T{i + 1}
            </button>
          ))}
        </div>

        {/* Week Sections */}
        {weeks.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground">
            Chưa có dữ liệu tuần cho tháng này.
          </div>
        )}
        {weeks.map((week, wi) => (
          <WeekSection key={week.id} week={week} weekIndex={wi} defaultOpen={wi === 0} />
        ))}
      </motion.div>
    )
  }

  /* ── Week Collapsible Section ───────────────────────── */

  function WeekSection({
    week,
    weekIndex,
    defaultOpen,
  }: {
    week: RoadmapNode
    weekIndex: number
    defaultOpen: boolean
  }) {
    const [open, setOpen] = useState(defaultOpen)
    const days = week.children ?? []

    // Collect unique assignees from all tasks across all days
    const assigneeSet = new Map<string, string>() // key → display name
    days.forEach((day) => {
      ;(day.children ?? []).forEach((task) => {
        const key = task.assigneeName ?? "Chưa giao"
        assigneeSet.set(key, key)
      })
    })
    const assignees = Array.from(assigneeSet.keys())

    // Day labels
    const dayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"]

    return (
      <div className="glass-card overflow-hidden">
        {/* Toggle Header */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <span className="font-bold text-sm text-foreground">
              Tuần {weekIndex + 1}
            </span>
            {week.startDate && week.endDate && (
              <span className="text-xs text-muted-foreground">
                ({new Date(week.startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                –{new Date(week.endDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })})
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-medium">{week.description}</span>
        </button>

        {/* Swimlane Content */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {days.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu ngày cho tuần này.
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-max">
                    {/* Day headers */}
                    <div className="flex border-t border-b bg-muted/30">
                      <div className="w-36 shrink-0 border-r p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Nhân sự
                      </div>
                      {days.slice(0, 5).map((d, di) => (
                        <div key={d.id} className="w-52 shrink-0 border-r last:border-r-0 p-3 text-center">
                          <span className="text-xs font-bold text-foreground">{dayLabels[di] ?? d.title}</span>
                        </div>
                      ))}
                    </div>

                    {/* Assignee rows */}
                    {assignees.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Không có công việc nào.
                      </div>
                    ) : (
                      assignees.map((assignee) => (
                        <div key={assignee} className="flex border-b last:border-b-0 hover:bg-muted/10 transition-colors">
                          {/* Row label */}
                          <div className="w-36 shrink-0 border-r p-3 flex items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {assignee.charAt(0)}
                              </div>
                              <span className="text-xs font-semibold text-foreground truncate max-w-[80px]">{assignee}</span>
                            </div>
                          </div>

                          {/* Day cells */}
                          {days.slice(0, 5).map((day) => {
                            const tasks = (day.children ?? []).filter(
                              (t) => (t.assigneeName ?? "Chưa giao") === assignee
                            )
                            return (
                              <div key={day.id} className="w-52 shrink-0 border-r last:border-r-0 p-2 flex flex-col gap-2 min-h-[80px]">
                                {tasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="p-2.5 rounded-xl border bg-white hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                                  >
                                    <p className="text-xs font-bold text-foreground line-clamp-1">{task.title}</p>
                                    {task.personalKPI && (
                                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{task.personalKPI}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-1.5">
                                      {task.bonusAmount ? (
                                        <span className="text-[10px] font-bold text-emerald-600">
                                          +{formatVND(task.bonusAmount, "full")}
                                        </span>
                                      ) : (
                                        <span />
                                      )}
                                      {task.startDate && (
                                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                          <Calendar className="w-2.5 h-2.5" />
                                          {new Date(task.startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
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

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <StepDot active={viewLevel === "year"} done={viewLevel === "months" || viewLevel === "weeks"} label="Năm" />
        <div className="w-8 h-px bg-border" />
        <StepDot active={viewLevel === "months"} done={viewLevel === "weeks"} label="Tháng" />
        <div className="w-8 h-px bg-border" />
        <StepDot active={viewLevel === "weeks"} done={false} label="Tuần" />
      </div>

      {/* Views */}
      <AnimatePresence mode="wait">
        {viewLevel === "year" && <YearView />}
        {viewLevel === "months" && <MonthsView />}
        {viewLevel === "weeks" && <WeeksView />}
      </AnimatePresence>
    </div>
  )
}

/* ── Step Indicator Dot ───────────────────────────────── */

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
          active
            ? "bg-primary text-white border-primary shadow-md"
            : done
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-muted text-muted-foreground border-border"
        )}
      >
        {done ? "✓" : active ? "●" : "○"}
      </div>
      <span className={cn("text-xs", active ? "text-primary font-bold" : "text-muted-foreground")}>{label}</span>
    </div>
  )
}
