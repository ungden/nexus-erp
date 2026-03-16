"use client"

import { motion } from "framer-motion"
import { RoadmapNode, Roadmap } from "@/lib/roadmap-types"
import { RoadmapNodeCard } from "./RoadmapNodeCard"
import { CashflowBar } from "./CashflowBar"
import { GitBranchPlus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { useAppContext } from "@/context/AppContext"

interface Props {
  roadmap: Roadmap;
  onUpdate: (roadmap: Roadmap) => void;
}

export function RoadmapTree({ roadmap, onUpdate }: Props) {
  const { employees } = useAppContext();
  const tree = roadmap.tree;

  // Recursive function to find and update a node in the tree
  function updateNodeInTree(root: RoadmapNode, nodeId: string, updater: (node: RoadmapNode) => RoadmapNode): RoadmapNode {
    if (root.id === nodeId) return updater(root);
    if (!root.children) return root;
    return {
      ...root,
      children: root.children.map(child => updateNodeInTree(child, nodeId, updater)),
    };
  }

  async function handleExpand(nodeId: string) {
    // Find the node
    const node = findNode(tree, nodeId);
    if (!node) return;

    // If already has children, toggle expand
    if (node.children && node.children.length > 0) {
      const newTree = updateNodeInTree(tree, nodeId, n => ({
        ...n,
        isExpanded: !n.isExpanded,
      }));
      onUpdate({ ...roadmap, tree: newTree });
      return;
    }

    // Task level has no children
    if (node.level === 'task') return;

    // Set loading
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
    } finally {
      // done
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              AI Roadmap
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              {totalNodes} mục · Click để drill-down
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
            {tree.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{tree.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/erp/plan/mindmap">
            <Button variant="outline" size="sm" className="gap-2 font-semibold text-foreground">
              <GitBranchPlus className="w-3.5 h-3.5" /> Sơ đồ tư duy
            </Button>
          </Link>
          <Link href="/erp/plan">
            <Button variant="outline" size="sm" className="gap-2 font-semibold text-foreground">
              <RefreshCw className="w-3.5 h-3.5" /> Tạo mới
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Overall Cashflow Bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <CashflowBar
          revenue={tree.revenue}
          expense={tree.expense}
          cashflow={tree.cashflow}
          status={tree.cashflowStatus}
        />
      </motion.div>

      {/* Tree */}
      <div className="space-y-2">
        {tree.children?.map((child, i) => (
          <motion.div
            key={child.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
          >
            <RoadmapNodeCard
              node={child}
              depth={0}
              onExpand={handleExpand}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
