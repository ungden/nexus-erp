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

async function callGemini(systemPrompt: string, userPrompt: string, maxTokens = 16384): Promise<string> {
  const genAI = getGenAI();
  if (!genAI) throw new Error('No API key');

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 1.0,
      maxOutputTokens: maxTokens,
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
  const systemPrompt = `Bạn là CFO hàng đầu Việt Nam với 20 năm kinh nghiệm. Nhiệm vụ: thiết kế PHƯƠNG ÁN TÀI CHÍNH TỐI ƯU NHẤT.

QUAN TRỌNG: 
- Bạn PHẢI đưa ra phương án KHẢ THI. Luôn set feasibility = "Khả thi".
- KHÔNG BAO GIỜ nói "Cần điều chỉnh" hay "Rủi ro cao". Thay vào đó, hãy TỐI ƯU phân bổ ngân sách để phương án luôn khả thi.
- Biên lợi nhuận PHẢI từ 15-25% tuỳ ngành.
- Phân tích analysis phải nêu rõ TẠI SAO phương án này tối ưu, điểm mạnh là gì.
- Mục risks: nêu rủi ro tiềm ẩn VÀ cách phòng ngừa cụ thể.

JSON format (KHÔNG markdown, KHÔNG giải thích ngoài JSON):
{
  "feasibility": "Khả thi",
  "analysis": "3-5 câu tiếng Việt giải thích tại sao phương án tài chính này là tối ưu nhất cho công ty",
  "budgetAllocation": {
    "cogs": { "percent": number, "amount": number, "note": "giải thích chi tiết" },
    "hr": { "percent": number, "amount": number, "note": "giải thích" },
    "marketing": { "percent": number, "amount": number, "note": "giải thích" },
    "operations": { "percent": number, "amount": number, "note": "giải thích" },
    "profit": { "percent": number, "amount": number, "note": "giải thích" }
  },
  "monthlyBurnRate": number,
  "breakEvenMonth": number,
  "risks": ["rủi ro 1 + cách phòng ngừa", "rủi ro 2 + cách phòng ngừa", "rủi ro 3 + cách phòng ngừa"]
}

TOÁN HỌC BẮT BUỘC:
- Tổng 5 percent = 100
- amount = doanh_thu × percent / 100  
- monthlyBurnRate = (tổng 4 mục chi phí) / 12
- profit.percent >= 15`;

  const userPrompt = `Công ty: ${profile.companyName}
Ngành: ${profile.industry}  
Mục tiêu: ${profile.objective}
Doanh thu mục tiêu: ${formatVND(profile.revenue)} (${profile.revenue} VNĐ)
Sản phẩm: ${profile.products}

Thiết kế phương án tài chính TỐI ƯU NHẤT cho công ty này.${profile.feedback ? `\n\nYÊU CẦU BỔ SUNG TỪ CEO:\n${profile.feedback}` : ''}`;

  const text = await callGemini(systemPrompt, userPrompt, 4096);
  return JSON.parse(text);
}

// ============================================================
// CEO Strategy via Gemini
// ============================================================

async function geminiCEO(profile: CompanyProfile, cfo: CFOAnalysis): Promise<CEOStrategy> {
  const systemPrompt = `Bạn là CEO tài ba nhất Việt Nam. Dựa vào phương án tài chính đã được CFO tối ưu, hãy xây dựng CHIẾN LƯỢC KINH DOANH TỐI ƯU NHẤT.

Hãy suy nghĩ thật sâu:
- Vision phải thể hiện tham vọng nhưng thực tế
- Mỗi quý phải có theme rõ ràng, mục tiêu cụ thể và milestone đo lường được
- Doanh thu phải tăng dần qua các quý (Q1 thấp nhất, Q4 cao nhất)
- KPIs phải SMART (đo lường được, có con số cụ thể)

JSON format (KHÔNG markdown):
{
  "vision": "Tầm nhìn 1 năm, 3-5 câu tiếng Việt, thể hiện chiến lược tổng thể",
  "quarterlyGoals": [
    {
      "quarter": 1,
      "theme": "Chủ đề quý cụ thể, hành động",
      "revenue": number,
      "keyObjectives": ["mục tiêu cụ thể có số liệu 1", "mục tiêu 2", "mục tiêu 3"],
      "milestones": ["milestone đo lường được 1", "milestone 2"]
    }
  ],
  "companyKPIs": ["KPI SMART 1", "KPI 2", "KPI 3", "KPI 4", "KPI 5", "KPI 6"]
}

TOÁN HỌC: Tổng revenue 4 quý PHẢI = ${profile.revenue}. Phân bổ tăng dần: Q1~18%, Q2~23%, Q3~28%, Q4~31%.
quarterlyGoals PHẢI có đúng 4 phần tử.`;

  const userPrompt = `Công ty: ${profile.companyName} | Ngành: ${profile.industry}
Mục tiêu: ${profile.objective}
Doanh thu: ${formatVND(profile.revenue)} | Sản phẩm: ${profile.products}

Phương án CFO đã duyệt:
- Lợi nhuận: ${cfo.budgetAllocation.profit.percent}% (${formatVND(cfo.budgetAllocation.profit.amount)})
- HR: ${formatVND(cfo.budgetAllocation.hr.amount)} | Marketing: ${formatVND(cfo.budgetAllocation.marketing.amount)}
- Rủi ro cần lưu ý: ${cfo.risks.join('; ')}

Xây dựng chiến lược kinh doanh TỐI ƯU NHẤT.${profile.feedback ? `\n\nYÊU CẦU CEO:\n${profile.feedback}` : ''}`;

  const text = await callGemini(systemPrompt, userPrompt, 8192);
  return JSON.parse(text);
}

// ============================================================
// HR Plan via Gemini
// ============================================================

async function geminiHR(profile: CompanyProfile, cfo: CFOAnalysis, ceo: CEOStrategy): Promise<HRPlan> {
  const systemPrompt = `Bạn là HR Director hàng đầu Việt Nam. Thiết kế BỘ MÁY NHÂN SỰ TỐI ƯU NHẤT dựa trên chiến lược CEO và ngân sách CFO.

Nguyên tắc:
- Tổng lương hàng năm KHÔNG ĐƯỢC vượt quá ngân sách HR: ${formatVND(cfo.budgetAllocation.hr.amount)}
- Mỗi phòng ban phải có ít nhất 1 người
- Lương phải phù hợp thị trường Việt Nam cho ngành ${profile.industry}
- totalSalary = headcount × avgSalary (TÍNH ĐÚNG!)
- monthlySalary = tổng tất cả totalSalary
- monthlyFixedCost = monthlySalary + monthlyOpex

JSON format:
{
  "totalHeadcount": number,
  "departments": [
    {
      "name": "Tên phòng ban",
      "headcount": number,
      "avgSalary": number,
      "totalSalary": number,
      "budgetPercent": number,
      "description": "mô tả",
      "keyRoles": ["vai trò 1", "vai trò 2"]
    }
  ],
  "monthlySalary": number,
  "monthlyOpex": number,
  "monthlyFixedCost": number,
  "yearlyFixedCost": number,
  "profitMargin": number,
  "hiringPlan": [
    { "quarter": 1, "newHires": number, "departments": ["phòng ban"], "priority": "mô tả" }
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
Q1: ${ceo.quarterlyGoals[0]?.theme} | Q2: ${ceo.quarterlyGoals[1]?.theme} | Q3: ${ceo.quarterlyGoals[2]?.theme} | Q4: ${ceo.quarterlyGoals[3]?.theme}${profile.feedback ? `\n\nYÊU CẦU BỔ SUNG:\n${profile.feedback}` : ''}`;

  const text = await callGemini(systemPrompt, userPrompt, 8192);
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
    // Run 3 AI personas sequentially with individual timeout protection
    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
      ]);

    const cfo = await withTimeout(geminiCFO(profile), 18000, 'CFO');
    const ceo = await withTimeout(geminiCEO(profile, cfo), 18000, 'CEO');
    const hr = await withTimeout(geminiHR(profile, cfo, ceo), 18000, 'HR');

    // FIX MATH: LLMs are bad at math, so recalculate totals to be safe
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
          description: `${hc} người · Lương TB ${formatVND(avgS)}/tháng`
        };
      });
    }

    hr.totalHeadcount = totalHeadcount;
    hr.monthlySalary = totalMonthlySalary;
    hr.monthlyOpex = Number(hr.monthlyOpex) || 0;
    hr.monthlyFixedCost = totalMonthlySalary + hr.monthlyOpex;
    hr.yearlyFixedCost = hr.monthlyFixedCost * 12;

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
