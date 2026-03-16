'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Roadmap } from '@/lib/roadmap-types';
import { supabase } from '@/lib/supabase';

// Types
export type Stage = 'Tiếp cận' | 'Đàm phán' | 'Chốt sale' | 'Thất bại';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';
export type KpiStatus = 'on-track' | 'at-risk' | 'behind';
export type CustomerType = 'B2B' | 'B2C';

export interface Deal {
  id: string;
  title: string;
  company: string;
  amount: number;
  stage: Stage;
  date: string;
  customerId?: string; // Link to Customer
}

export interface Task {
  id: string;
  title: string;
  assigneeId: number;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  department: string;
}

export interface Employee {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: string;
  joinDate: string;
  baseSalary: number;
  managerId: number | null;
}

export interface KPI {
  id: number;
  title: string;
  target: number;
  current: number;
  progress: number;
  status: KpiStatus;
  department: string;
}

export interface PayrollRecord {
  id: number;
  employeeId: number;
  month: string;
  base: number;
  commission: number;
  kpiBonus: number;
  deduction: number;
  total: number;
  status: 'Đã duyệt' | 'Chờ duyệt';
}

export interface Expense {
  id: number;
  title: string;
  amount: number;
  category: 'mkt' | 'ops' | 'cogs';
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  company?: string;       // For B2B
  taxId?: string;         // MST for B2B
  phone: string;
  email: string;
  address?: string;
  contactPerson?: string; // For B2B
  notes?: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  type: 'Đối tác' | 'Nhà cung cấp';
  contactPerson: string;
  phone: string;
  email: string;
  notes?: string;
  createdAt: string;
}

export interface Receivable {
  id: string;
  customerId: string;
  dealId: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'Chưa thu' | 'Thu một phần' | 'Đã thu đủ' | 'Quá hạn';
}

export interface Payable {
  id: string;
  partnerId: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  description: string;
  status: 'Chưa trả' | 'Trả một phần' | 'Đã trả đủ' | 'Quá hạn';
}

interface AppState {
  deals: Deal[];
  setDeals: React.Dispatch<React.SetStateAction<Deal[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  kpis: KPI[];
  setKpis: React.Dispatch<React.SetStateAction<KPI[]>>;
  payrolls: PayrollRecord[];
  setPayrolls: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  finance: {
    targetRevenue: number;
    allocations: { cogs: number; hr: number; mkt: number; ops: number; profit: number };
  };
  setFinance: React.Dispatch<React.SetStateAction<AppState['finance']>>;
  roadmap: Roadmap | null;
  setRoadmap: (roadmap: Roadmap | null) => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  receivables: Receivable[];
  setReceivables: React.Dispatch<React.SetStateAction<Receivable[]>>;
  payables: Payable[];
  setPayables: React.Dispatch<React.SetStateAction<Payable[]>>;
  isLoading: boolean;
}

// ─── DB ↔ TS Mappers ─────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapEmployee(row: any): Employee {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    email: row.email,
    phone: row.phone,
    status: row.status,
    joinDate: row.join_date,
    baseSalary: row.base_salary,
    managerId: row.manager_id,
  };
}

function toDbEmployee(emp: Employee): Record<string, unknown> {
  return {
    id: emp.id,
    name: emp.name,
    role: emp.role,
    department: emp.department,
    email: emp.email,
    phone: emp.phone,
    status: emp.status,
    join_date: emp.joinDate,
    base_salary: emp.baseSalary,
    manager_id: emp.managerId,
  };
}

function mapDeal(row: any): Deal {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    amount: row.amount,
    stage: row.stage,
    date: row.date,
    customerId: row.customer_id ?? undefined,
  };
}

function toDbDeal(d: Deal): Record<string, unknown> {
  return {
    id: d.id,
    title: d.title,
    company: d.company,
    amount: d.amount,
    stage: d.stage,
    date: d.date,
    customer_id: d.customerId ?? null,
  };
}

function mapTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    department: row.department,
  };
}

function toDbTask(t: Task): Record<string, unknown> {
  return {
    id: t.id,
    title: t.title,
    assignee_id: t.assigneeId,
    due_date: t.dueDate,
    priority: t.priority,
    status: t.status,
    department: t.department,
  };
}

function mapKpi(row: any): KPI {
  return {
    id: row.id,
    title: row.title,
    target: row.target,
    current: row.current,
    progress: row.progress,
    status: row.status,
    department: row.department,
  };
}

function toDbKpi(k: KPI): Record<string, unknown> {
  return {
    id: k.id,
    title: k.title,
    target: k.target,
    current: k.current,
    progress: k.progress,
    status: k.status,
    department: k.department,
  };
}

function mapPayroll(row: any): PayrollRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    month: row.month,
    base: row.base,
    commission: row.commission,
    kpiBonus: row.kpi_bonus,
    deduction: row.deduction,
    total: row.total,
    status: row.status,
  };
}

function toDbPayroll(p: PayrollRecord): Record<string, unknown> {
  return {
    id: p.id,
    employee_id: p.employeeId,
    month: p.month,
    base: p.base,
    commission: p.commission,
    kpi_bonus: p.kpiBonus,
    deduction: p.deduction,
    total: p.total,
    status: p.status,
  };
}

function mapExpense(row: any): Expense {
  return {
    id: row.id,
    title: row.title,
    amount: row.amount,
    category: row.category,
    date: row.date,
  };
}

function toDbExpense(e: Expense): Record<string, unknown> {
  return {
    id: e.id,
    title: e.title,
    amount: e.amount,
    category: e.category,
    date: e.date,
  };
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    company: row.company ?? undefined,
    taxId: row.tax_id ?? undefined,
    phone: row.phone,
    email: row.email,
    address: row.address ?? undefined,
    contactPerson: row.contact_person ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function toDbCustomer(c: Customer): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    company: c.company ?? null,
    tax_id: c.taxId ?? null,
    phone: c.phone,
    email: c.email,
    address: c.address ?? null,
    contact_person: c.contactPerson ?? null,
    notes: c.notes ?? null,
    created_at: c.createdAt,
  };
}

function mapPartner(row: any): Partner {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function toDbPartner(p: Partner): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    contact_person: p.contactPerson,
    phone: p.phone,
    email: p.email,
    notes: p.notes ?? null,
    created_at: p.createdAt,
  };
}

function mapReceivable(row: any): Receivable {
  return {
    id: row.id,
    customerId: row.customer_id,
    dealId: row.deal_id,
    amount: row.amount,
    paidAmount: row.paid_amount,
    dueDate: row.due_date,
    status: row.status,
  };
}

function toDbReceivable(r: Receivable): Record<string, unknown> {
  return {
    id: r.id,
    customer_id: r.customerId,
    deal_id: r.dealId,
    amount: r.amount,
    paid_amount: r.paidAmount,
    due_date: r.dueDate,
    status: r.status,
  };
}

function mapPayable(row: any): Payable {
  return {
    id: row.id,
    partnerId: row.partner_id,
    amount: row.amount,
    paidAmount: row.paid_amount,
    dueDate: row.due_date,
    description: row.description,
    status: row.status,
  };
}

function toDbPayable(p: Payable): Record<string, unknown> {
  return {
    id: p.id,
    partner_id: p.partnerId,
    amount: p.amount,
    paid_amount: p.paidAmount,
    due_date: p.dueDate,
    description: p.description,
    status: p.status,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Supabase sync helper ────────────────────────────────────

async function syncToSupabase(table: string, rows: Record<string, unknown>[]) {
  // Delete all existing rows, then upsert the current state
  await supabase.from(table).delete().neq('id', -999);
  if (rows.length > 0) {
    await supabase.from(table).upsert(rows);
  }
}

// ─── Default finance state ───────────────────────────────────

const defaultFinance: AppState['finance'] = {
  targetRevenue: 0,
  allocations: { cogs: 0, hr: 0, mkt: 0, ops: 0, profit: 0 },
};

// ─── Context ─────────────────────────────────────────────────

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // isLoaded gates sync-to-DB effects so they don't fire during initial fetch
  const isLoaded = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [finance, setFinance] = useState<AppState['finance']>(defaultFinance);
  const [roadmap, setRoadmapState] = useState<Roadmap | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);

  // ── Load everything from Supabase on mount ──────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const [
        { data: empRows },
        { data: dealRows },
        { data: taskRows },
        { data: kpiRows },
        { data: payrollRows },
        { data: expenseRows },
        { data: customerRows },
        { data: partnerRows },
        { data: receivableRows },
        { data: payableRows },
        { data: financeRows },
        { data: roadmapRows },
      ] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('deals').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('kpis').select('*'),
        supabase.from('payrolls').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('partners').select('*'),
        supabase.from('receivables').select('*'),
        supabase.from('payables').select('*'),
        supabase.from('finance_settings').select('*').eq('id', 1),
        supabase.from('roadmaps').select('*').eq('id', 1),
      ]);

      if (cancelled) return;

      setEmployees(empRows?.map(mapEmployee) ?? []);
      setDeals(dealRows?.map(mapDeal) ?? []);
      setTasks(taskRows?.map(mapTask) ?? []);
      setKpis(kpiRows?.map(mapKpi) ?? []);
      setPayrolls(payrollRows?.map(mapPayroll) ?? []);
      setExpenses(expenseRows?.map(mapExpense) ?? []);
      setCustomers(customerRows?.map(mapCustomer) ?? []);
      setPartners(partnerRows?.map(mapPartner) ?? []);
      setReceivables(receivableRows?.map(mapReceivable) ?? []);
      setPayables(payableRows?.map(mapPayable) ?? []);

      // Finance settings (single row)
      if (financeRows && financeRows.length > 0) {
        const f = financeRows[0];
        setFinance({
          targetRevenue: f.target_revenue ?? 0,
          allocations: {
            cogs: f.alloc_cogs ?? 0,
            hr: f.alloc_hr ?? 0,
            mkt: f.alloc_mkt ?? 0,
            ops: f.alloc_ops ?? 0,
            profit: f.alloc_profit ?? 0,
          },
        });
      }

      // Roadmap (single JSONB row)
      if (roadmapRows && roadmapRows.length > 0 && roadmapRows[0].data) {
        setRoadmapState(roadmapRows[0].data as Roadmap);
      }

      // Mark loaded — enables sync-to-DB effects
      isLoaded.current = true;
      setIsLoading(false);
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // ── Sync state → Supabase on every change (after initial load) ──

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('employees', employees.map(toDbEmployee));
  }, [employees]);

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('deals', deals.map(toDbDeal));
  }, [deals]);

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('tasks', tasks.map(toDbTask));
  }, [tasks]);

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('kpis', kpis.map(toDbKpi));
  }, [kpis]);

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('payrolls', payrolls.map(toDbPayroll));
  }, [payrolls]);

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('expenses', expenses.map(toDbExpense));
  }, [expenses]);

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('customers', customers.map(toDbCustomer));
  }, [customers]);

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('partners', partners.map(toDbPartner));
  }, [partners]);

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('receivables', receivables.map(toDbReceivable));
  }, [receivables]);

  useEffect(() => {
    if (!isLoaded.current) return;
    syncToSupabase('payables', payables.map(toDbPayable));
  }, [payables]);

  useEffect(() => {
    if (!isLoaded.current) return;
    supabase.from('finance_settings').upsert({
      id: 1,
      target_revenue: finance.targetRevenue,
      alloc_cogs: finance.allocations.cogs,
      alloc_hr: finance.allocations.hr,
      alloc_mkt: finance.allocations.mkt,
      alloc_ops: finance.allocations.ops,
      alloc_profit: finance.allocations.profit,
    });
  }, [finance]);

  useEffect(() => {
    if (!isLoaded.current) return;
    if (roadmap) {
      supabase.from('roadmaps').upsert({
        id: 1,
        data: roadmap,
        updated_at: new Date().toISOString(),
      });
    } else {
      supabase.from('roadmaps').delete().eq('id', 1);
    }
  }, [roadmap]);

  // ── Roadmap setter (maintains same API) ─────────────────────
  const setRoadmap = (rm: Roadmap | null) => setRoadmapState(rm);

  return (
    <AppContext.Provider value={{
      deals, setDeals,
      tasks, setTasks,
      employees, setEmployees,
      kpis, setKpis,
      payrolls, setPayrolls,
      expenses, setExpenses,
      finance, setFinance,
      roadmap, setRoadmap,
      customers, setCustomers,
      partners, setPartners,
      receivables, setReceivables,
      payables, setPayables,
      isLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
