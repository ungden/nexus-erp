"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RoadmapNode, Roadmap, LEVEL_ICONS, LEVEL_LABELS } from "@/lib/roadmap-types"
import { CashflowBar } from "./CashflowBar"
import { 
  GitBranchPlus, RefreshCw, ChevronRight, ChevronDown, 
  Target, Calendar, Users, Briefcase, ArrowRight, TrendingUp,
  LayoutDashboard, KanbanSquare, TrendingDown
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { useAppContext } from "@/context/AppContext"
import { formatVND } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Props {
  roadmap: Roadmap;
  onUpdate: (roadmap: Roadmap) => void;
}

const NavNode = ({ 
  node, 
  activeId, 
  onSelect, 
  onToggle 
}: { 
  node: RoadmapNode, 
  activeId: string, 
  onSelect: (id: string) => void,
  onToggle: (id: string, e: React.MouseEvent) => void 
}) => {
  if (['day', 'task'].includes(node.level)) return null;
  const isActive = node.id === activeId;
  const hasChildren = node.children && node.children.length > 0;
  
  return (
    <div className="flex flex-col">
      <div 
        onClick={() => onSelect(node.id)}
        className={cn(
          "flex items-center gap-2 py-2 px-2.5 rounded-xl cursor-pointer transition-all duration-200 text-sm font-semibold select-none group",
          isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        <div 
          onClick={(e) => onToggle(node.id, e)}
          className={cn(
            "w-6 h-6 flex items-center justify-center shrink-0 rounded-md hover:bg-black/10 dark:hover:bg-white/20 transition-colors",
            isActive ? "text-primary-foreground/80 hover:text-primary-foreground" : ""
          )}
        >
          {node.isLoading ? (
            <span className={cn("w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin", isActive ? "border-primary-foreground" : "border-primary")} />
          ) : node.isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
        <span className="text-lg filter drop-shadow-sm">{LEVEL_ICONS[node.level]}</span>
        <span className="truncate flex-1">{node.title}</span>
      </div>
      
      <AnimatePresence>
        {node.isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pl-5 ml-4 border-l-2 border-border/50 flex flex-col gap-1 mt-1 overflow-hidden"
          >
            {node.children!.map(child => (
              <NavNode key={child.id} node={child} activeId={activeId} onSelect={onSelect} onToggle={onToggle} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const SwimlaneBoard = ({ weekNode }: { weekNode: RoadmapNode }) => {
  const days = weekNode.children || [];
  
  // Extract all unique assignees and departments from all tasks across all days
  const rowKeys = new Set<string>();
  const rowLabels = new Map<string, { type: 'assignee' | 'department', label: string }>();

  days.forEach(day => {
    const tasks = day.children || [];
    tasks.forEach(task => {
      const assignee = task.assigneeName;
      const dept = task.department;
      if (assignee) {
        rowKeys.add(`assignee:${assignee}`);
        rowLabels.set(`assignee:${assignee}`, { type: 'assignee', label: assignee });
      } else if (dept) {
        rowKeys.add(`dept:${dept}`);
        rowLabels.set(`dept:${dept}`, { type: 'department', label: dept });
      } else {
        rowKeys.add(`unassigned:unassigned`);
        rowLabels.set(`unassigned:unassigned`, { type: 'department', label: 'Chưa giao' });
      }
    });
  });

  const rows = Array.from(rowKeys);

  if (days.length === 0) {
    return <div className="p-8 text-center text-muted-foreground border rounded-3xl bg-muted/10">Chưa có dữ liệu ngày cho tuần này.</div>
  }

  return (
    <div className="overflow-x-auto pb-4 custom-scrollbar">
      <div className="min-w-max border rounded-3xl overflow-hidden bg-card/40 backdrop-blur-xl shadow-sm">
        {/* Header Row (Days) */}
        <div className="flex border-b bg-muted/30">
          <div className="w-56 shrink-0 border-r p-4 font-extrabold text-muted-foreground uppercase tracking-widest text-xs flex items-center bg-muted/10">
            Nhân sự / Phòng ban
          </div>
          {days.map(day => (
            <div key={day.id} className="w-80 shrink-0 border-r last:border-r-0 p-4">
              <div className="font-bold text-foreground text-center tracking-tight text-lg">{day.title}</div>
            </div>
          ))}
        </div>
        
        {/* Swimlanes */}
        {rows.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground font-medium">Không có công việc nào trong tuần này.</div>
        ) : rows.map(rowKey => {
          const { type, label } = rowLabels.get(rowKey)!;
          return (
            <div key={rowKey} className="flex border-b last:border-b-0 group/row hover:bg-muted/10 transition-colors">
              {/* Row Header */}
              <div className="w-56 shrink-0 border-r p-4 bg-muted/5 flex flex-col justify-center">
                <div className="font-bold text-sm text-foreground flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0",
                    type === 'assignee' ? "bg-blue-500" : "bg-orange-500"
                  )}>
                    {type === 'assignee' ? <Users className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                  </div>
                  <span className="truncate">{label}</span>
                </div>
              </div>
              
              {/* Cells */}
              {days.map(day => {
                const tasks = day.children || [];
                const cellTasks = tasks.filter(task => {
                  if (type === 'assignee') return task.assigneeName === label;
                  if (type === 'department') return task.department === label && !task.assigneeName;
                  return !task.assigneeName && !task.department;
                });
                
                return (
                  <div key={`${rowKey}-${day.id}`} className="w-80 shrink-0 border-r last:border-r-0 p-3 flex flex-col gap-3 min-h-[160px]">
                    {cellTasks.map(task => (
                      <div key={task.id} className="p-4 rounded-2xl border bg-background/80 backdrop-blur-sm hover:bg-background hover:border-primary/50 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all relative group cursor-pointer">
                        <div className="font-bold text-sm mb-3 text-foreground group-hover:text-primary transition-colors leading-relaxed">{task.title}</div>
                        {task.personalKPI && (
                          <div className="text-xs text-muted-foreground flex items-start gap-2 mb-4 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                            <Target className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                            <span className="line-clamp-2 leading-relaxed font-medium">{task.personalKPI}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-auto">
                          {task.bonusAmount ? (
                            <div className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 inline-flex items-center px-2.5 py-1 rounded-full shadow-sm tracking-wide">
                              +{formatVND(task.bonusAmount, 'full')}
                            </div>
                          ) : <div />}
                          {task.startDate && (
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(task.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {cellTasks.length === 0 && (
                      <div className="h-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-2 border-dashed border-border rounded-xl px-4 py-2 bg-muted/10 hover:bg-muted/30 cursor-pointer transition-colors">
                          + Thêm việc
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const DashboardView = ({ node, onDrillDown }: { node: RoadmapNode, onDrillDown: (id: string) => void }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="p-6 md:p-8 rounded-3xl border bg-card/40 backdrop-blur-xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 relative">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl filter drop-shadow-sm">{LEVEL_ICONS[node.level]}</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-widest shadow-sm">
                {LEVEL_LABELS[node.level]}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{node.title}</h2>
          </div>
          {node.theme && (
            <div className="md:text-right max-w-sm shrink-0 bg-background/60 p-4 rounded-2xl border shadow-sm backdrop-blur-sm">
              <div className="text-xs font-extrabold text-primary uppercase tracking-widest mb-1.5 flex items-center md:justify-end gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                CEO Theme
              </div>
              <div className="text-sm font-semibold italic text-foreground leading-relaxed">&quot;{node.theme}&quot;</div>
            </div>
          )}
        </div>
        
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed max-w-4xl">{node.description}</p>
        
        <div className="mb-8">
          <CashflowBar revenue={node.revenue} expense={node.expense} cashflow={node.cashflow} status={node.cashflowStatus} />
        </div>

        {node.kpis && node.kpis.length > 0 && (
          <div className="bg-background/40 p-5 rounded-2xl border">
            <h3 className="text-sm font-extrabold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Target className="w-4 h-4 text-primary" /> Mục tiêu trọng điểm
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {node.kpis.map((kpi, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-background p-3.5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-primary text-xs font-bold">{idx + 1}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground leading-relaxed">{kpi}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Children Grid */}
      {node.children && node.children.length > 0 && (
        <div>
          <h3 className="text-xl font-extrabold mb-5 flex items-center gap-2 text-foreground tracking-tight">
            <GitBranchPlus className="w-5 h-5 text-primary" />
            Chi tiết {node.level === 'year' ? 'các Quý' : node.level === 'quarter' ? 'các Tháng' : 'các Tuần'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {node.children.map(child => (
              <div key={child.id} className="p-6 rounded-3xl border bg-card/60 backdrop-blur-sm hover:bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-xl font-bold group-hover:text-primary transition-colors flex items-center gap-2.5 tracking-tight">
                      <span className="text-2xl filter drop-shadow-sm">{LEVEL_ICONS[child.level]}</span> {child.title}
                    </h4>
                    <span className={cn(
                      "text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider",
                      child.cashflowStatus === 'healthy' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                      child.cashflowStatus === 'warning' ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-red-100 text-red-700 border border-red-200"
                    )}>
                      {child.cashflowStatus === 'healthy' ? 'Tốt' : child.cashflowStatus === 'warning' ? 'Cảnh báo' : 'Nguy hiểm'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 leading-relaxed">{child.description}</p>
                </div>
                
                <div className="flex items-center justify-between mt-auto p-4 rounded-2xl bg-background/50 border group-hover:border-primary/20 transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> Doanh thu</span>
                    <span className="font-extrabold text-foreground text-base">{formatVND(child.revenue, 'short')}</span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col gap-1 text-right items-end">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">Chi phí <TrendingDown className="w-3 h-3 text-red-500" /></span>
                    <span className="font-extrabold text-foreground text-base">{formatVND(child.expense, 'short')}</span>
                  </div>
                </div>

                <Button 
                  className="w-full mt-5 justify-between group/btn bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md hover:shadow-lg transition-all rounded-xl py-6"
                  onClick={() => onDrillDown(child.id)}
                >
                  <span className="flex items-center gap-2 text-base">
                    Xem chi tiết <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform" />
                  </span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function RoadmapTree({ roadmap, onUpdate }: Props) {
  const { employees } = useAppContext();
  const tree = roadmap.tree;
  const [activeNodeId, setActiveNodeId] = useState<string>(tree.id);

  // Helper functions
  function updateNodeInTree(root: RoadmapNode, nodeId: string, updater: (node: RoadmapNode) => RoadmapNode): RoadmapNode {
    if (root.id === nodeId) return updater(root);
    if (!root.children) return root;
    return {
      ...root,
      children: root.children.map(child => updateNodeInTree(child, nodeId, updater)),
    };
  }

  function findNode(root: RoadmapNode, id: string): RoadmapNode | null {
    if (root.id === id) return root;
    if (!root.children) return null;
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  // Count total expanded nodes
  function countNodes(root: RoadmapNode): number {
    let count = 1;
    if (root.children) {
      for (const child of root.children) {
        count += countNodes(child);
      }
    }
    return count;
  }

  const totalNodes = countNodes(tree);

  async function expandNode(nodeId: string) {
    const node = findNode(tree, nodeId);
    if (!node || ['task', 'day'].includes(node.level)) return;

    if (node.children && node.children.length > 0) {
      if (!node.isExpanded) {
        const newTree = updateNodeInTree(tree, nodeId, n => ({ ...n, isExpanded: true }));
        onUpdate({ ...roadmap, tree: newTree });
      }
      return;
    }

    const loadingTree = updateNodeInTree(tree, nodeId, n => ({ ...n, isLoading: true }));
    onUpdate({ ...roadmap, tree: loadingTree });

    try {
      const res = await fetch('/api/roadmap/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node, profile: roadmap.company, board: roadmap.board, employees }),
      });
      const data = await res.json();
      
      const expandedTree = updateNodeInTree(tree, nodeId, n => ({
        ...n,
        children: data.children,
        isExpanded: true,
        isLoading: false,
      }));
      onUpdate({ ...roadmap, tree: expandedTree });
    } catch {
      const errorTree = updateNodeInTree(tree, nodeId, n => ({ ...n, isLoading: false }));
      onUpdate({ ...roadmap, tree: errorTree });
    }
  }

  const handleSelectNode = async (nodeId: string) => {
    setActiveNodeId(nodeId);
    await expandNode(nodeId);
  }

  const toggleExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = findNode(tree, nodeId);
    if (!node) return;
    if (node.children && node.children.length > 0) {
      const newTree = updateNodeInTree(tree, nodeId, n => ({ ...n, isExpanded: !n.isExpanded }));
      onUpdate({ ...roadmap, tree: newTree });
    } else {
      expandNode(nodeId);
    }
  }

  const activeNode = findNode(tree, activeNodeId) || tree;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              AI Roadmap
            </span>
            <span className="text-[12px] text-muted-foreground font-semibold bg-muted/50 px-3 py-1.5 rounded-full">
              {totalNodes} mục · Split View
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            {tree.title}
          </h1>
          <p className="text-base text-muted-foreground mt-2 max-w-2xl">{tree.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/erp/plan/mindmap">
            <Button variant="outline" size="default" className="gap-2 font-bold text-foreground rounded-xl shadow-sm">
              <GitBranchPlus className="w-4 h-4" /> Sơ đồ tư duy
            </Button>
          </Link>
          <Link href="/erp/plan">
            <Button variant="outline" size="default" className="gap-2 font-bold text-foreground rounded-xl shadow-sm">
              <RefreshCw className="w-4 h-4" /> Tạo mới
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="flex flex-col xl:flex-row gap-6 items-start mt-8">
        {/* Left Sidebar (Navigation Tree) */}
        <div className="w-full xl:w-[340px] shrink-0 border rounded-3xl bg-card/40 backdrop-blur-xl shadow-sm flex flex-col xl:sticky xl:top-6 xl:max-h-[calc(100vh-6rem)] overflow-hidden">
          <div className="p-5 border-b bg-muted/20 font-extrabold flex items-center gap-2.5 text-foreground uppercase tracking-widest text-xs">
            <LayoutDashboard className="w-4 h-4 text-primary" /> Cây chiến lược
          </div>
          <div className="p-4 overflow-y-auto custom-scrollbar xl:flex-1">
            <NavNode 
              node={tree} 
              activeId={activeNodeId} 
              onSelect={handleSelectNode} 
              onToggle={toggleExpand} 
            />
          </div>
        </div>

        {/* Right Main Panel */}
        <div className="flex-1 w-full min-w-0">
          {activeNode.level === 'week' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start gap-4 mb-2 p-6 rounded-3xl border bg-card/40 backdrop-blur-xl shadow-sm">
                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0 mt-1">
                  <KanbanSquare className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">{activeNode.title}</h2>
                  <p className="text-muted-foreground text-base leading-relaxed">{activeNode.description}</p>
                </div>
              </div>
              <SwimlaneBoard weekNode={activeNode} />
            </div>
          ) : (
            <DashboardView node={activeNode} onDrillDown={handleSelectNode} />
          )}
        </div>
      </div>
    </div>
  )
}
