"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAppContext } from "@/context/AppContext"
import { RoadmapTree } from "@/components/roadmap/RoadmapTree"
import { Button } from "@/components/ui/Button"
import { Sparkles, ArrowRight, CheckCircle2, History } from "lucide-react"
import Link from "next/link"
import { Roadmap } from "@/lib/roadmap-types"
import { formatDate } from "@/lib/format"

export default function PlanViewPage() {
  const { roadmaps, setRoadmaps, setFinance } = useAppContext()
  const searchParams = useSearchParams()
  const idParam = searchParams.get('id')
  
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (idParam && roadmaps.find(r => r.id === idParam)) {
      return idParam;
    }
    if (roadmaps.length > 0) {
      const active = roadmaps.find(r => r.isActive);
      return active ? active.id : roadmaps[0].id;
    }
    return null;
  });

  if (!roadmaps || roadmaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
          <Sparkles className="w-12 h-12 text-primary/40" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Chưa có Roadmap nào</h2>
          <p className="text-sm text-muted-foreground">
            Tạo kế hoạch kinh doanh với AI để hệ thống tự động xây dựng Roadmap chi tiết — 
            từ mục tiêu năm xuống đến từng công việc hàng tuần.
          </p>
        </div>
        <Link href="/erp/plan">
          <Button variant="gradient" size="lg" className="gap-2 font-bold">
            <Sparkles className="w-4 h-4" />
            Tạo AI Roadmap
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    )
  }

  const selectedRoadmap = roadmaps.find(r => r.id === selectedId) || roadmaps[0]

  const handleSetActive = () => {
    const updated = roadmaps.map(r => ({
      ...r,
      isActive: r.id === selectedRoadmap.id
    }))
    setRoadmaps(updated)

    // Sync finance
    setFinance({
      targetRevenue: selectedRoadmap.company.revenue,
      allocations: {
        cogs: selectedRoadmap.board.cfo.budgetAllocation.cogs.percent,
        hr: selectedRoadmap.board.cfo.budgetAllocation.hr.percent,
        mkt: selectedRoadmap.board.cfo.budgetAllocation.marketing.percent,
        ops: selectedRoadmap.board.cfo.budgetAllocation.operations.percent,
        profit: selectedRoadmap.board.cfo.budgetAllocation.profit.percent,
      }
    })
    
    alert("Đã áp dụng kịch bản này làm kế hoạch chính thức cho doanh nghiệp!")
  }

  const handleUpdateRoadmap = (updatedRoadmap: Roadmap) => {
    const newRoadmaps = roadmaps.map(r => r.id === updatedRoadmap.id ? updatedRoadmap : r)
    setRoadmaps(newRoadmaps)
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Scenario Manager Header */}
      <div className="glass-card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Quản lý Kịch bản
          </h2>
          <Link href="/erp/plan">
            <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/20 hover:bg-primary/10">
              <Sparkles className="w-4 h-4" /> Tạo Kịch bản mới
            </Button>
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {roadmaps.map(rm => (
            <button
              key={rm.id}
              onClick={() => setSelectedId(rm.id)}
              className={`shrink-0 text-left p-3 rounded-xl border transition-all min-w-[200px] ${
                selectedId === rm.id 
                  ? 'bg-primary/5 border-primary shadow-sm' 
                  : 'bg-background border-border hover:border-primary/30'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm truncate pr-2">{rm.name}</span>
                {rm.isActive && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(rm.generatedAt)}</p>
            </button>
          ))}
        </div>

        {!selectedRoadmap.isActive && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-amber-800 font-medium">
              Kịch bản này đang là bản nháp, chưa được áp dụng vào Dashboard & ERP.
            </p>
            <Button onClick={handleSetActive} className="bg-amber-600 hover:bg-amber-700 text-white shadow-md">
              Áp dụng Kịch bản này
            </Button>
          </div>
        )}
      </div>

      <RoadmapTree
        roadmap={selectedRoadmap}
        onUpdate={handleUpdateRoadmap}
      />
    </div>
  )
}
