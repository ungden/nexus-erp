'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Roadmap } from '@/lib/roadmap-types';

// Types
export type Stage = 'Tiếp cận' | 'Đàm phán' | 'Chốt sale' | 'Thất bại';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';
export type KpiStatus = 'on-track' | 'at-risk' | 'behind';

export interface Deal {
  id: string;
  title: string;
  company: string;
  amount: number;
  stage: Stage;
  date: string;
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
  { id: '1', title: 'Hợp đồng phần mềm ERP', company: 'Công ty TNHH ABC', amount: 150000000, stage: 'Tiếp cận', date: '12/10/2023' },
  { id: '2', title: 'Tư vấn chiến lược Marketing', company: 'Tập đoàn XYZ', amount: 80000000, stage: 'Tiếp cận', date: '15/10/2023' },
  { id: '3', title: 'Thiết kế Website E-commerce', company: 'Cửa hàng Thời trang M', amount: 45000000, stage: 'Đàm phán', date: '10/10/2023' },
  { id: '4', title: 'Dịch vụ SEO tổng thể', company: 'Nha khoa Nụ Cười', amount: 120000000, stage: 'Chốt sale', date: '05/10/2023' },
  { id: '5', title: 'Triển khai CRM', company: 'Công ty BĐS Hưng Thịnh', amount: 350000000, stage: 'Chốt sale', date: '01/10/2023' },
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

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [kpis, setKpis] = useState<KPI[]>(initialKpis);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>(initialPayrolls);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [finance, setFinance] = useState({
    targetRevenue: 1000000000,
    allocations: { cogs: 30, hr: 25, mkt: 15, ops: 10, profit: 20 }
  });
  const [roadmap, setRoadmapState] = useState<Roadmap | null>(null);

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
