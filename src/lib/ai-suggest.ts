// ============================================================
// AI Suggest Engine — Tự động đề xuất bộ máy doanh nghiệp
// Dựa vào: ngành nghề, doanh thu mục tiêu, sản phẩm
// Output: phòng ban, nhân sự, chi phí, lương trung bình
// ============================================================

import { formatVND } from './format';

export interface DepartmentSuggestion {
  name: string;
  headcount: number;
  avgSalary: number;         // Lương TB / người / tháng
  totalSalary: number;       // = headcount * avgSalary
  budgetPercent: number;     // % doanh thu phân bổ cho phòng ban
  description: string;
  keyRoles: string[];
}

export interface CompanySuggestion {
  totalHeadcount: number;
  departments: DepartmentSuggestion[];
  monthlySalary: number;     // Tổng lương / tháng
  monthlyOpex: number;       // Chi phí vận hành / tháng (văn phòng, tools, ...)
  monthlyFixedCost: number;  // = monthlySalary + monthlyOpex
  yearlyFixedCost: number;
  profitMargin: number;      // % lợi nhuận dự kiến
}

// ---- Công thức tính nhân sự theo doanh thu & ngành ----
const INDUSTRY_PROFILES: Record<string, {
  revenuePerHead: number;      // Doanh thu / nhân sự / năm
  opexPerHead: number;         // Chi phí vận hành / nhân sự / tháng
  departments: { name: string; pct: number; avgSalary: number; roles: string[] }[];
  profitMargin: number;
}> = {
  'Công nghệ': {
    revenuePerHead: 400_000_000,
    opexPerHead: 3_000_000,
    profitMargin: 22,
    departments: [
      { name: 'Kỹ thuật & Sản phẩm', pct: 40, avgSalary: 25_000_000, roles: ['Tech Lead', 'Full-stack Dev', 'QA Engineer', 'UI/UX Designer'] },
      { name: 'Kinh doanh', pct: 25, avgSalary: 18_000_000, roles: ['Sales Manager', 'Account Executive', 'Sales Dev Rep'] },
      { name: 'Marketing', pct: 15, avgSalary: 16_000_000, roles: ['Marketing Manager', 'Content Writer', 'Growth Hacker'] },
      { name: 'Vận hành & Hành chính', pct: 10, avgSalary: 14_000_000, roles: ['HR Manager', 'Kế toán', 'Office Admin'] },
      { name: 'Ban Giám đốc', pct: 10, avgSalary: 45_000_000, roles: ['CEO', 'CTO', 'CFO'] },
    ],
  },
  'Bán lẻ': {
    revenuePerHead: 300_000_000,
    opexPerHead: 4_000_000,
    profitMargin: 15,
    departments: [
      { name: 'Bán hàng & Cửa hàng', pct: 40, avgSalary: 10_000_000, roles: ['Store Manager', 'Nhân viên bán hàng', 'Thu ngân'] },
      { name: 'Kho vận & Logistics', pct: 20, avgSalary: 12_000_000, roles: ['Quản lý kho', 'Nhân viên giao hàng'] },
      { name: 'Marketing', pct: 15, avgSalary: 15_000_000, roles: ['Marketing Manager', 'Social Media', 'Visual Merchandiser'] },
      { name: 'Mua hàng & Cung ứng', pct: 15, avgSalary: 14_000_000, roles: ['Purchasing Manager', 'Buyer'] },
      { name: 'Quản lý & Hành chính', pct: 10, avgSalary: 20_000_000, roles: ['Giám đốc', 'Kế toán', 'HR'] },
    ],
  },
  'Dịch vụ': {
    revenuePerHead: 350_000_000,
    opexPerHead: 3_500_000,
    profitMargin: 25,
    departments: [
      { name: 'Chuyên gia & Tư vấn', pct: 45, avgSalary: 22_000_000, roles: ['Senior Consultant', 'Chuyên viên', 'Analyst'] },
      { name: 'Kinh doanh', pct: 25, avgSalary: 18_000_000, roles: ['BD Manager', 'Account Manager'] },
      { name: 'Marketing', pct: 10, avgSalary: 16_000_000, roles: ['Marketing Lead', 'Content'] },
      { name: 'Vận hành', pct: 10, avgSalary: 14_000_000, roles: ['Project Manager', 'Coordinator'] },
      { name: 'Ban Giám đốc', pct: 10, avgSalary: 40_000_000, roles: ['CEO', 'COO'] },
    ],
  },
  'F&B': {
    revenuePerHead: 200_000_000,
    opexPerHead: 5_000_000,
    profitMargin: 12,
    departments: [
      { name: 'Nhà bếp & Pha chế', pct: 35, avgSalary: 9_000_000, roles: ['Head Chef', 'Đầu bếp', 'Pha chế'] },
      { name: 'Phục vụ & Cửa hàng', pct: 30, avgSalary: 7_000_000, roles: ['Quản lý ca', 'Nhân viên phục vụ', 'Thu ngân'] },
      { name: 'Marketing & Thương hiệu', pct: 10, avgSalary: 15_000_000, roles: ['Brand Manager', 'Social Media'] },
      { name: 'Cung ứng & Kho', pct: 15, avgSalary: 10_000_000, roles: ['Quản lý cung ứng', 'Thủ kho'] },
      { name: 'Quản lý', pct: 10, avgSalary: 25_000_000, roles: ['Giám đốc', 'Kế toán'] },
    ],
  },
};

function getProfile(industry: string) {
  return INDUSTRY_PROFILES[industry] || INDUSTRY_PROFILES['Dịch vụ'];
}

export function suggestCompanyStructure(
  industry: string,
  targetRevenue: number,
): CompanySuggestion {
  const profile = getProfile(industry);
  
  // Tính tổng nhân sự từ doanh thu
  const totalHeadcount = Math.max(3, Math.round(targetRevenue / profile.revenuePerHead));
  
  // Phân bổ nhân sự theo phòng ban
  const departments: DepartmentSuggestion[] = profile.departments.map(dept => {
    const headcount = Math.max(1, Math.round(totalHeadcount * dept.pct / 100));
    const totalSalary = headcount * dept.avgSalary;
    
    return {
      name: dept.name,
      headcount,
      avgSalary: dept.avgSalary,
      totalSalary,
      budgetPercent: dept.pct,
      description: `${headcount} người · Lương TB ${formatVND(dept.avgSalary)}/tháng`,
      keyRoles: dept.roles.slice(0, Math.min(headcount, dept.roles.length)),
    };
  });

  // Tổng hợp
  const monthlySalary = departments.reduce((sum, d) => sum + d.totalSalary, 0);
  const monthlyOpex = totalHeadcount * profile.opexPerHead;
  const monthlyFixedCost = monthlySalary + monthlyOpex;

  return {
    totalHeadcount,
    departments,
    monthlySalary,
    monthlyOpex,
    monthlyFixedCost,
    yearlyFixedCost: monthlyFixedCost * 12,
    profitMargin: profile.profitMargin,
  };
}


