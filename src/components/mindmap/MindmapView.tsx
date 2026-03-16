/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useCallback } from "react"
import { useSearchParams } from "next/navigation"
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
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const nodeTypes: NodeTypes = {
  glass: GlassNode,
}

export function MindmapView() {
  const searchParams = useSearchParams()
  const company = searchParams.get("company") || "Doanh nghiệp của bạn"
  const revenueStr = searchParams.get("revenue") || "1000000000"
  const revenue = parseInt(revenueStr, 10)

  const salesBudget = Math.round(revenue * 0.4)
  const marketingBudget = Math.round(revenue * 0.3)
  const productBudget = Math.round(revenue * 0.2)
  const adminBudget = Math.round(revenue * 0.1)

  const initialNodes = [
    {
      id: "master", type: "glass", position: { x: 400, y: 0 },
      data: { label: company, description: "Mục tiêu Doanh thu Tổng", budget: revenue, type: "company", kpi: "Đạt mục tiêu doanh thu năm" },
      style: { zIndex: 10 }
    },
    {
      id: "sales", type: "glass", position: { x: 0, y: 220 },
      data: { label: "Kinh doanh & Doanh thu", description: "Bộ máy Doanh thu", budget: salesBudget, type: "sales", headcount: Math.max(1, Math.round(salesBudget / 20000000)), kpi: "Chốt 20 hợp đồng lớn" },
    },
    {
      id: "marketing", type: "glass", position: { x: 300, y: 220 },
      data: { label: "Marketing", description: "Tạo nhu cầu & Lead", budget: marketingBudget, type: "marketing", headcount: Math.max(1, Math.round(marketingBudget / 18000000)), kpi: "Tạo 500 lead chất lượng" },
    },
    {
      id: "product", type: "glass", position: { x: 600, y: 220 },
      data: { label: "Sản phẩm & Kỹ thuật", description: "Nền tảng Công nghệ", budget: productBudget, type: "product", headcount: Math.max(1, Math.round(productBudget / 25000000)), kpi: "Ra mắt tính năng V2" },
    },
    {
      id: "admin", type: "glass", position: { x: 900, y: 220 },
      data: { label: "Hành chính & Vận hành", description: "Vận hành nội bộ", budget: adminBudget, type: "admin", headcount: Math.max(1, Math.round(adminBudget / 15000000)), kpi: "Giảm chi phí 15%" },
    },
    {
      id: "sales-sdr", type: "glass", position: { x: -80, y: 460 },
      data: { label: "Đội Tìm kiếm KH", description: "Tiếp cận Khách hàng mới", budget: Math.round(salesBudget * 0.3), type: "sales", kpi: "Đạt 100 cuộc hẹn" },
    },
    {
      id: "sales-ae", type: "glass", position: { x: 200, y: 460 },
      data: { label: "Đội Chốt Deal", description: "Đàm phán & Ký hợp đồng", budget: Math.round(salesBudget * 0.7), type: "sales", kpi: "Tỷ lệ chốt > 20%" },
    },
  ]

  const edgeStyle = (color: string) => ({ stroke: color, strokeWidth: 2 })

  const initialEdges: Edge[] = [
    { id: "e-master-sales", source: "master", target: "sales", animated: true, style: { ...edgeStyle("#3b82f6"), opacity: 0.8 } },
    { id: "e-master-marketing", source: "master", target: "marketing", animated: true, style: { ...edgeStyle("#8b5cf6"), opacity: 0.8 } },
    { id: "e-master-product", source: "master", target: "product", animated: true, style: { ...edgeStyle("#10b981"), opacity: 0.8 } },
    { id: "e-master-admin", source: "master", target: "admin", animated: true, style: { ...edgeStyle("#f59e0b"), opacity: 0.8 } },
    { id: "e-sales-sdr", source: "sales", target: "sales-sdr", type: "smoothstep", style: { ...edgeStyle("#3b82f6"), opacity: 0.4 } },
    { id: "e-sales-ae", source: "sales", target: "sales-ae", type: "smoothstep", style: { ...edgeStyle("#3b82f6"), opacity: 0.4 } },
  ]

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className="w-full relative flex flex-col -m-4 sm:-m-6 lg:-m-8" style={{ height: "calc(100vh - 64px)" }}>
      <div className="absolute top-4 left-4 md:left-6 z-50">
        <Link href={`/erp/plan/view?company=${encodeURIComponent(company)}&revenue=${revenue}&objective=${encodeURIComponent(searchParams.get("objective") || "")}`}>
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
