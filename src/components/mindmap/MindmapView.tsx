/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useCallback, useMemo } from "react"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  NodeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { GlassNode } from "./GlassNode"
import { Button } from "../ui/Button"
import { ArrowLeft, MapPin } from "lucide-react"
import Link from "next/link"
import { useAppContext } from "@/context/AppContext"
import { RoadmapNode } from "@/lib/roadmap-types"

const nodeTypes: NodeTypes = {
  glass: GlassNode,
}

const TYPE_COLORS: Record<string, string> = {
  company: "#3b82f6",
  sales: "#3b82f6",
  marketing: "#8b5cf6",
  product: "#10b981",
  admin: "#f59e0b",
}

function departmentToType(dept?: string): string {
  if (!dept) return "company"
  const lower = dept.toLowerCase()
  if (lower.includes("kinh doanh") || lower.includes("sales")) return "sales"
  if (lower.includes("marketing")) return "marketing"
  if (lower.includes("kỹ thuật") || lower.includes("sản phẩm") || lower.includes("it")) return "product"
  if (lower.includes("vận hành") || lower.includes("nhân sự") || lower.includes("hành chính")) return "admin"
  return "company"
}

function buildNodesAndEdges(tree: RoadmapNode, companyName: string) {
  const nodes: any[] = []
  const edges: Edge[] = []
  const edgeStyle = (color: string) => ({ stroke: color, strokeWidth: 2 })

  // Root node
  nodes.push({
    id: tree.id,
    type: "glass",
    position: { x: 400, y: 0 },
    data: {
      label: companyName,
      description: tree.description || "Mục tiêu Doanh thu Tổng",
      budget: tree.revenue,
      type: "company",
      kpi: tree.kpis?.[0] || "Đạt mục tiêu doanh thu năm",
    },
    style: { zIndex: 10 },
  })

  // Children (quarters/departments)
  if (tree.children && tree.children.length > 0) {
    const childCount = tree.children.length
    const spacing = 300
    const startX = 400 - ((childCount - 1) * spacing) / 2

    tree.children.forEach((child, i) => {
      const nodeType = departmentToType(child.department)
      const color = TYPE_COLORS[nodeType] || "#3b82f6"

      nodes.push({
        id: child.id,
        type: "glass",
        position: { x: startX + i * spacing, y: 220 },
        data: {
          label: child.title,
          description: child.description,
          budget: child.revenue,
          type: nodeType,
          kpi: child.kpis?.[0] || "",
        },
      })

      edges.push({
        id: `e-${tree.id}-${child.id}`,
        source: tree.id,
        target: child.id,
        animated: true,
        style: { ...edgeStyle(color), opacity: 0.8 },
      })

      // Grandchildren (months/weeks if expanded)
      if (child.children && child.children.length > 0) {
        const gcSpacing = 260
        const gcStartX = (startX + i * spacing) - ((child.children.length - 1) * gcSpacing) / 2

        child.children.forEach((gc, j) => {
          const gcType = departmentToType(gc.department)
          const gcColor = TYPE_COLORS[gcType] || "#3b82f6"

          nodes.push({
            id: gc.id,
            type: "glass",
            position: { x: gcStartX + j * gcSpacing, y: 460 },
            data: {
              label: gc.title,
              description: gc.description,
              budget: gc.revenue,
              type: gcType,
              kpi: gc.kpis?.[0] || "",
            },
          })

          edges.push({
            id: `e-${child.id}-${gc.id}`,
            source: child.id,
            target: gc.id,
            type: "smoothstep",
            style: { ...edgeStyle(gcColor), opacity: 0.4 },
          })
        })
      }
    })
  }

  return { nodes, edges }
}

export function MindmapView() {
  const { activeRoadmap } = useAppContext()

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!activeRoadmap) {
      return { initialNodes: [], initialEdges: [] }
    }
    const { nodes, edges } = buildNodesAndEdges(activeRoadmap.tree, activeRoadmap.company.companyName)
    return { initialNodes: nodes, initialEdges: edges }
  }, [activeRoadmap])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Fallback: No roadmap data
  if (!activeRoadmap) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center space-y-3">
          <MapPin className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Chưa có dữ liệu Roadmap</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Hãy tạo AI Roadmap trước để xem sơ đồ tư duy. Roadmap sẽ được hiển thị dạng cây phân cấp trực quan.
          </p>
        </div>
        <Link href="/erp/plan">
          <Button className="gap-2 font-semibold">
            <MapPin className="w-4 h-4" /> Tạo AI Roadmap
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full relative flex flex-col -m-4 sm:-m-6 lg:-m-8" style={{ height: "calc(100vh - 64px)" }}>
      <div className="absolute top-4 left-4 md:left-6 z-50">
        <Link href="/erp/plan/view">
          <Button variant="outline" size="sm" className="gap-2 bg-card/90 backdrop-blur-xl shadow-lg border-border font-bold">
            <ArrowLeft className="w-4 h-4" /> Quay lại Kế hoạch
          </Button>
        </Link>
      </div>
      
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
          className="bg-transparent"
        >
          <Background color="#cbd5e1" gap={24} size={1.5} />
          <Controls />
          <MiniMap
            nodeColor={(n: any) => {
              const colorMap: Record<string, string> = { company: "#3b82f6", sales: "#3b82f6", marketing: "#8b5cf6", product: "#10b981", admin: "#f59e0b" }
              return colorMap[n.data?.type] || "#94a3b8"
            }}
            maskColor="rgba(248, 250, 252, 0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
