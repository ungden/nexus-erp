// ============================================================
// AI Roadmap Engine — Smart Placeholder
// Khi có GEMINI_API_KEY sẽ gọi Gemini thật
// Khi không có key → dùng AI giả lập thông minh
// ============================================================

import { RoadmapNode, CompanyProfile, getCashflowStatus } from './roadmap-types';
import { formatVND } from './format';

// Basic employee type for task assignment (matches AppContext Employee shape)
interface EmployeeBasic {
  id: number;
  name: string;
  department: string;
  role: string;
}

// ---- Industry-specific templates ----
const INDUSTRY_DATA: Record<string, {
  departments: string[];
  quarterFocus: string[][];
  taskTemplates: string[];
  kpiTemplates: string[];
}> = {
  'Công nghệ': {
    departments: ['Kinh doanh', 'Marketing', 'Kỹ thuật', 'Vận hành'],
    quarterFocus: [
      ['Xây dựng nền tảng', 'Ra mắt MVP', 'Tuyển đội core'],
      ['Mở rộng thị trường', 'Tối ưu sản phẩm', 'Scale marketing'],
      ['Tăng trưởng doanh thu', 'Partnership chiến lược', 'Nâng cấp hạ tầng'],
      ['Consolidate', 'Lập kế hoạch năm sau', 'Tối ưu lợi nhuận'],
    ],
    taskTemplates: ['Setup CI/CD pipeline', 'Thiết kế UI/UX cho tính năng mới', 'Code review sprint', 'Demo sản phẩm cho khách hàng', 'Viết tài liệu API', 'Tối ưu performance database', 'A/B testing landing page', 'Deploy phiên bản mới', 'Phỏng vấn ứng viên developer', 'Họp retrospective sprint'],
    kpiTemplates: ['MRR tăng 15%', 'Churn rate < 5%', 'NPS > 40', 'Uptime > 99.9%', 'Lead conversion > 20%', 'CAC giảm 10%', 'Feature adoption > 60%', 'Tuyển đủ nhân sự tech'],
  },
  'Bán lẻ': {
    departments: ['Kinh doanh', 'Marketing', 'Kho vận', 'Vận hành'],
    quarterFocus: [
      ['Mở rộng kênh bán', 'Tối ưu chuỗi cung ứng', 'Chiến dịch Tết'],
      ['Ra mắt dòng sản phẩm mới', 'Tối ưu inventory', 'Mở thêm điểm bán'],
      ['Back to school campaign', 'Tối ưu chi phí logistics', 'Training nhân viên'],
      ['Black Friday / 11.11', 'Chiến dịch cuối năm', 'Kiểm kê tổng'],
    ],
    taskTemplates: ['Nhập hàng từ nhà cung cấp', 'Setup chương trình khuyến mãi', 'Kiểm kê kho hàng', 'Training nhân viên bán hàng', 'Chạy ads Facebook/Google', 'Thiết kế banner quảng cáo', 'Liên hệ đối tác mới', 'Đánh giá hiệu suất cửa hàng', 'Tối ưu layout cửa hàng', 'Phân tích dữ liệu bán hàng'],
    kpiTemplates: ['Doanh số tăng 20%', 'Tồn kho < 30 ngày', 'Tỷ lệ hoàn trả < 3%', 'Khách hàng mới tăng 25%', 'Average order value tăng 15%', 'Gross margin > 40%'],
  },
  default: {
    departments: ['Kinh doanh', 'Marketing', 'Vận hành', 'Nhân sự'],
    quarterFocus: [
      ['Thiết lập nền tảng', 'Xây dựng đội ngũ', 'Chiến lược thị trường'],
      ['Mở rộng kinh doanh', 'Tối ưu quy trình', 'Phát triển sản phẩm'],
      ['Tăng trưởng mạnh', 'Mở rộng thị trường', 'Nâng cao chất lượng'],
      ['Consolidate kết quả', 'Lập kế hoạch năm sau', 'Tối ưu lợi nhuận'],
    ],
    taskTemplates: ['Họp chiến lược phòng ban', 'Ký hợp đồng khách hàng mới', 'Đánh giá hiệu suất nhân viên', 'Chạy chiến dịch marketing', 'Tối ưu quy trình nội bộ', 'Nghiên cứu đối thủ cạnh tranh', 'Phỏng vấn tuyển dụng', 'Báo cáo tài chính', 'Họp review KPI', 'Đào tạo nội bộ'],
    kpiTemplates: ['Doanh thu đạt mục tiêu', 'Lợi nhuận tăng 15%', 'Tuyển đủ nhân sự', 'Khách hàng mới tăng 20%', 'Chi phí vận hành giảm 10%', 'NPS > 35'],
  },
};

function getIndustryData(industry: string) {
  return INDUSTRY_DATA[industry] || INDUSTRY_DATA.default;
}

function randomPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ---- Generate Year → 4 Quarters ----
export function generateYearRoadmap(profile: CompanyProfile): RoadmapNode {
  const data = getIndustryData(profile.industry);
  const yearRevenue = profile.revenue;
  const yearExpense = Math.round(yearRevenue * 0.78); // ~22% lợi nhuận target
  const monthlyFixed = profile.fixedCost;

  // Phân bổ doanh thu theo quý (tăng dần)
  const qWeights = [0.2, 0.24, 0.27, 0.29];
  
  const quarters: RoadmapNode[] = qWeights.map((w, i) => {
    const qRevenue = Math.round(yearRevenue * w);
    const qExpense = Math.round(monthlyFixed * 3 + (qRevenue * 0.35));
    const cashflow = qRevenue - qExpense;
    
    return {
      id: generateId(),
      level: 'quarter' as const,
      title: `Quý ${i + 1}/${new Date().getFullYear()}`,
      description: data.quarterFocus[i].join(' • '),
      revenue: qRevenue,
      expense: qExpense,
      cashflow,
      cashflowStatus: getCashflowStatus(qRevenue, qExpense),
      kpis: randomPick(data.kpiTemplates, 3),
      children: undefined,
      isExpanded: false,
    };
  });

  return {
    id: generateId(),
    level: 'year',
    title: `Roadmap ${new Date().getFullYear()} — ${profile.companyName}`,
    description: profile.objective,
    revenue: yearRevenue,
    expense: yearExpense,
    cashflow: yearRevenue - yearExpense,
    cashflowStatus: getCashflowStatus(yearRevenue, yearExpense),
    kpis: [`Doanh thu ${formatVND(yearRevenue)}`, `Lợi nhuận ${formatVND(yearRevenue - yearExpense)}`, `${profile.headcount} nhân sự`],
    children: quarters,
    isExpanded: true,
  };
}

// ---- Generate Quarter → 3 Months ----
export function generateQuarterChildren(node: RoadmapNode, profile: CompanyProfile): RoadmapNode[] {
  const data = getIndustryData(profile.industry);
  const qIndex = parseInt(node.title.match(/\d+/)?.[0] || '1') - 1;
  const baseMonth = qIndex * 3;
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  
  // Phân bổ doanh thu theo tháng trong quý (tăng dần nhẹ)
  const mWeights = [0.3, 0.33, 0.37];

  return mWeights.map((w, i) => {
    const mRevenue = Math.round(node.revenue * w);
    const mExpense = Math.round(profile.fixedCost + (mRevenue * 0.3));
    const cashflow = mRevenue - mExpense;
    const focus = data.quarterFocus[qIndex];

    return {
      id: generateId(),
      level: 'month' as const,
      title: `${monthNames[baseMonth + i]}/${new Date().getFullYear()}`,
      description: focus[i % focus.length] || 'Triển khai kế hoạch tháng',
      department: data.departments[i % data.departments.length],
      revenue: mRevenue,
      expense: mExpense,
      cashflow,
      cashflowStatus: getCashflowStatus(mRevenue, mExpense),
      kpis: randomPick(data.kpiTemplates, 2),
      children: undefined,
      isExpanded: false,
    };
  });
}

// ---- Generate Month → 4 Weeks ----
export function generateMonthChildren(node: RoadmapNode, profile: CompanyProfile): RoadmapNode[] {
  const data = getIndustryData(profile.industry);
  const monthNum = parseInt(node.title.match(/\d+/)?.[0] || '1');
  
  return [1, 2, 3, 4].map((weekNum) => {
    const wRevenue = Math.round(node.revenue / 4);
    const wExpense = Math.round(node.expense / 4);
    const cashflow = wRevenue - wExpense;
    const startDay = (weekNum - 1) * 7 + 1;
    const endDay = Math.min(weekNum * 7, 30);

    return {
      id: generateId(),
      level: 'week' as const,
      title: `Tuần ${weekNum} (${startDay}-${endDay}/${monthNum})`,
      description: `Sprint tuần ${weekNum}: Thực hiện mục tiêu tháng`,
      department: data.departments[weekNum % data.departments.length],
      revenue: wRevenue,
      expense: wExpense,
      cashflow,
      cashflowStatus: getCashflowStatus(wRevenue, wExpense),
      kpis: randomPick(data.kpiTemplates, 1),
      children: undefined,
      isExpanded: false,
    };
  });
}

// ---- Generate Week → 5 Days (Thứ 2 - Thứ 6) ----
export function generateDayChildren(node: RoadmapNode, profile: CompanyProfile): RoadmapNode[] {
  const data = getIndustryData(profile.industry);
  
  // Parse month number from parent title e.g. "Tuần 1 (1-7/1)" → month 1
  const monthMatch = node.title.match(/\/(\d+)\)/);
  const monthNum = monthMatch ? parseInt(monthMatch[1]) : 1;
  
  // Parse start day from parent title e.g. "Tuần 1 (1-7/1)" → startDay 1
  const dayMatch = node.title.match(/\((\d+)-/);
  const startDay = dayMatch ? parseInt(dayMatch[1]) : 1;
  
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'];
  
  return dayNames.map((dayName, i) => {
    const dayNum = startDay + i;
    const dRevenue = Math.round(node.revenue / 5);
    const dExpense = Math.round(node.expense / 5);
    const cashflow = dRevenue - dExpense;
    
    return {
      id: generateId(),
      level: 'day' as const,
      title: `${dayName} (${dayNum}/${monthNum})`,
      description: `Kế hoạch ngày ${dayNum}/${monthNum}: Triển khai mục tiêu tuần`,
      department: node.department || data.departments[i % data.departments.length],
      revenue: dRevenue,
      expense: dExpense,
      cashflow,
      cashflowStatus: getCashflowStatus(dRevenue, dExpense),
      startDate: `${new Date().getFullYear()}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
      endDate: `${new Date().getFullYear()}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
      kpis: randomPick(data.kpiTemplates, 1 + Math.floor(Math.random() * 2)), // 1-2 daily goals
      children: undefined,
      isExpanded: false,
    };
  });
}

// ---- Generate Day → 2-5 Tasks with Employee Assignment ----
export function generateDayTasks(node: RoadmapNode, profile: CompanyProfile, employees?: EmployeeBasic[]): RoadmapNode[] {
  const data = getIndustryData(profile.industry);
  const taskCount = 2 + Math.floor(Math.random() * 4); // 2-5 tasks
  const tasks = randomPick(data.taskTemplates, taskCount);
  
  // Separate employees by department type for smart assignment
  const salesMarketingEmployees = employees?.filter(e => 
    ['Kinh doanh', 'Marketing', 'Sales'].some(dept => e.department.includes(dept) || e.role.includes(dept))
  ) || [];
  const techOpsEmployees = employees?.filter(e => 
    ['Kỹ thuật', 'Vận hành', 'IT', 'Tech', 'Finance', 'HR'].some(dept => e.department.includes(dept) || e.role.includes(dept))
  ) || [];
  const allEmployees = employees || [];

  return tasks.map((taskTitle, i) => {
    const isRevTask = i < Math.ceil(taskCount * 0.4); // ~40% tasks generate revenue
    const tRevenue = isRevTask ? Math.round(node.revenue / taskCount * 2) : 0;
    const tExpense = Math.round(node.expense / taskCount);
    const cashflow = tRevenue - tExpense;
    
    // Assign employee based on task type
    let assignee: EmployeeBasic | undefined;
    if (isRevTask && salesMarketingEmployees.length > 0) {
      assignee = salesMarketingEmployees[i % salesMarketingEmployees.length];
    } else if (!isRevTask && techOpsEmployees.length > 0) {
      assignee = techOpsEmployees[i % techOpsEmployees.length];
    } else if (allEmployees.length > 0) {
      assignee = allEmployees[i % allEmployees.length];
    }

    return {
      id: generateId(),
      level: 'task' as const,
      title: taskTitle,
      description: isRevTask ? 'Tạo doanh thu trực tiếp' : 'Chi phí vận hành',
      department: assignee?.department || data.departments[i % data.departments.length],
      revenue: tRevenue,
      expense: tExpense,
      cashflow,
      cashflowStatus: getCashflowStatus(tRevenue > 0 ? tRevenue : node.revenue / taskCount, tExpense),
      kpis: [],
      assigneeId: assignee?.id,
      assigneeName: assignee ? `${assignee.name} (${assignee.department})` : undefined,
      children: undefined,
      isExpanded: false,
    };
  });
}

// ---- Legacy: Generate Week → Tasks (kept for backward compat) ----
export function generateWeekChildren(node: RoadmapNode, profile: CompanyProfile): RoadmapNode[] {
  // Now delegates to generateDayChildren (Week → Day)
  return generateDayChildren(node, profile);
}

// ---- Main dispatcher ----
export function expandNode(node: RoadmapNode, profile: CompanyProfile, employees?: EmployeeBasic[]): RoadmapNode[] {
  switch (node.level) {
    case 'quarter': return generateQuarterChildren(node, profile);
    case 'month': return generateMonthChildren(node, profile);
    case 'week': return generateDayChildren(node, profile);  // Week → Days
    case 'day': return generateDayTasks(node, profile, employees);  // Day → Tasks with employee assignment
    default: return [];
  }
}


