import { Suspense } from "react"
import { MindmapView } from "@/components/mindmap/MindmapView"
import { Loader2 } from "lucide-react"

export default function MindmapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MindmapView />
    </Suspense>
  )
}
