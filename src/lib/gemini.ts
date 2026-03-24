// ============================================================
// NexusERP AI Brain — Google Gemini with Thinking Mode
// Sử dụng @google/genai SDK mới với thinking + streaming
// CFO → CEO → HR Director — mỗi bước suy nghĩ sâu trước khi output
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { CompanyProfile, BoardAnalysis, CFOAnalysis, CEOStrategy, HRPlan, RoadmapNode } from './roadmap-types';
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
  | { type: 'error'; message: string };

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

async function geminiCFO(
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

async function geminiCEO(
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

async function geminiHR(
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
// Post-processing: enforce math + budget constraints
// ============================================================

function enforceConstraints(cfo: CFOAnalysis, hr: HRPlan): void {
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
    const board = fallbackBoard(profile);
    const tree = fallbackTree(profile, board);
    return { board, tree };
  }

  try {
    const cfo = await geminiCFO(profile);
    const ceo = await geminiCEO(profile, cfo);
    const hr = await geminiHR(profile, cfo, ceo);
    enforceConstraints(cfo, hr);

    const board: BoardAnalysis = { cfo, ceo, hr };
    const tree = fallbackTree(profile, board);
    return { board, tree };
  } catch (error) {
    console.error('Gemini API error, falling back to placeholder:', error);
    const board = fallbackBoard(profile);
    const tree = fallbackTree(profile, board);
    return { board, tree };
  }
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
    onEvent({ type: 'phase', phase: 'cfo', label: 'Đang phân tích tài chính...' });
    const board = fallbackBoard(profile);
    onEvent({ type: 'phase', phase: 'tree', label: 'Đang xây dựng roadmap...' });
    const tree = fallbackTree(profile, board);
    onEvent({
      type: 'result',
      data: { board, tree, generatedAt: new Date().toISOString() },
    });
    onEvent({ type: 'phase', phase: 'done', label: 'Hoàn tất!' });
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
    console.error('Gemini streaming error, falling back:', error);
    onEvent({ type: 'phase', phase: 'cfo', label: 'Đang tạo kế hoạch...' });
    const board = fallbackBoard(profile);
    const tree = fallbackTree(profile, board);
    onEvent({
      type: 'result',
      data: { board, tree, generatedAt: new Date().toISOString() },
    });
    onEvent({ type: 'phase', phase: 'done', label: 'Hoàn tất!' });
  }
}
