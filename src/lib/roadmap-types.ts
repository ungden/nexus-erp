// ============================================================
// Roadmap Data Model — Cấu trúc cây phân cấp drill-down
// Năm → Quý → Tháng → Tuần → Task
// ============================================================

export type RoadmapLevel = 'year' | 'quarter' | 'month' | 'week' | 'task';
export type CashflowStatus = 'healthy' | 'warning' | 'danger';

export interface RoadmapNode {
  id: string;
  level: RoadmapLevel;
  title: string;
  description: string;
  department?: string;
  revenue: number;
  expense: number;
  cashflow: number;
  cashflowStatus: CashflowStatus;
  kpis: string[];
  children?: RoadmapNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

export interface CompanyProfile {
  companyName: string;
  industry: string;
  objective: string;
  revenue: number;
  headcount: number;
  fixedCost: number;
  products: string;
}

export interface Roadmap {
  company: CompanyProfile;
  tree: RoadmapNode;
  generatedAt: string;
}

export function getCashflowStatus(revenue: number, expense: number): CashflowStatus {
  const margin = revenue > 0 ? (revenue - expense) / revenue : -1;
  if (margin >= 0.1) return 'healthy';
  if (margin >= 0) return 'warning';
  return 'danger';
}

export const LEVEL_LABELS: Record<RoadmapLevel, string> = {
  year: 'Năm',
  quarter: 'Quý',
  month: 'Tháng',
  week: 'Tuần',
  task: 'Công việc',
};

export const LEVEL_ICONS: Record<RoadmapLevel, string> = {
  year: '🏢',
  quarter: '📅',
  month: '📆',
  week: '📋',
  task: '☑',
};
