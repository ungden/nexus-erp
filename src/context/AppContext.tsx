'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Roadmap } from '@/lib/roadmap-types';

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
}

const initialEmployees: Employee[] = [
  { id: 1, name: 'Nguyễn Văn A', role: 'Giám đốc (CEO)', department: 'Ban Giám đốc', email: 'a.nguyen@company.com', phone: '0901234567', status: 'Đang làm việc', joinDate: '01/01/2020', baseSalary: 50000000, managerId: null },
  { id: 2, name: 'Trần Thị B', role: 'Trưởng phòng Marketing', department: 'Marketing', email: 'b.tran@company.com', phone: '0912345678', status: 'Đang làm việc', joinDate: '15/03/2021', baseSalary: 30000000, managerId: 1 },
  { id: 3, name: 'Lê Văn C', role: 'Chuyên viên Nhân sự', department: 'HR', email: 'c.le@company.com', phone: '0923456789', status: 'Đang làm việc', joinDate: '10/05/2022', baseSalary: 15000000, managerId: 1 },
  { id: 4, name: 'Phạm Thị D', role: 'Kế toán trưởng', department: 'Finance', email: 'd.pham@company.com', phone: '0934567890', status: 'Đang làm việc', joinDate: '20/08/2019', baseSalary: 25000000, managerId: 1 },
  { id: 5, name: 'Hoàng Văn E', role: 'Lập trình viên', department: 'IT', email: 'e.hoang@company.com', phone: '0945678901', status: 'Đang làm việc', joinDate: '05/11/2023', baseSalary: 20000000, managerId: 1 },
  { id: 6, name: 'Đinh Thị F', role: 'Nhân viên Content', department: 'Marketing', email: 'f.dinh@company.com', phone: '0956789012', status: 'Đang làm việc', joinDate: '01/02/2024', baseSalary: 12000000, managerId: 2 },
];

const initialDeals: Deal[] = [
  { id: '1', title: 'Hợp đồng phần mềm ERP', company: 'Công ty TNHH ABC', amount: 150000000, stage: 'Tiếp cận', date: '12/10/2023', customerId: 'c1' },
  { id: '2', title: 'Tư vấn chiến lược Marketing', company: 'Tập đoàn XYZ', amount: 80000000, stage: 'Tiếp cận', date: '15/10/2023', customerId: 'c2' },
  { id: '3', title: 'Thiết kế Website E-commerce', company: 'Cửa hàng Thời trang M', amount: 45000000, stage: 'Đàm phán', date: '10/10/2023', customerId: 'c4' },
  { id: '4', title: 'Dịch vụ SEO tổng thể', company: 'Nha khoa Nụ Cười', amount: 120000000, stage: 'Chốt sale', date: '05/10/2023', customerId: 'c1' },
  { id: '5', title: 'Triển khai CRM', company: 'Công ty BĐS Hưng Thịnh', amount: 350000000, stage: 'Chốt sale', date: '01/10/2023', customerId: 'c2' },
];

const initialTasks: Task[] = [
  { id: '1', title: 'Chuẩn bị báo cáo tài chính Q3', assigneeId: 4, dueDate: '15/10/2023', priority: 'high', status: 'todo', department: 'Finance' },
  { id: '2', title: 'Gửi email marketing chiến dịch mới', assigneeId: 6, dueDate: '12/10/2023', priority: 'medium', status: 'in-progress', department: 'Marketing' },
  { id: '3', title: 'Phỏng vấn ứng viên Sales', assigneeId: 3, dueDate: '10/10/2023', priority: 'high', status: 'done', department: 'HR' },
];

const initialKpis: KPI[] = [
  { id: 1, title: 'Doanh thu Q4/2023', target: 5000000000, current: 3500000000, progress: 70, status: 'on-track', department: 'Sales' },
  { id: 2, title: 'Tỷ lệ chuyển đổi Lead', target: 25, current: 18, progress: 72, status: 'at-risk', department: 'Marketing' },
  { id: 3, title: 'Tuyển dụng nhân sự mới', target: 10, current: 8, progress: 80, status: 'on-track', department: 'HR' },
];

const initialPayrolls: PayrollRecord[] = [
  { id: 1, employeeId: 1, month: '10/2023', base: 50000000, commission: 15000000, kpiBonus: 5000000, deduction: 1000000, total: 69000000, status: 'Đã duyệt' },
  { id: 2, employeeId: 2, month: '10/2023', base: 30000000, commission: 0, kpiBonus: 3000000, deduction: 0, total: 33000000, status: 'Chờ duyệt' },
];

const initialExpenses: Expense[] = [
  { id: 1, title: 'Quảng cáo Facebook', amount: 50000000, category: 'mkt', date: '05/10/2023' },
  { id: 2, title: 'Sự kiện ra mắt sản phẩm', amount: 110000000, category: 'mkt', date: '12/10/2023' },
  { id: 3, title: 'Thuê văn phòng', amount: 30000000, category: 'ops', date: '01/10/2023' },
  { id: 4, title: 'Chi phí mua hàng', amount: 150000000, category: 'cogs', date: '02/10/2023' },
];

const initialCustomers: Customer[] = [
  { id: 'c1', name: 'Công ty TNHH ABC', type: 'B2B', company: 'Công ty TNHH ABC', taxId: '0123456789', phone: '028-1234-5678', email: 'info@abc.vn', contactPerson: 'Anh Minh', address: '123 Nguyễn Huệ, Q.1, TP.HCM', createdAt: '2024-01-15' },
  { id: 'c2', name: 'Tập đoàn XYZ', type: 'B2B', company: 'Tập đoàn XYZ', taxId: '9876543210', phone: '024-8765-4321', email: 'contact@xyz.com', contactPerson: 'Chị Lan', address: '456 Lý Thường Kiệt, Hà Nội', createdAt: '2024-02-20' },
  { id: 'c3', name: 'Nguyễn Thị Hoa', type: 'B2C', phone: '0901234567', email: 'hoa.nguyen@gmail.com', address: '789 Trần Hưng Đạo, Đà Nẵng', createdAt: '2024-03-10' },
  { id: 'c4', name: 'Cửa hàng Thời trang M', type: 'B2B', company: 'Cửa hàng Thời trang M', phone: '0912345678', email: 'info@fashionm.vn', contactPerson: 'Anh Tuấn', createdAt: '2024-04-05' },
  { id: 'c5', name: 'Trần Văn Nam', type: 'B2C', phone: '0987654321', email: 'nam.tran@yahoo.com', createdAt: '2024-05-18' },
];

const initialPartners: Partner[] = [
  { id: 'p1', name: 'Công ty TNHH Cung ứng Vật tư', type: 'Nhà cung cấp', contactPerson: 'Anh Đức', phone: '028-9999-8888', email: 'duc@vattu.vn', notes: 'NCC vật tư chính', createdAt: '2024-01-01' },
  { id: 'p2', name: 'Agency Marketing Pro', type: 'Đối tác', contactPerson: 'Chị Mai', phone: '0977-888-999', email: 'mai@mktpro.vn', notes: 'Đối tác marketing chiến lược', createdAt: '2024-02-15' },
];

const initialReceivables: Receivable[] = [
  { id: 'r1', customerId: 'c1', dealId: '4', amount: 120000000, paidAmount: 60000000, dueDate: '2024-12-31', status: 'Thu một phần' },
  { id: 'r2', customerId: 'c2', dealId: '5', amount: 350000000, paidAmount: 0, dueDate: '2024-11-30', status: 'Chưa thu' },
];

const initialPayables: Payable[] = [
  { id: 'pa1', partnerId: 'p1', amount: 150000000, paidAmount: 150000000, dueDate: '2024-10-15', description: 'Mua vật tư tháng 10', status: 'Đã trả đủ' },
  { id: 'pa2', partnerId: 'p1', amount: 80000000, paidAmount: 30000000, dueDate: '2024-12-01', description: 'Mua vật tư tháng 11', status: 'Trả một phần' },
];

const AppContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEY = 'nexus-erp-state';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY}-${key}`, JSON.stringify(value));
  } catch { /* quota exceeded — ignore */ }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [deals, setDeals] = useState<Deal[]>(() => loadFromStorage('deals', initialDeals));
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage('tasks', initialTasks));
  const [employees, setEmployees] = useState<Employee[]>(() => loadFromStorage('employees', initialEmployees));
  const [kpis, setKpis] = useState<KPI[]>(() => loadFromStorage('kpis', initialKpis));
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>(() => loadFromStorage('payrolls', initialPayrolls));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadFromStorage('expenses', initialExpenses));
  const [finance, setFinance] = useState(() => loadFromStorage('finance', {
    targetRevenue: 1000000000,
    allocations: { cogs: 30, hr: 25, mkt: 15, ops: 10, profit: 20 }
  }));
  const [roadmap, setRoadmapState] = useState<Roadmap | null>(() => loadFromStorage('roadmap', null));
  const [customers, setCustomers] = useState<Customer[]>(() => loadFromStorage('customers', initialCustomers));
  const [partners, setPartners] = useState<Partner[]>(() => loadFromStorage('partners', initialPartners));
  const [receivables, setReceivables] = useState<Receivable[]>(() => loadFromStorage('receivables', initialReceivables));
  const [payables, setPayables] = useState<Payable[]>(() => loadFromStorage('payables', initialPayables));

  // Persist to localStorage on every change
  useEffect(() => { saveToStorage('deals', deals); }, [deals]);
  useEffect(() => { saveToStorage('tasks', tasks); }, [tasks]);
  useEffect(() => { saveToStorage('employees', employees); }, [employees]);
  useEffect(() => { saveToStorage('kpis', kpis); }, [kpis]);
  useEffect(() => { saveToStorage('payrolls', payrolls); }, [payrolls]);
  useEffect(() => { saveToStorage('expenses', expenses); }, [expenses]);
  useEffect(() => { saveToStorage('finance', finance); }, [finance]);
  useEffect(() => { saveToStorage('roadmap', roadmap); }, [roadmap]);
  useEffect(() => { saveToStorage('customers', customers); }, [customers]);
  useEffect(() => { saveToStorage('partners', partners); }, [partners]);
  useEffect(() => { saveToStorage('receivables', receivables); }, [receivables]);
  useEffect(() => { saveToStorage('payables', payables); }, [payables]);

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
