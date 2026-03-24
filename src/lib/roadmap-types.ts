// ============================================================
// NexusERP Roadmap — Data Models
// Quy trình: CFO → CEO → HR Director → Roadmap Drill-down
// Năm → Quý → Tháng → Tuần → Ngày → Task (gán nhân sự + KPI + thưởng)
// ============================================================

export type RoadmapLevel = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'task';
export type CashflowStatus = 'healthy' | 'warning' | 'danger';

// ---- AI Board of Directors ----

export interface BudgetLine {
  percent: number;
  amount: number;
  note: string;
}

export interface CFOAnalysis {
  feasibility: 'Khả thi' | 'Cần điều chỉnh' | 'Rủi ro cao';
  analysis: string;
  budgetAllocation: {
    cogs: BudgetLine;
    hr: BudgetLine;
    marketing: BudgetLine;
    operations: BudgetLine;
    profit: BudgetLine;
  };
  monthlyBurnRate: number;
  breakEvenMonth: number;
  risks: string[];
}

export interface QuarterGoal {
  quarter: number;
  theme: string;
  revenue: number;
  keyObjectives: string[];
  milestones: string[];
}

export interface CEOStrategy {
  vision: string;
  quarterlyGoals: QuarterGoal[];
  companyKPIs: string[];
  structuredKpis?: { id: number; title: string; target: number }[];
}

export interface DepartmentPlan {
  name: string;
  headcount: number;
  avgSalary: number;
  totalSalary: number;
  budgetPercent: number;
  description: string;
  keyRoles: string[];
}

export interface HiringPlanItem {
  quarter: number;
  newHires: number;
  departments: string[];
  priority: string;
}

export interface HRPlan {
  totalHeadcount: number;
  departments: DepartmentPlan[];
  monthlySalary: number;
  monthlyOpex: number;
  monthlyFixedCost: number;
  yearlyFixedCost: number;
  profitMargin: number;
  hiringPlan: HiringPlanItem[];
  compensationPolicy: string;
  kpiBonusPolicy: string;
  budgetUtilization?: number;   // % ngân sách HR đã sử dụng
  idealHeadcount?: number;      // Headcount lý tưởng trước khi bị constrain bởi budget
}

export interface BoardAnalysis {
  cfo: CFOAnalysis;
  ceo: CEOStrategy;
  hr: HRPlan;
}

// ---- Roadmap Node ----

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
  // Nhân sự & Thưởng (task level)
  assigneeId?: number;
  assigneeName?: string;
  personalKPI?: string;
  linkedKpiId?: number;
  kpiContribution?: number;
  bonusPercent?: number;   // % lương cơ bản
  bonusAmount?: number;    // Số tiền thưởng
  syncedToTasks?: boolean; // Đã đồng bộ sang ERP chưa
  // Thời gian
  startDate?: string;
  endDate?: string;
  // CEO context (quarter level)
  theme?: string;
  milestones?: string[];
  // Tree
  children?: RoadmapNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

// ---- Company Profile ----

export interface CompanyProfile {
  companyName: string;
  industry: string;
  objective: string;
  revenue: number;
  headcount: number;
  fixedCost: number;
  products: string;
  feedback?: string; // MỚI - Feedback từ user để AI điều chỉnh plan
}

// ---- Roadmap (top-level) ----

export interface Roadmap {
  id: string;          // MỚI: ID duy nhất của kịch bản
  name: string;        // MỚI: Tên kịch bản
  isActive: boolean;   // MỚI: Đây có phải là kịch bản chính đang được áp dụng cho ERP không?
  company: CompanyProfile;
  board: BoardAnalysis;
  tree: RoadmapNode;
  generatedAt: string;
}

// ---- Helpers ----

export function getCashflowStatus(revenue: number, expense: number): CashflowStatus {
  const margin = revenue > 0 ? (revenue - expense) / revenue : -1;
  if (margin >= 0.1) return 'healthy';
  if (margin >= 0) return 'warning';
  return 'danger';
}

export const LEVEL_LABELS: Record<RoadmapLevel, string> = {
  year: 'Năm', quarter: 'Quý', month: 'Tháng',
  week: 'Tuần', day: 'Ngày', task: 'Công việc',
};

export const LEVEL_ICONS: Record<RoadmapLevel, string> = {
  year: '🏢', quarter: '📅', month: '📆',
  week: '📋', day: '📌', task: '☑',
};
