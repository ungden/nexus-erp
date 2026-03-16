"use client"

import { useAppContext } from "@/context/AppContext"
import { RoadmapTree } from "@/components/roadmap/RoadmapTree"
import { Button } from "@/components/ui/Button"
import { Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function PlanViewPage() {
  const { roadmap, setRoadmap } = useAppContext()

  if (!roadmap) {
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

  return (
    <RoadmapTree
      roadmap={roadmap}
      onUpdate={setRoadmap}
    />
  )
}
