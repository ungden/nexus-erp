"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent } from "@/components/ui/Card"
import { 
  Building2, Target, DollarSign, ArrowRight, Sparkles, Check, 
  Package, Factory, Users, Wallet, TrendingUp, Edit3, Loader2
} from "lucide-react"
import { useWizard } from "@/components/wizard/useWizard"
import { useAppContext } from "@/context/AppContext"
import { CompanyProfile } from "@/lib/roadmap-types"
import { CompanySuggestion, DepartmentSuggestion } from "@/lib/ai-suggest"
import { formatVND } from '@/lib/format'

const INDUSTRIES = [
  'Công nghệ', 'Bán lẻ', 'Dịch vụ', 'Sản xuất', 'F&B',
  'Bất động sản', 'Giáo dục', 'Y tế', 'Tài chính', 'Khác'
];

// ---- Bước 1-4: Thu thập thông tin chiến lược ----
const inputSteps = [
  {
    title: "Hồ sơ Doanh nghiệp",
    description: "Tên công ty hoặc doanh nghiệp của bạn?",
    icon: Building2, field: "companyName",
    placeholder: "VD: Công ty TNHH ABC Việt Nam",
    label: "Tên Doanh nghiệp", type: "text",
  },
  {
    title: "Ngành nghề",
    description: "Doanh nghiệp hoạt động trong lĩnh vực nào?",
    icon: Factory, field: "industry",
    placeholder: "", label: "Ngành nghề kinh doanh",
    type: "select", options: INDUSTRIES,
  },
  {
    title: "Mục tiêu & Doanh thu",
    description: "Mục tiêu chiến lược và doanh thu kỳ vọng năm nay?",
    icon: Target, field: "objective",
    placeholder: "VD: Mở rộng thị trường miền Bắc, đạt 1000 khách hàng",
    label: "Mục tiêu Chiến lược", type: "text",
    extraField: { field: "revenue", label: "Doanh thu mục tiêu (VNĐ)", placeholder: "VD: 5000000000", type: "number" },
  },
  {
    title: "Sản phẩm / Dịch vụ",
    description: "Sản phẩm hoặc dịch vụ chính của doanh nghiệp?",
    icon: Package, field: "products",
    placeholder: "VD: Phần mềm quản lý bán hàng, Tư vấn chuyển đổi số",
    label: "Sản phẩm / Dịch vụ chính", type: "text",
  },
];

const TOTAL_STEPS = inputSteps.length + 1; // +1 cho bước AI suggest

export default function PlanWizardPage() {
  const router = useRouter()
  const { setFinance, setRoadmap } = useAppContext()
  const { currentStep, nextStep, prevStep, goToStep, isFirstStep } = useWizard(TOTAL_STEPS)
  
  const [formData, setFormData] = useState<Record<string, string>>({
    companyName: "", industry: "Công nghệ", objective: "",
    revenue: "", products: "",
  })
  const [suggestion, setSuggestion] = useState<CompanySuggestion | null>(null)
  const [editingDept, setEditingDept] = useState<number | null>(null)
  const [isLoadingSuggest, setIsLoadingSuggest] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)

  const isInputPhase = currentStep < inputSteps.length;
  const isSuggestPhase = currentStep === inputSteps.length;

  // ---- Validation ----
  const isCurrentValid = () => {
    if (!isInputPhase) return true;
    const step = inputSteps[currentStep];
    const val = formData[step.field]?.trim();
    if (!val) return false;
    if (step.extraField) {
      const extraVal = formData[step.extraField.field]?.trim();
      if (!extraVal) return false;
    }
    return true;
  };

  // ---- Next step handler ----
  const handleNext = async () => {
    if (isInputPhase && currentStep === inputSteps.length - 1) {
      // Last input step → call AI suggest
      nextStep();
      setIsLoadingSuggest(true);
      try {
        const res = await fetch('/api/roadmap/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            industry: formData.industry,
            targetRevenue: parseInt(formData.revenue) || 1_000_000_000,
          }),
        });
        const data = await res.json();
        setSuggestion(data);
      } catch { /* fallback: suggestion stays null */ }
      setIsLoadingSuggest(false);
    } else if (isInputPhase) {
      nextStep();
    }
  };

  // ---- Generate Roadmap ----
  const handleGenerate = async () => {
    if (!suggestion) return;
    setIsGenerating(true);
    setGenStep(0);

    const profile: CompanyProfile = {
      companyName: formData.companyName,
      industry: formData.industry,
      objective: formData.objective,
      revenue: parseInt(formData.revenue) || 1_000_000_000,
      headcount: suggestion.totalHeadcount,
      fixedCost: suggestion.monthlyFixedCost,
      products: formData.products,
    };

    setFinance({
      targetRevenue: profile.revenue,
      allocations: { cogs: 15, hr: 35, mkt: 20, ops: 10, profit: 20 },
    });

    const timers = [500, 1200, 2000];
    timers.forEach((ms, i) => setTimeout(() => setGenStep(i + 1), ms));

    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      setRoadmap({ company: profile, tree: data.tree, generatedAt: data.generatedAt });
      await new Promise(r => setTimeout(r, 600));
      router.push('/erp/plan/view');
    } catch {
      setIsGenerating(false);
    }
  };

  // ---- Edit department in suggestion ----
  const updateDept = (idx: number, field: keyof DepartmentSuggestion, value: number) => {
    if (!suggestion) return;
    const newDepts = [...suggestion.departments];
    const dept = { ...newDepts[idx] };
    if (field === 'headcount') {
      dept.headcount = value;
      dept.totalSalary = value * dept.avgSalary;
    } else if (field === 'avgSalary') {
      dept.avgSalary = value;
      dept.totalSalary = dept.headcount * value;
    }
    dept.description = `${dept.headcount} người · Lương TB ${formatVND(dept.avgSalary)}/tháng`;
    newDepts[idx] = dept;
    const monthlySalary = newDepts.reduce((s, d) => s + d.totalSalary, 0);
    const totalHeadcount = newDepts.reduce((s, d) => s + d.headcount, 0);
    setSuggestion({
      ...suggestion,
      departments: newDepts,
      totalHeadcount,
      monthlySalary,
      monthlyFixedCost: monthlySalary + suggestion.monthlyOpex,
      yearlyFixedCost: (monthlySalary + suggestion.monthlyOpex) * 12,
    });
  };

  // ---- Generating animation ----
  if (isGenerating) {
    const genSteps = [
      'Phân tích mô hình kinh doanh...',
      'Phân bổ ngân sách từng quý & phòng ban...',
      'Kiểm tra sức khoẻ dòng tiền...',
      'Hoàn thành! Đang mở Roadmap...',
    ];
    return (
      <div className="flex flex-col items-center justify-center space-y-8 py-16 w-full max-w-md mx-auto">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-2xl bg-primary/20 animate-pulse-soft" />
          <div className="h-20 w-20 rounded-full bg-background border border-border shadow-md flex items-center justify-center relative z-10">
            <Sparkles className="h-8 w-8 text-primary animate-pulse-soft" />
          </div>
        </div>
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">AI đang xây dựng Roadmap...</h2>
          <div className="space-y-2.5 text-sm font-medium w-full max-w-xs mx-auto">
            {genSteps.map((text, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: genStep >= i ? 1 : 0.3, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className={`flex items-center gap-2 ${genStep >= i ? 'text-foreground' : 'text-muted-foreground/50'}`}
              >
                {genStep > i ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  : genStep === i ? <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0 inline-block" />
                  : <span className="w-4 h-4 rounded-full border-2 border-border shrink-0 inline-block" />}
                {text}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- BƯỚC 5: AI Suggest bộ máy ----
  if (isSuggestPhase) {
    return (
      <div className="max-w-4xl mx-auto py-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" /> AI đề xuất bộ máy
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
            Cơ cấu Doanh nghiệp được AI đề xuất
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Dựa trên ngành <strong>{formData.industry}</strong> và mục tiêu <strong>{formatVND(parseInt(formData.revenue) || 0)}</strong>, 
            AI đề xuất bộ máy bên dưới. Bạn có thể chỉnh sửa trước khi tạo Roadmap.
          </p>
        </div>

        {isLoadingSuggest ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">AI đang phân tích mô hình kinh doanh...</p>
          </div>
        ) : suggestion ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Tổng nhân sự', value: `${suggestion.totalHeadcount} người`, icon: Users, color: 'text-blue-600' },
                { label: 'Quỹ lương / tháng', value: formatVND(suggestion.monthlySalary), icon: Wallet, color: 'text-emerald-600' },
                { label: 'Chi phí cố định / tháng', value: formatVND(suggestion.monthlyFixedCost), icon: DollarSign, color: 'text-amber-600' },
                { label: 'Lợi nhuận dự kiến', value: `${suggestion.profitMargin}%`, icon: TrendingUp, color: 'text-violet-600' },
              ].map((item) => (
                <Card key={item.label} className="glass-card">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cashflow health check */}
            {(() => {
              const yearlyExpense = suggestion.yearlyFixedCost;
              const yearlyRevenue = parseInt(formData.revenue) || 0;
              const margin = yearlyRevenue > 0 ? ((yearlyRevenue - yearlyExpense) / yearlyRevenue * 100) : 0;
              const isHealthy = margin >= 10;
              const isWarning = margin >= 0 && margin < 10;
              return (
                <div className={`rounded-xl border p-4 flex items-center gap-4 ${
                  isHealthy ? 'bg-emerald-50 border-emerald-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                }`}>
                  <span className="text-2xl">{isHealthy ? '💚' : isWarning ? '🟡' : '🔴'}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${isHealthy ? 'text-emerald-700' : isWarning ? 'text-amber-700' : 'text-red-700'}`}>
                      {isHealthy ? 'Dòng tiền KHOẺ' : isWarning ? 'Dòng tiền CẦN LƯU Ý' : 'Dòng tiền NGUY HIỂM'}
                    </p>
                    <p className={`text-xs ${isHealthy ? 'text-emerald-600' : isWarning ? 'text-amber-600' : 'text-red-600'}`}>
                      Doanh thu {formatVND(yearlyRevenue)} − Chi phí {formatVND(yearlyExpense)} = 
                      Lợi nhuận <strong>{formatVND(yearlyRevenue - yearlyExpense)}</strong> ({margin.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Department Cards */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Phòng ban & Nhân sự</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestion.departments.map((dept, idx) => (
                  <Card key={idx} className="glass-card hover:border-primary/20 transition-colors overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-foreground text-sm">{dept.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{dept.description}</p>
                        </div>
                        <button 
                          onClick={() => setEditingDept(editingDept === idx ? null : idx)}
                          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {/* Roles */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {dept.keyRoles.map((role, i) => (
                          <span key={i} className="text-[10px] font-medium bg-primary/5 text-primary px-2 py-0.5 rounded-full border border-primary/10">
                            {role}
                          </span>
                        ))}
                      </div>

                      {/* Edit mode */}
                      <AnimatePresence>
                        {editingDept === idx && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 pt-3 border-t border-border"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Số người</label>
                                <Input
                                  type="number" value={dept.headcount}
                                  onChange={(e) => updateDept(idx, 'headcount', parseInt(e.target.value) || 1)}
                                  className="h-9 text-sm mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Lương TB (VNĐ)</label>
                                <Input
                                  type="number" value={dept.avgSalary}
                                  onChange={(e) => updateDept(idx, 'avgSalary', parseInt(e.target.value) || 0)}
                                  className="h-9 text-sm mt-1"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Summary */}
                      <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-border/50">
                        <span className="text-muted-foreground">{dept.headcount} người × {formatVND(dept.avgSalary)}</span>
                        <span className="font-bold text-foreground">{formatVND(dept.totalSalary)}/tháng</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" onClick={() => goToStep(inputSteps.length - 1)} className="font-semibold text-sm">
                Quay lại chỉnh sửa
              </Button>
              <Button variant="gradient" size="lg" onClick={handleGenerate} className="gap-2 font-bold px-8">
                <Sparkles className="w-4 h-4" />
                Tạo AI Roadmap
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // ---- BƯỚC 1-4: Thu thập thông tin ----
  const step = inputSteps[currentStep];
  const CurrentIcon = step.icon;

  return (
    <div className="max-w-2xl mx-auto py-6 md:py-10">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
          Tạo <span className="text-gradient">AI Roadmap</span>
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Nhập thông tin chiến lược — AI sẽ đề xuất bộ máy và xây dựng roadmap chi tiết.
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <div key={index} className="flex items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 shrink-0 ${
                index < currentStep ? "bg-primary text-primary-foreground shadow-md"
                  : index === currentStep ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(59,130,246,0.35)] ring-3 ring-primary/20"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}>
                {index < currentStep ? <Check className="w-3.5 h-3.5" /> : 
                 index === TOTAL_STEPS - 1 ? <Sparkles className="w-3 h-3" /> : index + 1}
              </div>
              {index < TOTAL_STEPS - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-300 ${
                  index < currentStep ? "bg-primary" : "bg-border"
                }`} />
              )}
            </div>
          ))}
        </div>

        <Card className="glass-card overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.15 }}
            >
              <CardContent className="p-5 md:p-7 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                    <CurrentIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-foreground">{step.title}</h2>
                    <p className="text-xs text-muted-foreground font-medium">{step.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {step.type === 'select' ? (
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">{step.label}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {step.options?.map((opt) => (
                          <button key={opt}
                            onClick={() => setFormData(prev => ({ ...prev, [step.field]: opt }))}
                            className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                              formData[step.field] === opt
                                ? 'bg-primary text-white border-primary shadow-md'
                                : 'bg-background border-border text-foreground hover:border-primary/40'
                            }`}
                          >{opt}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{step.label}</label>
                      <Input autoFocus type={step.type} placeholder={step.placeholder}
                        value={formData[step.field] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [step.field]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && isCurrentValid()) handleNext() }}
                        className="h-12 text-base font-medium shadow-inner bg-background/50"
                      />
                    </div>
                  )}

                  {/* Extra field (doanh thu trong bước Mục tiêu) */}
                  {step.extraField && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{step.extraField.label}</label>
                      <Input type={step.extraField.type} placeholder={step.extraField.placeholder}
                        value={formData[step.extraField.field] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [step.extraField!.field]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && isCurrentValid()) handleNext() }}
                        className="h-12 text-base font-medium shadow-inner bg-background/50"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3">
                  <Button variant="ghost" onClick={prevStep} disabled={isFirstStep} className={isFirstStep ? "invisible" : "font-semibold text-sm"}>
                    Quay lại
                  </Button>
                  <Button onClick={handleNext} className="gap-2 font-bold px-6" disabled={!isCurrentValid()}>
                    {currentStep === inputSteps.length - 1 ? (
                      <><Sparkles className="w-4 h-4" /> AI phân tích</>
                    ) : (
                      <>Tiếp tục <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </div>

                <p className="text-center text-[10px] text-muted-foreground font-medium">
                  Bước {currentStep + 1} / {TOTAL_STEPS}
                </p>
              </CardContent>
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </div>
  )
}
