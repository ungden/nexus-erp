// ============================================================
// NexusERP AI Engine — Board of Directors Simulation
// 3 AI Personas: CFO → CEO → HR Director
// Sau đó Drill-down: Năm → Quý → Tháng → Tuần → Ngày → Task
// ============================================================

import { formatVND } from './format';
import {
  CompanyProfile, CFOAnalysis, CEOStrategy, HRPlan,
  DepartmentPlan, BoardAnalysis, RoadmapNode, QuarterGoal,
  getCashflowStatus,
} from './roadmap-types';

// ---- Employee type for task assignment ----
interface EmployeeBasic {
  id: number;
  name: string;
  department: string;
  role: string;
  baseSalary: number;
}

function rid(): string { return Math.random().toString(36).substring(2, 10); }
function pick<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

// ============================================================
// INDUSTRY KNOWLEDGE BASE
// ============================================================

interface IndustryKB {
  revenuePerHead: number;
  opexPerHead: number;
  defaultMargin: number;
  cogsPercent: number;
  departments: { name: string; pct: number; avgSalary: number; roles: string[] }[];
  quarterThemes: string[][];
  taskPool: string[];
  kpiPool: string[];
  risks: string[];
  milestonePool: string[];
}

const KB: Record<string, IndustryKB> = {
  'Công nghệ': {
    revenuePerHead: 400_000_000, opexPerHead: 3_000_000, defaultMargin: 22, cogsPercent: 10,
    departments: [
      { name: 'Kỹ thuật & Sản phẩm', pct: 40, avgSalary: 25_000_000, roles: ['Tech Lead', 'Full-stack Dev', 'QA Engineer', 'UI/UX Designer', 'DevOps'] },
      { name: 'Kinh doanh', pct: 25, avgSalary: 18_000_000, roles: ['Sales Manager', 'Account Executive', 'Sales Dev Rep', 'Pre-sales'] },
      { name: 'Marketing', pct: 15, avgSalary: 16_000_000, roles: ['Marketing Manager', 'Content Writer', 'Growth Hacker', 'SEO Specialist'] },
      { name: 'Vận hành & Hành chính', pct: 10, avgSalary: 14_000_000, roles: ['HR Manager', 'Kế toán', 'Office Admin'] },
      { name: 'Ban Giám đốc', pct: 10, avgSalary: 45_000_000, roles: ['CEO', 'CTO', 'CFO'] },
    ],
    quarterThemes: [
      ['Xây dựng nền tảng kỹ thuật', 'Ra mắt MVP', 'Tuyển đội core tech'],
      ['Scale sản phẩm', 'Tăng trưởng khách hàng', 'Tối ưu chuyển đổi'],
      ['Mở rộng thị trường', 'Partnership chiến lược', 'Nâng cấp hạ tầng'],
      ['Tối ưu lợi nhuận', 'Consolidate hệ thống', 'Lập kế hoạch năm sau'],
    ],
    taskPool: ['Setup CI/CD pipeline', 'Code review sprint', 'Demo sản phẩm cho KH', 'Viết tài liệu API', 'Tối ưu database', 'A/B testing landing page', 'Deploy phiên bản mới', 'Phỏng vấn developer', 'Họp sprint planning', 'Security audit', 'Thiết kế UI tính năng mới', 'Chạy Google Ads', 'Gọi điện khách hàng tiềm năng', 'Chuẩn bị proposal', 'Onboarding nhân viên mới', 'Báo cáo tài chính tháng', 'Đào tạo nội bộ', 'Nghiên cứu đối thủ'],
    kpiPool: ['MRR tăng 15%', 'Churn rate < 5%', 'NPS > 40', 'Uptime > 99.9%', 'Lead conversion > 20%', 'CAC giảm 10%', 'Feature adoption > 60%', 'Tuyển đủ nhân sự tech', 'CSAT > 4.5/5', 'Revenue per employee tăng 10%'],
    risks: ['Khó tuyển nhân sự tech chất lượng', 'Chi phí server tăng khi scale', 'Đối thủ ra tính năng mới', 'Churn rate tăng nếu sản phẩm chậm cải thiện', 'Rủi ro bảo mật dữ liệu'],
    milestonePool: ['Ra mắt sản phẩm v2.0', 'Đạt 100 khách hàng trả phí', 'Ký hợp đồng enterprise đầu tiên', 'Đạt MRR 500 triệu', 'Tuyển đủ đội tech 10 người', 'Launch tính năng AI', 'Series A fundraising'],
  },
  'Bán lẻ': {
    revenuePerHead: 300_000_000, opexPerHead: 4_000_000, defaultMargin: 15, cogsPercent: 40,
    departments: [
      { name: 'Bán hàng & Cửa hàng', pct: 40, avgSalary: 10_000_000, roles: ['Store Manager', 'NV bán hàng', 'Thu ngân', 'Visual Merchandiser'] },
      { name: 'Kho vận & Logistics', pct: 20, avgSalary: 12_000_000, roles: ['Quản lý kho', 'NV giao hàng', 'Thủ kho'] },
      { name: 'Marketing', pct: 15, avgSalary: 15_000_000, roles: ['Marketing Manager', 'Social Media', 'Photographer'] },
      { name: 'Mua hàng & Cung ứng', pct: 15, avgSalary: 14_000_000, roles: ['Purchasing Manager', 'Buyer'] },
      { name: 'Quản lý', pct: 10, avgSalary: 25_000_000, roles: ['Giám đốc', 'Kế toán', 'HR'] },
    ],
    quarterThemes: [
      ['Chiến dịch đầu năm & Tết', 'Tối ưu chuỗi cung ứng', 'Mở kênh online'],
      ['Ra mắt dòng SP mới', 'Tối ưu inventory', 'Mở thêm điểm bán'],
      ['Back to school campaign', 'Tối ưu chi phí logistics', 'Training NV'],
      ['Black Friday / 11.11 / 12.12', 'Chiến dịch cuối năm', 'Kiểm kê tổng'],
    ],
    taskPool: ['Nhập hàng từ NCC', 'Setup khuyến mãi', 'Kiểm kê kho', 'Training NV bán hàng', 'Chạy ads Facebook', 'Thiết kế banner QC', 'Liên hệ NCC mới', 'Đánh giá hiệu suất cửa hàng', 'Tối ưu layout cửa hàng', 'Phân tích dữ liệu bán hàng', 'Xử lý đơn hàng online', 'Chăm sóc KH VIP', 'Đối soát công nợ NCC', 'Cập nhật giá bán', 'Chụp ảnh sản phẩm mới'],
    kpiPool: ['Doanh số tăng 20%', 'Tồn kho < 30 ngày', 'Hoàn trả < 3%', 'KH mới tăng 25%', 'AOV tăng 15%', 'Gross margin > 40%', 'Online revenue > 30%', 'NPS > 35'],
    risks: ['Tồn kho cao do dự báo sai', 'Cạnh tranh giá từ đối thủ online', 'Chi phí mặt bằng tăng', 'Thiếu NV bán hàng mùa cao điểm'],
    milestonePool: ['Mở cửa hàng thứ 5', 'Launch website e-commerce', 'Đạt 10.000 khách hàng thân thiết', 'Doanh thu online đạt 30%', 'Ký hợp đồng NCC chiến lược'],
  },
};

function getKB(industry: string): IndustryKB {
  if (KB[industry]) return KB[industry];
  // Default fallback
  return {
    revenuePerHead: 350_000_000, opexPerHead: 3_500_000, defaultMargin: 20, cogsPercent: 20,
    departments: [
      { name: 'Kinh doanh', pct: 30, avgSalary: 18_000_000, roles: ['Sales Manager', 'Account Executive', 'BD Manager'] },
      { name: 'Chuyên môn & Dịch vụ', pct: 30, avgSalary: 20_000_000, roles: ['Senior Consultant', 'Chuyên viên', 'Project Manager'] },
      { name: 'Marketing', pct: 15, avgSalary: 16_000_000, roles: ['Marketing Manager', 'Content Writer'] },
      { name: 'Vận hành', pct: 15, avgSalary: 14_000_000, roles: ['Kế toán', 'HR', 'Admin'] },
      { name: 'Ban Giám đốc', pct: 10, avgSalary: 40_000_000, roles: ['CEO', 'COO'] },
    ],
    quarterThemes: [
      ['Thiết lập nền tảng', 'Xây dựng đội ngũ', 'Nghiên cứu thị trường'],
      ['Mở rộng kinh doanh', 'Tối ưu quy trình', 'Phát triển dịch vụ'],
      ['Tăng trưởng mạnh', 'Partnership mới', 'Nâng cao chất lượng'],
      ['Consolidate kết quả', 'Tối ưu lợi nhuận', 'Kế hoạch năm sau'],
    ],
    taskPool: ['Họp chiến lược phòng ban', 'Ký HĐ khách hàng mới', 'Đánh giá hiệu suất NV', 'Chạy chiến dịch marketing', 'Tối ưu quy trình nội bộ', 'Nghiên cứu đối thủ', 'Phỏng vấn tuyển dụng', 'Báo cáo tài chính', 'Họp review KPI', 'Đào tạo nội bộ', 'Gọi điện chăm sóc KH', 'Chuẩn bị hồ sơ dự thầu', 'Thanh toán NCC'],
    kpiPool: ['Doanh thu đạt mục tiêu', 'Lợi nhuận tăng 15%', 'Tuyển đủ nhân sự', 'KH mới tăng 20%', 'Chi phí vận hành giảm 10%', 'NPS > 35', 'Retention rate > 85%'],
    risks: ['Phụ thuộc vào vài khách hàng lớn', 'Chi phí nhân sự tăng', 'Biến động thị trường', 'Chậm thu hồi công nợ'],
    milestonePool: ['Đạt doanh thu 1 tỷ/tháng', 'Ký 10 HĐ lớn', 'Mở thêm chi nhánh', 'Launch sản phẩm mới', 'Tuyển đủ nhân sự chiến lược'],
  };
}

// ============================================================
// CFO AI — Phân tích Tài chính
// ============================================================

export function generateCFOAnalysis(profile: CompanyProfile): CFOAnalysis {
  const kb = getKB(profile.industry);
  const rev = profile.revenue;
  
  const cogsP = kb.cogsPercent;
  const hrP = Math.round((1 - kb.defaultMargin / 100 - cogsP / 100) * 55); // HR takes ~55% of non-COGS-non-profit
  const mktP = Math.round((1 - kb.defaultMargin / 100 - cogsP / 100) * 25);
  const opsP = Math.round((1 - kb.defaultMargin / 100 - cogsP / 100) * 20);
  const profitP = 100 - cogsP - hrP - mktP - opsP;
  
  const monthlyBurn = Math.round((rev * (100 - profitP) / 100) / 12);
  const breakEven = Math.max(2, Math.round(12 * (1 - profitP / 100) * 0.6));
  
  const feasibility = profitP >= 15 ? 'Khả thi' : profitP >= 5 ? 'Cần điều chỉnh' : 'Rủi ro cao';
  
  return {
    feasibility,
    analysis: `Với mục tiêu ${formatVND(rev)} trong ngành ${profile.industry}, biên lợi nhuận dự kiến ${profitP}%. Burn rate ${formatVND(monthlyBurn)}/tháng. ${feasibility === 'Khả thi' ? 'Mô hình tài chính khả thi nếu kiểm soát tốt chi phí nhân sự và marketing.' : 'Cần tối ưu cơ cấu chi phí để đảm bảo dòng tiền bền vững.'}`,
    budgetAllocation: {
      cogs: { percent: cogsP, amount: Math.round(rev * cogsP / 100), note: 'Giá vốn hàng bán / Chi phí trực tiếp' },
      hr: { percent: hrP, amount: Math.round(rev * hrP / 100), note: 'Lương, thưởng, phúc lợi, tuyển dụng' },
      marketing: { percent: mktP, amount: Math.round(rev * mktP / 100), note: 'Quảng cáo, sự kiện, content, SEO' },
      operations: { percent: opsP, amount: Math.round(rev * opsP / 100), note: 'Văn phòng, công cụ, phần mềm, pháp lý' },
      profit: { percent: profitP, amount: Math.round(rev * profitP / 100), note: 'Lợi nhuận ròng sau tất cả chi phí' },
    },
    monthlyBurnRate: monthlyBurn,
    breakEvenMonth: breakEven,
    risks: pick(kb.risks, 3),
  };
}

// ============================================================
// CEO AI — Chiến lược Kinh doanh
// ============================================================

export function generateCEOStrategy(profile: CompanyProfile, cfo: CFOAnalysis): CEOStrategy {
  const kb = getKB(profile.industry);
  const rev = profile.revenue;
  const weights = [0.18, 0.24, 0.28, 0.30]; // Increasing revenue per quarter
  
  const quarterlyGoals: QuarterGoal[] = weights.map((w, i) => {
    const qRev = Math.round(rev * w);
    const themes = kb.quarterThemes[i];
    return {
      quarter: i + 1,
      theme: themes[0],
      revenue: qRev,
      keyObjectives: themes.map(t => `${t} — mục tiêu ${formatVND(Math.round(qRev / themes.length))}`),
      milestones: pick(kb.milestonePool, 2),
    };
  });

  return {
    vision: `${profile.companyName} sẽ đạt ${formatVND(rev)} doanh thu trong năm, tập trung vào "${profile.objective}" với biên lợi nhuận ${cfo.budgetAllocation.profit.percent}%. Chiến lược: tăng trưởng nhanh Q1-Q2, bứt phá Q3, consolidate Q4.`,
    quarterlyGoals,
    companyKPIs: pick(kb.kpiPool, 6),
  };
}

// ============================================================
// HR Director AI — Bộ máy Nhân sự
// ============================================================

export function generateHRPlan(profile: CompanyProfile, cfo: CFOAnalysis, ceo: CEOStrategy): HRPlan {
  const kb = getKB(profile.industry);
  const hrBudget = cfo.budgetAllocation.hr.amount;
  
  // Tính headcount từ HR budget
  const totalHeadcount = Math.max(3, Math.round(profile.revenue / kb.revenuePerHead));
  
  const departments: DepartmentPlan[] = kb.departments.map(dept => {
    const headcount = Math.max(1, Math.round(totalHeadcount * dept.pct / 100));
    const totalSalary = headcount * dept.avgSalary;
    return {
      name: dept.name,
      headcount,
      avgSalary: dept.avgSalary,
      totalSalary,
      budgetPercent: dept.pct,
      description: `${headcount} người · Lương TB ${formatVND(dept.avgSalary)}/tháng`,
      keyRoles: dept.roles.slice(0, Math.min(headcount + 1, dept.roles.length)),
    };
  });

  const monthlySalary = departments.reduce((s, d) => s + d.totalSalary, 0);
  const monthlyOpex = totalHeadcount * kb.opexPerHead;
  const monthlyFixed = monthlySalary + monthlyOpex;
  
  // Hiring plan per quarter (front-loaded)
  const hiringPlan = ceo.quarterlyGoals.map((q, i) => ({
    quarter: q.quarter,
    newHires: i === 0 ? Math.ceil(totalHeadcount * 0.4) : i === 1 ? Math.ceil(totalHeadcount * 0.3) : Math.ceil(totalHeadcount * 0.15),
    departments: departments.slice(0, 3).map(d => d.name),
    priority: i === 0 ? 'Ưu tiên cao — xây dựng đội ngũ nòng cốt' : i === 1 ? 'Trung bình — bổ sung nhân lực scale' : 'Thấp — tuyển bù/thay thế',
  }));

  return {
    totalHeadcount,
    departments,
    monthlySalary,
    monthlyOpex,
    monthlyFixedCost: monthlyFixed,
    yearlyFixedCost: monthlyFixed * 12,
    profitMargin: cfo.budgetAllocation.profit.percent,
    hiringPlan,
    compensationPolicy: `Lương cơ bản theo thị trường ngành ${profile.industry}. Review lương 2 lần/năm (Q2 & Q4). Lương tháng 13 cho nhân viên > 6 tháng.`,
    kpiBonusPolicy: `Đạt KPI = +10% lương cơ bản. Vượt KPI = +15-20% tuỳ mức vượt. Thưởng team nếu phòng ban đạt target quý. Ngân sách thưởng: ${formatVND(Math.round(hrBudget * 0.1))}/năm.`,
  };
}

// ============================================================
// FULL BOARD ANALYSIS — Chạy 3 AI tuần tự
// ============================================================

export function generateBoardAnalysis(profile: CompanyProfile): BoardAnalysis {
  const cfo = generateCFOAnalysis(profile);
  const ceo = generateCEOStrategy(profile, cfo);
  const hr = generateHRPlan(profile, cfo, ceo);
  return { cfo, ceo, hr };
}

// ============================================================
// ROADMAP TREE — Generate từ Board Analysis
// ============================================================

export function generateRoadmapTree(profile: CompanyProfile, board: BoardAnalysis): RoadmapNode {
  const { cfo, ceo, hr } = board;
  const rev = profile.revenue;
  const totalExpense = rev - cfo.budgetAllocation.profit.amount;

  const quarters: RoadmapNode[] = ceo.quarterlyGoals.map((q) => {
    const qExpense = Math.round(hr.monthlyFixedCost * 3 + (q.revenue * cfo.budgetAllocation.cogs.percent / 100));
    const cf = q.revenue - qExpense;
    return {
      id: rid(), level: 'quarter' as const,
      title: `Quý ${q.quarter}/${new Date().getFullYear()}`,
      description: q.keyObjectives.join(' · '),
      theme: q.theme,
      milestones: q.milestones,
      revenue: q.revenue, expense: qExpense, cashflow: cf,
      cashflowStatus: getCashflowStatus(q.revenue, qExpense),
      kpis: pick(ceo.companyKPIs, 3),
      children: undefined, isExpanded: false,
    };
  });

  return {
    id: rid(), level: 'year',
    title: `Roadmap ${new Date().getFullYear()} — ${profile.companyName}`,
    description: ceo.vision,
    revenue: rev, expense: totalExpense, cashflow: rev - totalExpense,
    cashflowStatus: getCashflowStatus(rev, totalExpense),
    kpis: [`Doanh thu: ${formatVND(rev)}`, `Lợi nhuận: ${formatVND(cfo.budgetAllocation.profit.amount)}`, `${hr.totalHeadcount} nhân sự`],
    children: quarters, isExpanded: true,
  };
}

// ============================================================
// DRILL-DOWN GENERATORS (Quý → Tháng → Tuần → Ngày → Task)
// ============================================================

export function expandQuarter(node: RoadmapNode, profile: CompanyProfile, board: BoardAnalysis): RoadmapNode[] {
  const kb = getKB(profile.industry);
  const qIdx = parseInt(node.title.match(/\d+/)?.[0] || '1') - 1;
  const baseMonth = qIdx * 3;
  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const weights = [0.30, 0.33, 0.37];

  return weights.map((w, i) => {
    const mRev = Math.round(node.revenue * w);
    const mExp = Math.round(board.hr.monthlyFixedCost + (mRev * board.cfo.budgetAllocation.cogs.percent / 100));
    return {
      id: rid(), level: 'month' as const,
      title: `${monthNames[baseMonth + i]}/${new Date().getFullYear()}`,
      description: `Sprint tháng: ${kb.quarterThemes[qIdx]?.[i] || 'Triển khai kế hoạch'}`,
      department: board.hr.departments[i % board.hr.departments.length]?.name,
      revenue: mRev, expense: mExp, cashflow: mRev - mExp,
      cashflowStatus: getCashflowStatus(mRev, mExp),
      kpis: pick(kb.kpiPool, 2),
      children: undefined, isExpanded: false,
    };
  });
}

export function expandMonth(node: RoadmapNode): RoadmapNode[] {
  const monthNum = parseInt(node.title.match(/\d+/)?.[0] || '1');
  return [1, 2, 3, 4].map(w => {
    const wRev = Math.round(node.revenue / 4);
    const wExp = Math.round(node.expense / 4);
    const startDay = (w - 1) * 7 + 1;
    const endDay = Math.min(w * 7, 30);
    return {
      id: rid(), level: 'week' as const,
      title: `Tuần ${w} (${startDay}-${endDay}/${monthNum})`,
      description: `Sprint tuần ${w}`,
      revenue: wRev, expense: wExp, cashflow: wRev - wExp,
      cashflowStatus: getCashflowStatus(wRev, wExp),
      kpis: [`Hoàn thành mục tiêu tuần ${w}`],
      children: undefined, isExpanded: false,
    };
  });
}

export function expandWeek(node: RoadmapNode): RoadmapNode[] {
  const weekMatch = node.title.match(/\((\d+)-\d+\/(\d+)\)/);
  const startDay = parseInt(weekMatch?.[1] || '1');
  const monthNum = parseInt(weekMatch?.[2] || '1');
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'];

  return dayNames.map((name, i) => {
    const day = startDay + i;
    const dRev = Math.round(node.revenue / 5);
    const dExp = Math.round(node.expense / 5);
    const year = new Date().getFullYear();
    const isoDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(Math.min(day, 28)).padStart(2, '0')}`;
    return {
      id: rid(), level: 'day' as const,
      title: `${name} (${day}/${monthNum})`,
      description: `Công việc ngày ${day}/${monthNum}`,
      startDate: isoDate,
      revenue: dRev, expense: dExp, cashflow: dRev - dExp,
      cashflowStatus: getCashflowStatus(dRev, dExp),
      kpis: [],
      children: undefined, isExpanded: false,
    };
  });
}

export function expandDay(node: RoadmapNode, profile: CompanyProfile, board: BoardAnalysis, employees?: EmployeeBasic[]): RoadmapNode[] {
  const kb = getKB(profile.industry);
  const taskCount = 2 + Math.floor(Math.random() * 4);
  const tasks = pick(kb.taskPool, taskCount);
  
  // Categorize employees
  const salesMkt = (employees || []).filter(e => /kinh doanh|marketing|sales|bán hàng/i.test(e.department + e.role));
  const techOps = (employees || []).filter(e => /kỹ thuật|vận hành|it|tech|finance|hr|kế toán|hành chính/i.test(e.department + e.role));
  const allEmps = employees || [];

  return tasks.map((title, i) => {
    const isRevTask = i < Math.ceil(taskCount * 0.35);
    const tRev = isRevTask ? Math.round(node.revenue / Math.ceil(taskCount * 0.35)) : 0;
    const tExp = Math.round(node.expense / taskCount);

    // Assign employee
    let assignee: EmployeeBasic | undefined;
    if (isRevTask && salesMkt.length > 0) {
      assignee = salesMkt[i % salesMkt.length];
    } else if (!isRevTask && techOps.length > 0) {
      assignee = techOps[i % techOps.length];
    } else if (allEmps.length > 0) {
      assignee = allEmps[i % allEmps.length];
    }

    // Bonus logic: 5-20% of base salary depending on task importance
    const bonusPct = isRevTask ? 15 + Math.floor(Math.random() * 6) : 5 + Math.floor(Math.random() * 6);
    const bonusAmt = assignee ? Math.round(assignee.baseSalary * bonusPct / 100 / 22) : 0; // Daily bonus = monthly * pct / 22 working days

    return {
      id: rid(), level: 'task' as const,
      title,
      description: isRevTask ? 'Tạo doanh thu trực tiếp' : 'Vận hành & hỗ trợ',
      department: assignee?.department,
      assigneeId: assignee?.id,
      assigneeName: assignee ? `${assignee.name} (${assignee.department})` : undefined,
      personalKPI: isRevTask ? `Doanh thu: ${formatVND(tRev)}` : `Hoàn thành đúng hạn`,
      bonusPercent: bonusPct,
      bonusAmount: bonusAmt,
      startDate: node.startDate,
      revenue: tRev, expense: tExp, cashflow: tRev - tExp,
      cashflowStatus: getCashflowStatus(tRev > 0 ? tRev : 1, tExp),
      kpis: [],
      children: undefined, isExpanded: false,
    };
  });
}

// ============================================================
// DISPATCHER
// ============================================================

export function expandNode(
  node: RoadmapNode,
  profile: CompanyProfile,
  board: BoardAnalysis,
  employees?: EmployeeBasic[]
): RoadmapNode[] {
  switch (node.level) {
    case 'quarter': return expandQuarter(node, profile, board);
    case 'month': return expandMonth(node);
    case 'week': return expandWeek(node);
    case 'day': return expandDay(node, profile, board, employees);
    default: return [];
  }
}
