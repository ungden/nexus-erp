// ============================================================
// Gemini 3.1 Pro Preview — NexusERP AI Brain
// Khi có GEMINI_API_KEY → gọi Gemini 3.1 Pro thật
// Khi không có key → fallback về placeholder engine
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CompanyProfile, BoardAnalysis, CFOAnalysis, CEOStrategy, HRPlan, RoadmapNode } from './roadmap-types';
import { generateBoardAnalysis as fallbackBoard, generateRoadmapTree as fallbackTree } from './ai-engine';
import { formatVND } from './format';

const MODEL_NAME = 'gemini-3.1-pro-preview';

function getGenAI(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const genAI = getGenAI();
  if (!genAI) throw new Error('No API key');

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 1.0,  // Gemini 3 khuyến nghị giữ default 1.0
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }],
  });

  return result.response.text();
}

// ============================================================
// CFO Analysis via Gemini
// ============================================================

async function geminiCFO(profile: CompanyProfile): Promise<CFOAnalysis> {
  const systemPrompt = `Bạn là CFO (Giám đốc Tài chính) của một công ty Việt Nam. Phân tích tài chính và trả về JSON.

PHẢI trả về đúng JSON format sau (không có markdown, không có giải thích thêm):
{
  "feasibility": "Khả thi" | "Cần điều chỉnh" | "Rủi ro cao",
  "analysis": "Phân tích tổng quan 2-3 câu bằng tiếng Việt",
  "budgetAllocation": {
    "cogs": { "percent": number, "amount": number, "note": "string" },
    "hr": { "percent": number, "amount": number, "note": "string" },
    "marketing": { "percent": number, "amount": number, "note": "string" },
    "operations": { "percent": number, "amount": number, "note": "string" },
    "profit": { "percent": number, "amount": number, "note": "string" }
  },
  "monthlyBurnRate": number,
  "breakEvenMonth": number,
  "risks": ["rủi ro 1", "rủi ro 2", "rủi ro 3"]
}

Tổng % của 5 mục budgetAllocation PHẢI bằng 100.
amount = revenue * percent / 100.
monthlyBurnRate = tổng chi phí hàng tháng (không tính lợi nhuận).
breakEvenMonth = tháng bắt đầu có lợi nhuận tích lũy dương.`;

  const userPrompt = `Công ty: ${profile.companyName}
Ngành: ${profile.industry}
Mục tiêu: ${profile.objective}
Doanh thu mục tiêu năm: ${profile.revenue} VNĐ (${formatVND(profile.revenue)})
Sản phẩm/Dịch vụ: ${profile.products}`;

  const text = await callGemini(systemPrompt, userPrompt);
  return JSON.parse(text);
}

// ============================================================
// CEO Strategy via Gemini
// ============================================================

async function geminiCEO(profile: CompanyProfile, cfo: CFOAnalysis): Promise<CEOStrategy> {
  const systemPrompt = `Bạn là CEO của một công ty Việt Nam. Dựa vào phân tích tài chính của CFO, xây dựng chiến lược kinh doanh. Trả về JSON.

PHẢI trả về đúng JSON format sau:
{
  "vision": "Tầm nhìn 1 năm, 2-3 câu tiếng Việt",
  "quarterlyGoals": [
    {
      "quarter": 1,
      "theme": "Chủ đề quý bằng tiếng Việt",
      "revenue": number,
      "keyObjectives": ["mục tiêu 1", "mục tiêu 2", "mục tiêu 3"],
      "milestones": ["milestone 1", "milestone 2"]
    }
  ],
  "companyKPIs": ["KPI 1", "KPI 2", "KPI 3", "KPI 4", "KPI 5", "KPI 6"]
}

Tổng revenue 4 quý PHẢI bằng ${profile.revenue}.
quarterlyGoals phải có đúng 4 phần tử (Q1-Q4).
Doanh thu nên tăng dần theo quý.`;

  const userPrompt = `Công ty: ${profile.companyName}
Ngành: ${profile.industry}
Mục tiêu: ${profile.objective}
Doanh thu: ${formatVND(profile.revenue)}
Sản phẩm: ${profile.products}

Phân tích CFO:
- Khả thi: ${cfo.feasibility}
- Biên lợi nhuận: ${cfo.budgetAllocation.profit.percent}%
- Budget HR: ${formatVND(cfo.budgetAllocation.hr.amount)}
- Budget Marketing: ${formatVND(cfo.budgetAllocation.marketing.amount)}
- Rủi ro: ${cfo.risks.join(', ')}`;

  const text = await callGemini(systemPrompt, userPrompt);
  return JSON.parse(text);
}

// ============================================================
// HR Plan via Gemini
// ============================================================

async function geminiHR(profile: CompanyProfile, cfo: CFOAnalysis, ceo: CEOStrategy): Promise<HRPlan> {
  const systemPrompt = `Bạn là HR Director (Giám đốc Nhân sự) của một công ty Việt Nam. Dựa vào chiến lược CEO và ngân sách CFO, thiết kế bộ máy nhân sự. Trả về JSON.

PHẢI trả về đúng JSON format sau:
{
  "totalHeadcount": number,
  "departments": [
    {
      "name": "Tên phòng ban tiếng Việt",
      "headcount": number,
      "avgSalary": number,
      "totalSalary": number,
      "budgetPercent": number,
      "description": "mô tả ngắn",
      "keyRoles": ["vai trò 1", "vai trò 2"]
    }
  ],
  "monthlySalary": number,
  "monthlyOpex": number,
  "monthlyFixedCost": number,
  "yearlyFixedCost": number,
  "profitMargin": number,
  "hiringPlan": [
    { "quarter": 1, "newHires": number, "departments": ["phòng ban"], "priority": "mô tả ưu tiên" }
  ],
  "compensationPolicy": "Chính sách lương thưởng tiếng Việt",
  "kpiBonusPolicy": "Chính sách thưởng KPI tiếng Việt"
}

totalSalary = headcount * avgSalary cho mỗi phòng ban.
monthlySalary = tổng totalSalary tất cả phòng ban.
monthlyFixedCost = monthlySalary + monthlyOpex.
yearlyFixedCost = monthlyFixedCost * 12.
Ngân sách HR hàng năm: ${cfo.budgetAllocation.hr.amount} VNĐ.
hiringPlan phải có đúng 4 phần tử (Q1-Q4).`;

  const userPrompt = `Công ty: ${profile.companyName}
Ngành: ${profile.industry}
Doanh thu: ${formatVND(profile.revenue)}
Budget HR: ${formatVND(cfo.budgetAllocation.hr.amount)}/năm
Chiến lược CEO: ${ceo.vision}
Q1: ${ceo.quarterlyGoals[0]?.theme} | Q2: ${ceo.quarterlyGoals[1]?.theme} | Q3: ${ceo.quarterlyGoals[2]?.theme} | Q4: ${ceo.quarterlyGoals[3]?.theme}`;

  const text = await callGemini(systemPrompt, userPrompt);
  return JSON.parse(text);
}

// ============================================================
// PUBLIC API — Dùng Gemini nếu có key, fallback nếu không
// ============================================================

export async function generateBoardWithGemini(profile: CompanyProfile): Promise<{ board: BoardAnalysis; tree: RoadmapNode }> {
  const genAI = getGenAI();

  if (!genAI) {
    // Fallback to placeholder engine
    const board = fallbackBoard(profile);
    const tree = fallbackTree(profile, board);
    return { board, tree };
  }

  try {
    // Run 3 AI personas sequentially
    const cfo = await geminiCFO(profile);
    const ceo = await geminiCEO(profile, cfo);
    const hr = await geminiHR(profile, cfo, ceo);

    const board: BoardAnalysis = { cfo, ceo, hr };
    const tree = fallbackTree(profile, board); // Tree structure from template, data from Gemini

    return { board, tree };
  } catch (error) {
    console.error('Gemini API error, falling back to placeholder:', error);
    const board = fallbackBoard(profile);
    const tree = fallbackTree(profile, board);
    return { board, tree };
  }
}
