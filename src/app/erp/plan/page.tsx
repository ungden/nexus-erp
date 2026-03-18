"use client"

import { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent } from "@/components/ui/Card"
import {
  Building2, Target, ArrowRight, ArrowLeft, Sparkles, Check,
  Package, Users, Wallet, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, XCircle, Edit3,
  BarChart3, Briefcase, UserPlus, BadgePercent, Eye,
} from "lucide-react"
import { useAppContext, Employee } from "@/context/AppContext"
import { generateRoadmapTree, batchExpandQuarters, batchExpandMonths } from '@/lib/ai-engine'
import {
  CompanyProfile, BoardAnalysis, CFOAnalysis, CEOStrategy, HRPlan,
  RoadmapNode, Roadmap,
} from "@/lib/roadmap-types"
import { formatVND, formatNumber } from "@/lib/format"

// ============================================================
// Constants
// ============================================================

const INDUSTRIES = [
  "Công nghệ", "Bán lẻ", "Dịch vụ", "Sản xuất", "F&B",
  "Bất động sản", "Giáo dục", "Y tế", "Tài chính", "Khác",
]

const INDUSTRY_ICONS: Record<string, string> = {
  "Công nghệ": "💻", "Bán lẻ": "🛒", "Dịch vụ": "🤝", "Sản xuất": "🏭",
  "F&B": "🍜", "Bất động sản": "🏠", "Giáo dục": "📚", "Y tế": "🏥",
  "Tài chính": "🏦", "Khác": "📦",
}

const BUDGET_KEYS = ["cogs", "hr", "marketing", "operations", "profit"] as const
const BUDGET_LABELS: Record<string, string> = {
  cogs: "Chi phí hàng hoá (COGS)",
  hr: "Nhân sự (HR)",
  marketing: "Marketing",
  operations: "Vận hành (Ops)",
  profit: "Lợi nhuận",
}
const BUDGET_HEX: Record<string, string> = {
  cogs: "#818cf8",       // indigo-400
  hr: "#6366f1",         // indigo-500
  marketing: "#4f46e5",  // indigo-600
  operations: "#4338ca", // indigo-700
  profit: "#10b981",     // emerald-500
}

type Screen = "input" | "loading" | "results"
type ResultTab = "cfo" | "ceo" | "hr"

// ============================================================
// Cashflow Health Indicator
// ============================================================

function CashflowHealth({ revenue, expense }: { revenue: number; expense: number }) {
  const margin = revenue > 0 ? ((revenue - expense) / revenue) * 100 : -100
  const isHealthy = margin >= 10
  const isWarning = margin >= 0 && margin < 10
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 text-sm bg-white shadow-sm ${
      isHealthy ? "border-emerald-500/30"
        : isWarning ? "border-amber-500/30"
        : "border-red-500/30"
    }`}>
      <div className={`p-3 rounded-full ${
        isHealthy ? "bg-emerald-50 text-emerald-600"
          : isWarning ? "bg-amber-50 text-amber-600"
          : "bg-red-50 text-red-600"
      }`}>
        {isHealthy ? <CheckCircle2 className="w-6 h-6" />
          : isWarning ? <AlertTriangle className="w-6 h-6" />
          : <XCircle className="w-6 h-6" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground">
          {isHealthy ? "Dòng tiền KHOẺ" : isWarning ? "Dòng tiền CẦN LƯU Ý" : "Dòng tiền NGUY HIỂM"}
          <span className="text-muted-foreground font-normal ml-2">· Biên lợi nhuận {margin.toFixed(1)}%</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Doanh thu {formatVND(revenue)} − Chi phí {formatVND(expense)} = <strong className="text-foreground">{formatVND(revenue - expense)}</strong>
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function PlanWizardPage() {
  const router = useRouter()
  const { setFinance, roadmaps, setRoadmaps, employees, setEmployees } = useAppContext()

  // ---------- Screen state ----------
  const [screen, setScreen] = useState<Screen>("input")
  const [activeTab, setActiveTab] = useState<ResultTab>("cfo")

  // ---------- Input form ----------
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [objective, setObjective] = useState("")
  const [revenue, setRevenue] = useState("")
  const [products, setProducts] = useState("")
  const [feedback, setFeedback] = useState("")

  // ---------- Loading animation ----------
  const [loadStep, setLoadStep] = useState(0)

  // ---------- Result state ----------
  const [board, setBoard] = useState<BoardAnalysis | null>(null)
  const [tree, setTree] = useState<RoadmapNode | null>(null)
  const [generatedAt, setGeneratedAt] = useState("")

  // ---- Derived: input valid ----
  const isInputValid = companyName.trim() !== "" && industry !== "" &&
    objective.trim() !== "" && revenue.trim() !== "" && products.trim() !== ""

  // ---- Derived: revenue as number ----
  const revenueNum = parseInt(revenue) || 0

  // ============================================================
  // AI Analysis — call POST /api/roadmap
  // ============================================================

  const handleAnalyze = async () => {
    setScreen("loading")
    setLoadStep(0)

    const profile: CompanyProfile = {
      companyName,
      industry,
      objective,
      revenue: revenueNum,
      headcount: 0,
      fixedCost: 0,
      products,
      feedback: feedback.trim() || undefined,
    }

    // Progressive loading animation
    const t1 = setTimeout(() => setLoadStep(1), 800)
    const t2 = setTimeout(() => setLoadStep(2), 1800)
    const t3 = setTimeout(() => setLoadStep(3), 2800)

    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })

      if (!res.ok) throw new Error("API failed")
      const data = await res.json()

      if (!data.board || !data.tree) throw new Error("Invalid response")

      // Ensure all 3 animation steps finish visually
      setLoadStep(3)
      await new Promise(r => setTimeout(r, 800))

      setBoard(data.board)
      setTree(data.tree)
      setGeneratedAt(data.generatedAt)

      // Update finance context with CFO allocations
      try {
        const cfo = data.board.cfo as CFOAnalysis
        if (cfo?.budgetAllocation) {
          setFinance({
            targetRevenue: revenueNum,
            allocations: {
              cogs: cfo.budgetAllocation.cogs.percent,
              hr: cfo.budgetAllocation.hr.percent,
              mkt: cfo.budgetAllocation.marketing.percent,
              ops: cfo.budgetAllocation.operations.percent,
              profit: cfo.budgetAllocation.profit.percent,
            },
          })
        }
      } catch { /* ignore finance sync errors */ }

      setScreen("results")
    } catch (err) {
      console.error("Roadmap generation failed:", err)
      setScreen("input")
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }

  // ============================================================
  // Board edit helpers
  // ============================================================

  const updateCFO = useCallback((updater: (cfo: CFOAnalysis) => CFOAnalysis) => {
    setBoard(prev => prev ? { ...prev, cfo: updater(prev.cfo) } : prev)
  }, [])

  const updateCEO = useCallback((updater: (ceo: CEOStrategy) => CEOStrategy) => {
    setBoard(prev => prev ? { ...prev, ceo: updater(prev.ceo) } : prev)
  }, [])

  const updateHR = useCallback((updater: (hr: HRPlan) => HRPlan) => {
    setBoard(prev => prev ? { ...prev, hr: updater(prev.hr) } : prev)
  }, [])

  // ---- CFO: change budget % and recalculate amounts ----
  const handleBudgetChange = useCallback((key: string, newPercent: number) => {
    updateCFO(cfo => {
      const alloc = { ...cfo.budgetAllocation }
      const k = key as keyof typeof alloc
      alloc[k] = { ...alloc[k], percent: newPercent, amount: Math.round(revenueNum * newPercent / 100) }
      return { ...cfo, budgetAllocation: alloc }
    })
  }, [revenueNum, updateCFO])

  // ---- HR: update department headcount/avgSalary ----
  const handleDeptChange = useCallback((idx: number, field: "headcount" | "avgSalary", value: number) => {
    updateHR(hr => {
      const depts = [...hr.departments]
      const d = { ...depts[idx] }
      if (field === "headcount") { d.headcount = value; d.totalSalary = value * d.avgSalary }
      else { d.avgSalary = value; d.totalSalary = d.headcount * value }
      depts[idx] = d
      const monthlySalary = depts.reduce((s, x) => s + x.totalSalary, 0)
      const totalHeadcount = depts.reduce((s, x) => s + x.headcount, 0)
      return {
        ...hr,
        departments: depts,
        totalHeadcount,
        monthlySalary,
        monthlyFixedCost: monthlySalary + hr.monthlyOpex,
        yearlyFixedCost: (monthlySalary + hr.monthlyOpex) * 12,
      }
    })
  }, [updateHR])

  // ---- Approve & navigate ----
  const handleApprove = () => {
    if (!board || !tree) return
    const profile: CompanyProfile = {
      companyName, industry, objective,
      revenue: revenueNum,
      headcount: board.hr.totalHeadcount,
      fixedCost: board.hr.monthlyFixedCost,
      products,
    }

    let newId = Date.now() + Math.floor(Math.random() * 1000);
    const newEmployees: Employee[] = [];
    board.hr.departments.forEach((dept) => {
      for (let i = 0; i < dept.headcount; i++) {
        const role = dept.keyRoles[i] || dept.keyRoles[0] || 'Nhân sự';
        newEmployees.push({
          id: newId++,
          name: `${role} (Tuyển mới)`,
          role: role,
          department: dept.name,
          email: '',
          phone: '',
          status: 'Đang làm việc', // Must be "Đang làm việc" to receive tasks
          joinDate: new Date().toISOString().split('T')[0],
          baseSalary: dept.avgSalary,
          managerId: null
        });
      }
    });

    const isActive = roadmaps.length === 0;
    const mergedEmployees = [...(employees || []), ...newEmployees];
    if (isActive && setEmployees) {
      setEmployees(mergedEmployees);
    }

    let fullTree = generateRoadmapTree(profile, board);
    fullTree = batchExpandQuarters(fullTree, profile, board);
    fullTree = batchExpandMonths(fullTree, profile, board, mergedEmployees.map(e => ({
      id: e.id, name: e.name, department: e.department, role: e.role, baseSalary: e.baseSalary
    })));

    const newRoadmap: Roadmap = {
      id: `rm_${Date.now()}`,
      name: `Kịch bản: ${objective}`,
      isActive, // Make active if it's the first one
      company: profile,
      board,
      tree: fullTree,
      generatedAt
    };
    setRoadmaps([...roadmaps, newRoadmap]);

    if (newRoadmap.isActive) {
      setFinance({
        targetRevenue: profile.revenue,
        allocations: {
          cogs: board.cfo.budgetAllocation.cogs.percent,
          hr: board.cfo.budgetAllocation.hr.percent,
          mkt: board.cfo.budgetAllocation.marketing.percent,
          ops: board.cfo.budgetAllocation.operations.percent,
          profit: board.cfo.budgetAllocation.profit.percent,
        },
      });
    }

    router.push("/erp/plan/view?id=" + newRoadmap.id)
  }

  // ---- Computed cashflow for header ----
  const cashflow = useMemo(() => {
    if (!board) return { revenue: 0, expense: 0 }
    const { cogs, hr, marketing, operations } = board.cfo.budgetAllocation;
    const expense = cogs.amount + hr.amount + marketing.amount + operations.amount;
    return { revenue: revenueNum, expense }
  }, [board, revenueNum])

  // ==========================================================
  // SCREEN 1: Input
  // ==========================================================
  if (screen === "input") {
    return (
      <div className="max-w-3xl mx-auto py-6 md:py-10 px-4">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" /> Ban Giám đốc AI
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Phân tích Chiến lược <span className="text-gradient">Doanh nghiệp</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Nhập thông tin doanh nghiệp — CFO, CEO, HR Director sẽ phân tích và đề xuất kế hoạch toàn diện.
          </p>
        </div>

        <Card className="glass-card overflow-hidden">
          <CardContent className="p-5 md:p-7 space-y-6">
            {/* ---- Step A: Company Profile ---- */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow">A</div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Hồ sơ Doanh nghiệp</h2>
                  <p className="text-[11px] text-muted-foreground">Tên công ty và ngành nghề kinh doanh</p>
                </div>
              </div>

              {/* Company name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tên Doanh nghiệp</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="VD: Công ty TNHH ABC Việt Nam"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-10 h-11 text-sm"
                  />
                </div>
              </div>

              {/* Industry select grid */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ngành nghề</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {INDUSTRIES.map((ind) => (
                    <button key={ind} onClick={() => setIndustry(ind)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[11px] font-medium border transition-all ${
                        industry === ind
                          ? "bg-primary text-white border-primary shadow-md scale-[1.03]"
                          : "bg-background border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className="text-base">{INDUSTRY_ICONS[ind]}</span>
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* ---- Step B: Strategy ---- */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow">B</div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Mục tiêu Chiến lược</h2>
                  <p className="text-[11px] text-muted-foreground">Mục tiêu, doanh thu kỳ vọng và sản phẩm/dịch vụ</p>
                </div>
              </div>

              {/* Objective */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mục tiêu chiến lược</label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="VD: Mở rộng thị trường miền Bắc, đạt 1000 khách hàng"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="pl-10 h-11 text-sm"
                  />
                </div>
              </div>

              {/* Revenue */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Doanh thu mục tiêu (VNĐ)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="VD: 5.000.000.000"
                    value={revenue ? formatNumber(Number(String(revenue).replace(/\D/g, ''))) : ''}
                    onChange={(e) => setRevenue(e.target.value.replace(/\D/g, ''))}
                    className="pl-10 h-11 text-sm"
                  />
                </div>
                {revenueNum > 0 && (
                  <p className="text-[11px] text-muted-foreground pl-1">= {formatVND(revenueNum)}</p>
                )}
              </div>

              {/* Products */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sản phẩm / Dịch vụ chính</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="VD: Phần mềm quản lý bán hàng, Tư vấn chuyển đổi số"
                    value={products}
                    onChange={(e) => setProducts(e.target.value)}
                    className="pl-10 h-11 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <Button
                variant="gradient" size="lg"
                onClick={handleAnalyze}
                disabled={!isInputValid}
                className="w-full gap-2 font-bold text-base"
              >
                <Sparkles className="w-5 h-5" />
                Ban Giám đốc AI phân tích
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==========================================================
  // SCREEN 2: AI Analysis Animation
  // ==========================================================
  if (screen === "loading") {
    const steps = [
      { emoji: "🧠", role: "CFO", text: "CFO đang phân tích tài chính..." },
      { emoji: "👔", role: "CEO", text: "CEO đang xây dựng chiến lược..." },
      { emoji: "👥", role: "HR Director", text: "HR Director đang thiết kế bộ máy..." },
    ]

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 py-16 w-full max-w-md mx-auto px-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-2xl bg-primary/20 animate-pulse" />
          <div className="h-20 w-20 rounded-full bg-background border border-border shadow-md flex items-center justify-center relative z-10">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>

        <div className="text-center space-y-6 w-full">
          <h2 className="text-xl font-bold text-foreground">Ban Giám đốc AI đang phân tích...</h2>
          <p className="text-sm text-muted-foreground">
            Phân tích <strong>{companyName}</strong> · Ngành {industry}
          </p>

          <div className="space-y-3 text-sm font-medium">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.3 }}
                className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${
                  loadStep > i
                    ? "bg-white border-emerald-300"
                    : loadStep === i
                    ? "bg-white border-primary/40 shadow-sm"
                    : "bg-white border-zinc-200"
                }`}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className={`flex-1 text-left ${
                  loadStep > i ? "text-zinc-900 font-semibold" 
                  : loadStep === i ? "text-zinc-800" 
                  : "text-zinc-400"
                }`}>
                  {s.text}
                </span>
                {loadStep > i ? (
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : loadStep === i ? (
                  <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0 inline-block" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-zinc-300 shrink-0 inline-block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================================
  // SCREEN 3: Board Results — 3 Editable Tabs
  // ==========================================================
  if (!board) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center px-4">
      <p className="text-lg font-semibold text-foreground">Không có dữ liệu phân tích</p>
      <p className="text-sm text-muted-foreground">Vui lòng tạo kế hoạch mới.</p>
      <Button onClick={() => setScreen("input")} className="gap-2">
        <ArrowRight className="w-4 h-4 rotate-180" /> Quay lại nhập liệu
      </Button>
    </div>
  )

  const cfo = board.cfo
  const ceo = board.ceo
  const hr = board.hr

  const tabs: { key: ResultTab; icon: typeof BarChart3; label: string }[] = [
    { key: "cfo", icon: BarChart3, label: "CFO: Tài chính" },
    { key: "ceo", icon: Target, label: "CEO: Chiến lược" },
    { key: "hr", icon: Users, label: "HR: Nhân sự" },
  ]

  // Budget total percent
  const budgetTotalPercent = BUDGET_KEYS.reduce((s, k) => s + cfo.budgetAllocation[k].percent, 0)

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
          Kết quả phân tích · <span className="text-gradient">{companyName}</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Ngành {industry} · Doanh thu mục tiêu {formatVND(revenueNum)} · Chỉnh sửa trực tiếp bên dưới
        </p>
      </div>

      {/* Cashflow Health — always visible */}
      <CashflowHealth revenue={cashflow.revenue} expense={cashflow.expense} />

      {/* Tab bar */}
      <div className="flex gap-1.5 p-1.5 bg-muted/30 rounded-xl border border-border">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.key
                  ? "bg-primary text-white shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {/* ============ CFO TAB ============ */}
          {activeTab === "cfo" && (
            <div className="space-y-5">
              {/* Feasibility Badge */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  cfo.feasibility === "Khả thi"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : cfo.feasibility === "Cần điều chỉnh"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  {cfo.feasibility === "Khả thi" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                   cfo.feasibility === "Cần điều chỉnh" ? <AlertTriangle className="w-3.5 h-3.5" /> :
                   <XCircle className="w-3.5 h-3.5" />}
                  {cfo.feasibility}
                </span>
                <span className="text-xs text-muted-foreground">Đánh giá khả thi CFO</span>
              </div>

              {/* Analysis paragraph */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground leading-relaxed">{cfo.analysis}</p>
                </CardContent>
              </Card>

              {/* Budget Allocation */}
              <Card className="glass-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" /> Phân bổ Ngân sách
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      Math.abs(budgetTotalPercent - 100) < 0.5
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      Tổng: {budgetTotalPercent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {BUDGET_KEYS.map((key) => {
                      const line = cfo.budgetAllocation[key]
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-medium text-foreground w-44 shrink-0 truncate">
                              {BUDGET_LABELS[key]}
                            </span>
                            {/* Colored bar — monochrome indigo palette */}
                            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.min(line.percent, 100)}%`, backgroundColor: BUDGET_HEX[key] }}
                              />
                            </div>
                            {/* Editable % */}
                            <input
                              type="text"
                              value={line.percent ? formatNumber(Number(String(line.percent).replace(/\D/g, ''))) : ''}
                              onChange={(e) => handleBudgetChange(key, parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
                              className="w-14 h-7 text-xs font-bold text-center rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                            <span className="text-[10px] text-muted-foreground">%</span>
                            {/* Amount */}
                            <span className="text-xs font-semibold text-foreground w-20 text-right tabular-nums">
                              {formatVND(line.amount)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly burn + Break even */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="glass-card">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Chi phí vận hành / tháng</p>
                    <p className="text-lg font-bold text-foreground">{formatVND(cfo.monthlyBurnRate)}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hoà vốn sau</p>
                    <p className="text-lg font-bold text-foreground">{cfo.breakEvenMonth} tháng</p>
                  </CardContent>
                </Card>
              </div>

              {/* Risks */}
              <Card className="glass-card">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Rủi ro
                  </h3>
                  <div className="space-y-2">
                    {cfo.risks.map((risk, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground leading-relaxed">{risk}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ============ CEO TAB ============ */}
          {activeTab === "ceo" && (
            <div className="space-y-5">
              {/* Vision */}
              <Card className="glass-card">
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Tầm nhìn chiến lược
                  </h3>
                  <textarea
                    value={ceo.vision}
                    onChange={(e) => updateCEO(c => ({ ...c, vision: e.target.value }))}
                    className="w-full min-h-[80px] text-sm text-foreground bg-muted/30 rounded-xl border border-border p-3 resize-y focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </CardContent>
              </Card>

              {/* Quarter Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ceo.quarterlyGoals.map((q, qi) => {
                  const quarterBorders = ["border-l-indigo-400", "border-l-indigo-500", "border-l-indigo-600", "border-l-indigo-700"]
                  return (
                  <Card key={qi} className={`glass-card overflow-hidden border-l-[3px] ${quarterBorders[qi] || "border-l-indigo-500"}`}>
                    <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Quý {q.quarter}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">{formatVND(q.revenue)} doanh thu</span>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      {/* Theme - editable */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Chủ đề</label>
                        <Input
                          value={q.theme}
                          onChange={(e) => {
                            updateCEO(c => {
                              const goals = [...c.quarterlyGoals]
                              goals[qi] = { ...goals[qi], theme: e.target.value }
                              return { ...c, quarterlyGoals: goals }
                            })
                          }}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Key objectives - editable */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Mục tiêu chính</label>
                        {q.keyObjectives.map((obj, oi) => (
                          <div key={oi} className="flex items-center gap-1.5">
                            <span className="text-primary text-xs font-bold">{oi + 1}.</span>
                            <input
                              value={obj}
                              onChange={(e) => {
                                updateCEO(c => {
                                  const goals = [...c.quarterlyGoals]
                                  const objs = [...goals[qi].keyObjectives]
                                  objs[oi] = e.target.value
                                  goals[qi] = { ...goals[qi], keyObjectives: objs }
                                  return { ...c, quarterlyGoals: goals }
                                })
                              }}
                              className="flex-1 h-7 text-xs px-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Milestones - editable */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Milestones</label>
                        {q.milestones.map((ms, mi) => (
                          <div key={mi} className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                            <input
                              value={ms}
                              onChange={(e) => {
                                updateCEO(c => {
                                  const goals = [...c.quarterlyGoals]
                                  const mils = [...goals[qi].milestones]
                                  mils[mi] = e.target.value
                                  goals[qi] = { ...goals[qi], milestones: mils }
                                  return { ...c, quarterlyGoals: goals }
                                })
                              }}
                              className="flex-1 h-7 text-xs px-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  )
                })}
              </div>

              {/* Company KPIs */}
              <Card className="glass-card">
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">KPIs Công ty</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {ceo.companyKPIs.map((kpi, ki) => (
                      <div key={ki} className="inline-flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-full px-2.5 py-1">
                        <input
                          value={kpi}
                          onChange={(e) => {
                            updateCEO(c => {
                              const kpis = [...c.companyKPIs]
                              kpis[ki] = e.target.value
                              return { ...c, companyKPIs: kpis }
                            })
                          }}
                          className="bg-transparent text-xs font-medium text-primary border-none outline-none w-auto min-w-[60px]"
                          style={{ width: `${Math.max(60, (ceo.companyKPIs[ki]?.length || 6) * 7)}px` }}
                        />
                        <Edit3 className="w-2.5 h-2.5 text-primary/40" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ============ HR TAB ============ */}
          {activeTab === "hr" && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Tổng nhân sự", value: `${hr.totalHeadcount} người`, icon: Users, color: "text-blue-600" },
                  { label: "Quỹ lương / tháng", value: formatVND(hr.monthlySalary), icon: Wallet, color: "text-emerald-600" },
                  { label: "Chi phí cố định / tháng", value: formatVND(hr.monthlyFixedCost), icon: DollarSign, color: "text-amber-600" },
                  { label: "Biên lợi nhuận", value: `${hr.profitMargin}%`, icon: TrendingUp, color: "text-violet-600" },
                ].map((item) => (
                  <Card key={item.label} className="glass-card">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                      </div>
                      <p className="text-base font-bold text-foreground">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Department cards */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Phòng ban & Nhân sự
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hr.departments.map((dept, idx) => (
                    <Card key={idx} className="glass-card hover:border-primary/20 transition-colors overflow-hidden">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-sm text-foreground">{dept.name}</h4>
                          <span className="text-xs font-semibold text-primary">{formatVND(dept.totalSalary)}/th</span>
                        </div>
                        {/* Key roles as badges */}
                        <div className="flex flex-wrap gap-1">
                          {dept.keyRoles.map((role, i) => (
                            <span key={i} className="text-[10px] font-medium bg-primary/5 text-primary px-2 py-0.5 rounded-full border border-primary/10">
                              {role}
                            </span>
                          ))}
                        </div>
                        {/* Editable headcount & salary */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Số người</label>
                            <Input
                              type="text" value={dept.headcount ? formatNumber(Number(String(dept.headcount).replace(/\D/g, ''))) : ''}
                              onChange={(e) => handleDeptChange(idx, "headcount", parseInt(e.target.value.replace(/\D/g, '')) || 1)}
                              className="h-8 text-xs mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Lương TB (VNĐ)</label>
                            <Input
                              type="text" value={dept.avgSalary ? formatNumber(Number(String(dept.avgSalary).replace(/\D/g, ''))) : ''}
                              onChange={(e) => handleDeptChange(idx, "avgSalary", parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                              className="h-8 text-xs mt-0.5"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Hiring Plan Table */}
              <Card className="glass-card">
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" /> Kế hoạch Tuyển dụng
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 font-bold text-muted-foreground">Quý</th>
                          <th className="text-left py-2 font-bold text-muted-foreground">Tuyển mới</th>
                          <th className="text-left py-2 font-bold text-muted-foreground">Phòng ban</th>
                          <th className="text-left py-2 font-bold text-muted-foreground">Ưu tiên</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hr.hiringPlan.map((item, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 font-semibold text-foreground">Q{item.quarter}</td>
                            <td className="py-2 text-foreground">{item.newHires} người</td>
                            <td className="py-2 text-foreground">{item.departments.join(", ")}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.priority.includes("Cao") || item.priority.includes("High")
                                  ? "bg-red-100 text-red-700"
                                  : item.priority.includes("Trung bình") || item.priority.includes("Medium")
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {item.priority}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Compensation & KPI Bonus policies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="glass-card">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BadgePercent className="w-3.5 h-3.5" /> Chính sách Lương thưởng
                    </h3>
                    <textarea
                      value={hr.compensationPolicy}
                      onChange={(e) => updateHR(h => ({ ...h, compensationPolicy: e.target.value }))}
                      className="w-full min-h-[100px] text-xs text-foreground bg-muted/30 rounded-xl border border-border p-3 resize-y focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Chính sách KPI & Thưởng
                    </h3>
                    <textarea
                      value={hr.kpiBonusPolicy}
                      onChange={(e) => updateHR(h => ({ ...h, kpiBonusPolicy: e.target.value }))}
                      className="w-full min-h-[100px] text-xs text-foreground bg-muted/30 rounded-xl border border-border p-3 resize-y focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* AI Feedback */}
      <div className="pt-8 pb-4 border-t border-border mt-10">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Yêu cầu AI điều chỉnh lại kế hoạch
        </h3>
        <div className="flex gap-3">
          <Input
            placeholder="VD: Hãy tăng nhân sự Sales lên 5 người và giảm budget Marketing..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="flex-1 bg-white"
            onKeyDown={(e) => { if (e.key === "Enter" && feedback.trim()) handleAnalyze() }}
          />
          <Button 
            onClick={handleAnalyze}
            disabled={!feedback.trim()}
            className="shrink-0 bg-zinc-900 text-white hover:bg-zinc-800"
          >
            Tạo lại với AI
          </Button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-border mt-4">
        <Button variant="ghost" onClick={() => { setScreen("input"); setBoard(null) }} className="gap-2 font-semibold text-sm">
          <ArrowLeft className="w-4 h-4" /> Nhập lại thông tin
        </Button>
        <Button variant="gradient" size="lg" onClick={handleApprove} className="gap-2 font-bold px-8">
          <Check className="w-4 h-4" />
          Phê duyệt & Tạo Roadmap
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
