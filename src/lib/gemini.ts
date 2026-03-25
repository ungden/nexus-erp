// ============================================================
// NexusERP AI Brain — Google Gemini with Thinking Mode
// Sử dụng @google/genai SDK mới với thinking + streaming
// CFO → CEO → HR Director — mỗi bước suy nghĩ sâu trước khi output
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { CompanyProfile, BoardAnalysis, CFOAnalysis, CEOStrategy, HRPlan, RoadmapNode, getCashflowStatus } from './roadmap-types';
import { generateBoardAnalysis as fallbackBoard, generateRoadmapTree as fallbackTree } from './ai-engine';
import { formatVND } from './format';

const MODEL_NAME = 'gemini-3-flash-preview';

function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

// ---- Streaming event types for client ----
export type StreamEvent =
  | { type: 'phase'; phase: 'cfo' | 'ceo' | 'hr' | 'tree' | 'done'; label: string }
  | { type: 'thinking'; phase: 'cfo' | 'ceo' | 'hr'; text: string }
  | { type: 'result'; data: { board: BoardAnalysis; tree: RoadmapNode; generatedAt: string } }
  | { type: 'error'; message: string }
  | { type: 'drill-phase'; label: string }
  | { type: 'drill-thinking'; text: string }
  | { type: 'drill-result'; children: RoadmapNode[] }
  | { type: 'drill-error'; message: string };

// ---- Random ID helper ----
function rid(): string { return Math.random().toString(36).substring(2, 10); }

// ============================================================
// Core Gemini call with thinking
// ============================================================

async function callGeminiWithThinking(
  systemPrompt: string,
  userPrompt: string,
  onThought?: (text: string) => void,
  maxTokens = 16384,
): Promise<string> {
  const ai = getGenAI();
  if (!ai) throw new Error('No API key');

  const response = await ai.models.generateContentStream({
    model: MODEL_NAME,
    contents: `${systemPrompt}\n\n---\n\n${userPrompt}`,
    config: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
      thinkingConfig: {
        includeThoughts: true,
      },
    },
  });

  let jsonOutput = '';
  for await (const chunk of response) {
    if (chunk.candidates?.[0]?.content?.parts) {
      for (const part of chunk.candidates[0].content.parts) {
        if (!part.text) continue;
        if (part.thought) {
          onThought?.(part.text);
        } else {
          jsonOutput += part.text;
        }
      }
    }
  }

  return jsonOutput;
}

// ============================================================
// CFO Analysis — Phân tích tài chính chuyên sâu
// ============================================================

export async function geminiCFO(
  profile: CompanyProfile,
  onThought?: (text: string) => void,
): Promise<CFOAnalysis> {
  const systemPrompt = `Bạn là CFO hàng đầu Việt Nam với 20 năm kinh nghiệm trong ngành ${profile.industry}.

NHIỆM VỤ: Phân tích tài chính CHI TIẾT và thiết kế phương án phân bổ ngân sách TỐI ƯU.

HÃY SUY NGHĨ SÂU VỀ:
1. Đặc thù ngành ${profile.industry}: cơ cấu chi phí thực tế, biên lợi nhuận trung bình ngành, benchmark các công ty cùng ngành
2. Mục tiêu "${profile.objective}": cần đầu tư vào đâu nhiều nhất? Marketing? R&D? Nhân sự?
3. Quy mô doanh thu ${formatVND(profile.revenue)}: với quy mô này, cơ cấu chi phí nào là hợp lý?
4. Rủi ro cụ thể: không nói chung chung, phải nêu rủi ro THẬT SỰ có thể xảy ra cho công ty này
5. Break-even: với burn rate tính được, bao lâu để hoà vốn? Có hợp lý không?

NGUYÊN TẮC TÀI CHÍNH:
- Biên lợi nhuận hợp lý cho ngành ${profile.industry} (thường 15-25%)
- Chi phí hàng hoá (COGS) phải phản ánh đúng đặc thù ngành
- HR budget phải đủ để thuê đội ngũ chất lượng nhưng không vượt khả năng
- Marketing phải đủ để đạt mục tiêu tăng trưởng
- Mỗi rủi ro phải kèm biện pháp phòng ngừa CỤ THỂ

JSON format (CHỈ JSON, không markdown):
{
  "feasibility": "Khả thi" | "Cần điều chỉnh" | "Rủi ro cao",
  "analysis": "Phân tích 5-8 câu chi tiết: tại sao phân bổ này tối ưu, so sánh với benchmark ngành, điểm mạnh/yếu",
  "budgetAllocation": {
    "cogs": { "percent": number, "amount": number, "note": "giải thích chi tiết tại sao % này phù hợp" },
    "hr": { "percent": number, "amount": number, "note": "giải thích" },
    "marketing": { "percent": number, "amount": number, "note": "giải thích" },
    "operations": { "percent": number, "amount": number, "note": "giải thích" },
    "profit": { "percent": number, "amount": number, "note": "giải thích" }
  },
  "monthlyBurnRate": number,
  "breakEvenMonth": number,
  "risks": ["rủi ro cụ thể 1 — biện pháp phòng ngừa", "rủi ro 2 — phòng ngừa", "rủi ro 3 — phòng ngừa"]
}

TOÁN HỌC BẮT BUỘC:
- Tổng 5 percent = 100
- amount = ${profile.revenue} × percent / 100
- monthlyBurnRate = (tổng 4 mục chi phí) / 12
- profit.percent >= 15`;

  const userPrompt = `Công ty: ${profile.companyName}
Ngành: ${profile.industry}
Mục tiêu kinh doanh: ${profile.objective}
Doanh thu mục tiêu năm: ${formatVND(profile.revenue)} (${profile.revenue} VNĐ)
Sản phẩm/Dịch vụ: ${profile.products}

Hãy phân tích thật kỹ trước khi đưa ra phương án tài chính.${profile.feedback ? `\n\nYÊU CẦU BỔ SUNG TỪ CEO:\n${profile.feedback}` : ''}`;

  const text = await callGeminiWithThinking(systemPrompt, userPrompt, onThought, 4096);
  return JSON.parse(text);
}

// ============================================================
// CEO Strategy — Chiến lược kinh doanh theo quý
// ============================================================

export async function geminiCEO(
  profile: CompanyProfile,
  cfo: CFOAnalysis,
  onThought?: (text: string) => void,
): Promise<CEOStrategy> {
  const systemPrompt = `Bạn là CEO chiến lược hàng đầu Việt Nam. Dựa vào phương án tài chính đã được CFO phê duyệt, hãy xây dựng CHIẾN LƯỢC KINH DOANH TOÀN DIỆN.

HÃY SUY NGHĨ SÂU VỀ:
1. Với ngân sách Marketing ${formatVND(cfo.budgetAllocation.marketing.amount)}: kênh nào hiệu quả nhất cho ${profile.industry}?
2. Với ngân sách HR ${formatVND(cfo.budgetAllocation.hr.amount)}: đội ngũ core cần gì? Khi nào cần tuyển?
3. Giai đoạn nào cần đầu tư mạnh? Giai đoạn nào cần tiết kiệm?
4. Milestones: mốc nào THỰC SỰ quan trọng và đo lường được?
5. KPIs: con số nào THỰC SỰ phản ánh sức khoẻ kinh doanh?
6. Rủi ro CFO nêu (${cfo.risks.slice(0, 2).join('; ')}): chiến lược nào để giảm thiểu?

NGUYÊN TẮC:
- Q1: Xây dựng nền tảng, test thị trường → doanh thu thấp nhất (~18%)
- Q2: Tăng tốc, mở rộng kênh → ~23%
- Q3: Bứt phá, scale → ~28%
- Q4: Thu hoạch, consolidate → ~31%
- Mỗi quý có 3 mục tiêu CỤ THỂ với con số
- 6 KPIs phải SMART: đo được, có deadline, có target number

JSON format (CHỈ JSON):
{
  "vision": "Tầm nhìn 1 năm, 5-8 câu, thể hiện chiến lược rõ ràng với lý do tại sao",
  "quarterlyGoals": [
    {
      "quarter": 1,
      "theme": "Chủ đề quý — hành động cụ thể",
      "revenue": number,
      "keyObjectives": ["mục tiêu 1 có con số", "mục tiêu 2", "mục tiêu 3"],
      "milestones": ["milestone đo lường được 1", "milestone 2"]
    }
  ],
  "companyKPIs": ["KPI SMART 1", "KPI 2", "KPI 3", "KPI 4", "KPI 5", "KPI 6"]
}

TOÁN HỌC: Tổng revenue 4 quý = ${profile.revenue}. quarterlyGoals có đúng 4 phần tử.`;

  const userPrompt = `Công ty: ${profile.companyName} | Ngành: ${profile.industry}
Mục tiêu: ${profile.objective}
Doanh thu: ${formatVND(profile.revenue)} | Sản phẩm: ${profile.products}

Phương án CFO đã duyệt:
- COGS: ${cfo.budgetAllocation.cogs.percent}% (${formatVND(cfo.budgetAllocation.cogs.amount)}) — ${cfo.budgetAllocation.cogs.note}
- HR: ${cfo.budgetAllocation.hr.percent}% (${formatVND(cfo.budgetAllocation.hr.amount)}) — ${cfo.budgetAllocation.hr.note}
- Marketing: ${cfo.budgetAllocation.marketing.percent}% (${formatVND(cfo.budgetAllocation.marketing.amount)}) — ${cfo.budgetAllocation.marketing.note}
- Operations: ${cfo.budgetAllocation.operations.percent}% (${formatVND(cfo.budgetAllocation.operations.amount)})
- Lợi nhuận: ${cfo.budgetAllocation.profit.percent}% (${formatVND(cfo.budgetAllocation.profit.amount)})
- Burn rate: ${formatVND(cfo.monthlyBurnRate)}/tháng | Hoà vốn: ${cfo.breakEvenMonth} tháng
- Rủi ro: ${cfo.risks.join('; ')}

Phân tích: ${cfo.analysis}

Xây dựng chiến lược kinh doanh chi tiết theo quý.${profile.feedback ? `\n\nYÊU CẦU CEO:\n${profile.feedback}` : ''}`;

  const text = await callGeminiWithThinking(systemPrompt, userPrompt, onThought, 8192);
  return JSON.parse(text);
}

// ============================================================
// HR Director — Thiết kế bộ máy nhân sự
// ============================================================

export async function geminiHR(
  profile: CompanyProfile,
  cfo: CFOAnalysis,
  ceo: CEOStrategy,
  onThought?: (text: string) => void,
): Promise<HRPlan> {
  const annualHRBudget = cfo.budgetAllocation.hr.amount;
  const monthlyHRBudget = Math.round(annualHRBudget / 12);

  const systemPrompt = `Bạn là HR Director hàng đầu Việt Nam. Thiết kế BỘ MÁY NHÂN SỰ TỐI ƯU cho công ty.

HÃY SUY NGHĨ SÂU VỀ:
1. Ngân sách HR: ${formatVND(annualHRBudget)}/năm = ${formatVND(monthlyHRBudget)}/tháng — đây là GIỚI HẠN CỨNG
2. Với ngân sách này, thuê được bao nhiêu người? Cần ưu tiên vị trí nào trước?
3. Lương thị trường ngành ${profile.industry} ở Việt Nam: vị trí nào khan hiếm cần trả cao hơn?
4. Phòng ban nào QUAN TRỌNG NHẤT cho mục tiêu "${profile.objective}"?
5. Tuyển dụng phân bổ thế nào qua 4 quý? Q1 cần ai gấp nhất?
6. monthlyOpex (chi phí vận hành/người/tháng): bao gồm bảo hiểm, tools, training, office...

RÀNG BUỘC TOÁN HỌC:
- totalSalary = headcount × avgSalary cho MỖI phòng ban
- monthlySalary = tổng tất cả totalSalary
- monthlyOpex: chi phí vận hành hàng tháng (2-5 triệu/người tuỳ ngành)
- monthlyFixedCost = monthlySalary + monthlyOpex
- yearlyFixedCost = monthlyFixedCost × 12
- yearlyFixedCost PHẢI <= ${annualHRBudget} (KHÔNG ĐƯỢC VƯỢT ngân sách HR)

JSON format (CHỈ JSON):
{
  "totalHeadcount": number,
  "departments": [
    {
      "name": "Tên phòng ban",
      "headcount": number,
      "avgSalary": number,
      "totalSalary": number,
      "budgetPercent": number,
      "description": "mô tả vai trò phòng ban",
      "keyRoles": ["vai trò cần tuyển 1", "vai trò 2"]
    }
  ],
  "monthlySalary": number,
  "monthlyOpex": number,
  "monthlyFixedCost": number,
  "yearlyFixedCost": number,
  "profitMargin": ${cfo.budgetAllocation.profit.percent},
  "hiringPlan": [
    { "quarter": 1, "newHires": number, "departments": ["phòng ban cần tuyển"], "priority": "giải thích ưu tiên" }
  ],
  "compensationPolicy": "Chính sách lương thưởng chi tiết",
  "kpiBonusPolicy": "Chính sách thưởng KPI chi tiết"
}

hiringPlan PHẢI có đúng 4 phần tử (Q1-Q4). Tổng newHires = totalHeadcount.`;

  const userPrompt = `Công ty: ${profile.companyName} | Ngành: ${profile.industry}
Doanh thu: ${formatVND(profile.revenue)} | Sản phẩm: ${profile.products}
Budget HR: ${formatVND(annualHRBudget)}/năm = ${formatVND(monthlyHRBudget)}/tháng (GIỚI HẠN CỨNG)
Mục tiêu: ${profile.objective}

Chiến lược CEO:
${ceo.vision}

Mục tiêu theo quý:
${ceo.quarterlyGoals.map(q => `Q${q.quarter} (${formatVND(q.revenue)}): ${q.theme} — ${q.keyObjectives.join(', ')}`).join('\n')}

Hãy thiết kế bộ máy nhân sự phù hợp với chiến lược và TRONG giới hạn ngân sách.${profile.feedback ? `\n\nYÊU CẦU BỔ SUNG:\n${profile.feedback}` : ''}`;

  const text = await callGeminiWithThinking(systemPrompt, userPrompt, onThought, 8192);
  return JSON.parse(text);
}

// ============================================================
// Post-processing: generate structuredKpis from CEO companyKPIs
// ============================================================

export function generateStructuredKpis(ceo: CEOStrategy): void {
  if (ceo.companyKPIs && Array.isArray(ceo.companyKPIs)) {
    ceo.structuredKpis = ceo.companyKPIs.map((title, idx) => ({
      id: idx + 1,
      title,
      target: Math.floor(Math.random() * 50) + 10,
    }));
  }
}

// ============================================================
// Post-processing: enforce math + budget constraints
// ============================================================

export function enforceConstraints(cfo: CFOAnalysis, hr: HRPlan): void {
  let totalMonthlySalary = 0;
  let totalHeadcount = 0;

  if (hr.departments && Array.isArray(hr.departments)) {
    hr.departments = hr.departments.map(d => {
      const hc = Number(d.headcount) || 0;
      const avgS = Number(d.avgSalary) || 0;
      const totalS = hc * avgS;
      totalHeadcount += hc;
      totalMonthlySalary += totalS;
      return {
        ...d,
        headcount: hc,
        avgSalary: avgS,
        totalSalary: totalS,
        description: `${hc} người · Lương TB ${formatVND(avgS)}/tháng`,
      };
    });
  }

  hr.totalHeadcount = totalHeadcount;
  hr.monthlySalary = totalMonthlySalary;
  hr.monthlyOpex = Number(hr.monthlyOpex) || 0;
  hr.monthlyFixedCost = totalMonthlySalary + hr.monthlyOpex;
  hr.yearlyFixedCost = hr.monthlyFixedCost * 12;

  // Enforce HR budget constraint
  const annualHRBudget = cfo.budgetAllocation.hr.amount;
  if (annualHRBudget > 0 && hr.yearlyFixedCost > annualHRBudget) {
    const scaleFactor = annualHRBudget / hr.yearlyFixedCost;
    totalHeadcount = 0;
    totalMonthlySalary = 0;
    hr.departments = hr.departments.map(d => {
      const newHC = Math.max(1, Math.round(d.headcount * scaleFactor));
      const ts = newHC * d.avgSalary;
      totalHeadcount += newHC;
      totalMonthlySalary += ts;
      return {
        ...d,
        headcount: newHC,
        totalSalary: ts,
        description: `${newHC} người · Lương TB ${formatVND(d.avgSalary)}/tháng`,
      };
    });
    hr.totalHeadcount = totalHeadcount;
    hr.monthlySalary = totalMonthlySalary;
    hr.monthlyFixedCost = totalMonthlySalary + hr.monthlyOpex;
    hr.yearlyFixedCost = hr.monthlyFixedCost * 12;
  }

  hr.budgetUtilization = annualHRBudget > 0 ? Math.round(hr.yearlyFixedCost / annualHRBudget * 100) : 0;
}

// ============================================================
// PUBLIC: Non-streaming (legacy, giữ cho backward compat)
// ============================================================

export async function generateBoardWithGemini(profile: CompanyProfile): Promise<{ board: BoardAnalysis; tree: RoadmapNode }> {
  const ai = getGenAI();

  if (!ai) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình. Vào Vercel → Settings → Environment Variables để thêm.');
  }

  const cfo = await geminiCFO(profile);
  const ceo = await geminiCEO(profile, cfo);
  generateStructuredKpis(ceo);
  const hr = await geminiHR(profile, cfo, ceo);
  enforceConstraints(cfo, hr);

  const board: BoardAnalysis = { cfo, ceo, hr };
  const tree = fallbackTree(profile, board);
  return { board, tree };
}

// ============================================================
// PUBLIC: Streaming — gửi thinking + progress về client
// ============================================================

export async function generateBoardStreaming(
  profile: CompanyProfile,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const ai = getGenAI();

  if (!ai) {
    onEvent({ type: 'error', message: 'GEMINI_API_KEY chưa được cấu hình. Vào Vercel → Settings → Environment Variables để thêm.' });
    return;
  }

  try {
    // Phase 1: CFO
    onEvent({ type: 'phase', phase: 'cfo', label: 'CFO đang phân tích tài chính...' });
    const cfo = await geminiCFO(profile, (text) => {
      onEvent({ type: 'thinking', phase: 'cfo', text });
    });

    // Phase 2: CEO
    onEvent({ type: 'phase', phase: 'ceo', label: 'CEO đang xây dựng chiến lược...' });
    const ceo = await geminiCEO(profile, cfo, (text) => {
      onEvent({ type: 'thinking', phase: 'ceo', text });
    });

    // Post-process CEO: generate structuredKpis
    generateStructuredKpis(ceo);

    // Phase 3: HR
    onEvent({ type: 'phase', phase: 'hr', label: 'HR Director đang thiết kế bộ máy...' });
    const hr = await geminiHR(profile, cfo, ceo, (text) => {
      onEvent({ type: 'thinking', phase: 'hr', text });
    });

    // Post-process
    enforceConstraints(cfo, hr);

    // Build tree
    onEvent({ type: 'phase', phase: 'tree', label: 'Đang xây dựng roadmap chi tiết...' });
    const board: BoardAnalysis = { cfo, ceo, hr };
    const tree = fallbackTree(profile, board);

    onEvent({
      type: 'result',
      data: { board, tree, generatedAt: new Date().toISOString() },
    });
    onEvent({ type: 'phase', phase: 'done', label: 'Hoàn tất phân tích!' });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Gemini streaming error:', errMsg);
    onEvent({ type: 'error', message: `Gemini API lỗi: ${errMsg}` });
  }
}

// ============================================================
// Drill-down: Quarter → 3 Months
// ============================================================

export async function geminiExpandQuarter(
  profile: CompanyProfile,
  board: BoardAnalysis,
  quarterNode: RoadmapNode,
  onThought?: (text: string) => void,
): Promise<RoadmapNode[]> {
  const matchingGoal = board.ceo.quarterlyGoals.find(
    (q) => q.theme === quarterNode.theme || q.revenue === quarterNode.revenue,
  );

  const profitPercent = board.cfo.budgetAllocation.profit.percent;
  const expenseRatio = (100 - profitPercent) / 100;

  const systemPrompt = `Bạn là chuyên gia hoạch định chiến lược kinh doanh với 20 năm kinh nghiệm. Cho chiến lược quý, hãy tạo 3 kế hoạch tháng chi tiết.

NGUYÊN TẮC:
- Doanh thu 3 tháng PHẢI cộng lại ĐÚNG BẰNG doanh thu quý (${quarterNode.revenue})
- Chi phí mỗi tháng = doanh thu tháng × ${expenseRatio} (tỷ lệ chi phí = (100 - ${profitPercent}%) / 100)
- Mỗi tháng phải có chủ đề/trọng tâm KHÁC NHAU
- KPIs phải CỤ THỂ và ĐO LƯỜNG ĐƯỢC (có con số)

JSON format (CHỈ JSON, không markdown):
[
  {
    "title": "Tháng X",
    "description": "Chi tiết hoạt động tháng...",
    "theme": "Chủ đề tháng",
    "department": "Phòng ban trọng tâm",
    "revenue": number,
    "expense": number,
    "kpis": ["KPI cụ thể 1", "KPI cụ thể 2"]
  }
]

Trả về ĐÚNG 3 phần tử.`;

  const deptList = board.hr.departments.map((d) => `${d.name} (${d.headcount} người, roles: ${d.keyRoles.join(', ')})`).join('\n');

  const userPrompt = `THÔNG TIN CÔNG TY:
- Tên: ${profile.companyName}
- Ngành: ${profile.industry}
- Sản phẩm: ${profile.products}
- Mục tiêu: ${profile.objective}

CHIẾN LƯỢC QUÝ:
- Tiêu đề: ${quarterNode.title}
- Chủ đề: ${quarterNode.theme || 'N/A'}
- Mô tả: ${quarterNode.description}
- Doanh thu quý: ${quarterNode.revenue}
${matchingGoal ? `\nMỤC TIÊU CEO CHO QUÝ:
- Mục tiêu chính: ${matchingGoal.keyObjectives.join(', ')}` : ''}
${quarterNode.milestones ? `- Milestones: ${quarterNode.milestones.join(', ')}` : ''}

NGÂN SÁCH CFO:
- COGS: ${board.cfo.budgetAllocation.cogs.percent}%
- HR: ${board.cfo.budgetAllocation.hr.percent}%
- Marketing: ${board.cfo.budgetAllocation.marketing.percent}%
- Operations: ${board.cfo.budgetAllocation.operations.percent}%
- Lợi nhuận: ${profitPercent}%

PHÒNG BAN NHÂN SỰ:
${deptList}

KPIs CÔNG TY:
${board.ceo.companyKPIs.join('\n')}

Hãy tạo kế hoạch 3 tháng chi tiết cho quý này.`;

  const text = await callGeminiWithThinking(systemPrompt, userPrompt, onThought, 4096);
  const months: { title: string; description: string; theme: string; department: string; revenue: number; expense: number; kpis: string[] }[] = JSON.parse(text);

  return months.map((m) => ({
    id: rid(),
    level: 'month' as const,
    title: m.title,
    description: m.description,
    theme: m.theme,
    department: m.department,
    revenue: m.revenue,
    expense: m.expense,
    cashflow: m.revenue - m.expense,
    cashflowStatus: getCashflowStatus(m.revenue, m.expense),
    kpis: m.kpis,
    children: undefined,
    isExpanded: false,
  }));
}

// ============================================================
// Drill-down: Month → 4 Weeks
// ============================================================

export async function geminiExpandMonth(
  profile: CompanyProfile,
  board: BoardAnalysis,
  monthNode: RoadmapNode,
  quarterContext: { theme: string; milestones: string[] },
  onThought?: (text: string) => void,
): Promise<RoadmapNode[]> {
  const systemPrompt = `Bạn là quản lý vận hành cấp cao. Hãy tạo 4 kế hoạch tuần chi tiết cho tháng được giao.

NGUYÊN TẮC:
- Doanh thu 4 tuần PHẢI cộng lại ĐÚNG BẰNG doanh thu tháng (${monthNode.revenue})
- Chi phí mỗi tuần phải hợp lý theo tỷ lệ
- Mỗi tuần có trọng tâm hoạt động khác nhau
- KPIs phải CỤ THỂ và ĐO LƯỜNG ĐƯỢC

JSON format (CHỈ JSON, không markdown):
[
  {
    "title": "Tuần X",
    "description": "Mô tả hoạt động tuần...",
    "revenue": number,
    "expense": number,
    "kpis": ["KPI cụ thể 1", "KPI cụ thể 2"]
  }
]

Trả về ĐÚNG 4 phần tử.`;

  const deptList = board.hr.departments.map((d) => `${d.name} (${d.headcount} người)`).join(', ');

  const userPrompt = `THÔNG TIN CÔNG TY:
- Tên: ${profile.companyName}
- Ngành: ${profile.industry}
- Sản phẩm: ${profile.products}
- Mục tiêu: ${profile.objective}

KẾ HOẠCH THÁNG:
- Tiêu đề: ${monthNode.title}
- Mô tả: ${monthNode.description}
- Chủ đề: ${monthNode.theme || 'N/A'}
- Doanh thu tháng: ${monthNode.revenue}
- KPIs tháng: ${monthNode.kpis.join(', ')}

BỐI CẢNH QUÝ:
- Chủ đề quý: ${quarterContext.theme}
- Milestones quý: ${quarterContext.milestones.join(', ')}

PHÒNG BAN: ${deptList}

Hãy tạo kế hoạch 4 tuần chi tiết.`;

  const text = await callGeminiWithThinking(systemPrompt, userPrompt, onThought, 4096);
  const weeks: { title: string; description: string; revenue: number; expense: number; kpis: string[] }[] = JSON.parse(text);

  // Determine month index from title for date calculations
  const monthMatch = monthNode.title.match(/(\d+)/);
  const monthIndex = monthMatch ? parseInt(monthMatch[1], 10) - 1 : 0; // 0-based
  const year = new Date().getFullYear();

  return weeks.map((w, idx) => {
    const weekStart = new Date(year, monthIndex, 1 + idx * 7);
    const weekEnd = new Date(year, monthIndex, Math.min(7 + idx * 7, new Date(year, monthIndex + 1, 0).getDate()));

    return {
      id: rid(),
      level: 'week' as const,
      title: w.title,
      description: w.description,
      revenue: w.revenue,
      expense: w.expense,
      cashflow: w.revenue - w.expense,
      cashflowStatus: getCashflowStatus(w.revenue, w.expense),
      kpis: w.kpis,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      children: undefined,
      isExpanded: false,
    };
  });
}

// ============================================================
// Drill-down: Week → 5 Days with Task Assignments
// ============================================================

export async function geminiExpandWeek(
  profile: CompanyProfile,
  board: BoardAnalysis,
  weekNode: RoadmapNode,
  employees: { id: number; name: string; department: string; role: string; baseSalary: number }[],
  onThought?: (text: string) => void,
): Promise<RoadmapNode[]> {
  const profitPercent = board.cfo.budgetAllocation.profit.percent;
  const expenseRatio = (100 - profitPercent) / 100;
  const weekExpense = weekNode.revenue * expenseRatio;

  const structuredKpisText = board.ceo.structuredKpis
    ? board.ceo.structuredKpis.map((k) => `ID ${k.id}: ${k.title}`).join('\n')
    : board.ceo.companyKPIs.map((k, i) => `ID ${i + 1}: ${k}`).join('\n');

  const employeeListText = employees.map((e) => `ID ${e.id}: ${e.name} — ${e.department} — ${e.role} — Lương: ${e.baseSalary}`).join('\n');

  const systemPrompt = `Bạn là Giám đốc Nhân sự vận hành. Hãy tạo kế hoạch phân công công việc chi tiết cho 5 ngày làm việc (Thứ 2 - Thứ 6) cho một đội ngũ.

NGUYÊN TẮC:
- assigneeId PHẢI là ID thực tế trong danh sách nhân viên được cung cấp
- Mỗi nhân viên được giao công việc phù hợp với phòng ban/vai trò của họ
- bonusPercent: từ 5% đến 20%
  + Nhân viên Sales/Marketing (tạo doanh thu): bonusPercent cao hơn (15-20%)
  + Nhân viên vận hành/hỗ trợ: bonusPercent thấp hơn (5-10%)
- Doanh thu 5 ngày PHẢI cộng lại ĐÚNG BẰNG doanh thu tuần (${weekNode.revenue})
- Chi phí tuần ước tính: ${Math.round(weekExpense)}
- Mỗi task phải có personalKPI CỤ THỂ và ĐO LƯỜNG ĐƯỢC
- Mỗi ngày có 3-5 tasks

JSON format (CHỈ JSON, không markdown):
[
  {
    "title": "Thứ 2",
    "description": "Mô tả hoạt động ngày...",
    "revenue": number,
    "expense": number,
    "tasks": [
      {
        "title": "Tên công việc cụ thể",
        "description": "Mô tả chi tiết",
        "assigneeId": number,
        "personalKPI": "KPI cá nhân cụ thể, đo lường được",
        "linkedKpiId": number,
        "bonusPercent": number,
        "department": "Phòng ban"
      }
    ]
  }
]

Trả về ĐÚNG 5 phần tử (5 ngày).`;

  const userPrompt = `THÔNG TIN CÔNG TY:
- Tên: ${profile.companyName}
- Ngành: ${profile.industry}
- Sản phẩm: ${profile.products}
- Mục tiêu: ${profile.objective}

KẾ HOẠCH TUẦN:
- Tiêu đề: ${weekNode.title}
- Mô tả: ${weekNode.description}
- Doanh thu tuần: ${weekNode.revenue}
- Chi phí tuần ước tính: ${Math.round(weekExpense)}
- KPIs tuần: ${weekNode.kpis.join(', ')}

DANH SÁCH NHÂN VIÊN:
${employeeListText}

KPIs CẤU TRÚC CỦA CEO:
${structuredKpisText}

Hãy phân công công việc chi tiết cho 5 ngày, gán đúng nhân viên theo năng lực và phòng ban.`;

  const text = await callGeminiWithThinking(systemPrompt, userPrompt, onThought, 16384);
  const days: {
    title: string;
    description: string;
    revenue: number;
    expense: number;
    tasks: {
      title: string;
      description: string;
      assigneeId: number;
      personalKPI: string;
      linkedKpiId: number;
      bonusPercent: number;
      department: string;
    }[];
  }[] = JSON.parse(text);

  // Build employee lookup
  const empMap = new Map(employees.map((e) => [e.id, e]));

  // Calculate start date from weekNode
  const startDate = weekNode.startDate ? new Date(weekNode.startDate) : new Date();

  return days.map((day, dayIdx) => {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + dayIdx);
    const dayDateStr = dayDate.toISOString().split('T')[0];

    const taskChildren: RoadmapNode[] = day.tasks.map((t) => {
      const emp = empMap.get(t.assigneeId);
      const baseSalary = emp?.baseSalary ?? 0;
      const bonusAmount = Math.round((baseSalary * t.bonusPercent) / 100 / 22);

      return {
        id: rid(),
        level: 'task' as const,
        title: t.title,
        description: t.description,
        department: t.department,
        revenue: 0,
        expense: bonusAmount,
        cashflow: -bonusAmount,
        cashflowStatus: getCashflowStatus(0, bonusAmount),
        kpis: [t.personalKPI],
        assigneeId: t.assigneeId,
        assigneeName: emp?.name ?? `Employee #${t.assigneeId}`,
        personalKPI: t.personalKPI,
        linkedKpiId: t.linkedKpiId,
        kpiContribution: 1,
        bonusPercent: t.bonusPercent,
        bonusAmount,
        syncedToTasks: false,
      };
    });

    return {
      id: rid(),
      level: 'day' as const,
      title: day.title,
      description: day.description,
      revenue: day.revenue,
      expense: day.expense,
      cashflow: day.revenue - day.expense,
      cashflowStatus: getCashflowStatus(day.revenue, day.expense),
      kpis: [],
      startDate: dayDateStr,
      children: taskChildren,
      isExpanded: true,
    };
  });
}
