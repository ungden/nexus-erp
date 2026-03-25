import { NextRequest } from 'next/server';
import {
  geminiCFO, geminiCEO, geminiHR,
  enforceConstraints, generateStructuredKpis,
  StreamEvent,
} from '@/lib/gemini';
import {
  CompanyProfile, CFOAnalysis, CEOStrategy, HRPlan,
  BoardAnalysis, RoadmapNode, getCashflowStatus,
} from '@/lib/roadmap-types';

export const maxDuration = 60;

interface PartialRequest {
  profile: CompanyProfile;
  regenerateSection: 'cfo' | 'ceo' | 'hr';
  existingBoard: {
    cfo?: CFOAnalysis;
    ceo?: CEOStrategy;
    hr?: HRPlan;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { profile, regenerateSection, existingBoard }: PartialRequest = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          let cfo: CFOAnalysis;
          let ceo: CEOStrategy;
          let hr: HRPlan;

          if (regenerateSection === 'hr') {
            // Only regenerate HR — reuse existing CFO + CEO
            if (!existingBoard.cfo || !existingBoard.ceo) {
              throw new Error('CFO and CEO data required to regenerate HR');
            }
            cfo = existingBoard.cfo;
            ceo = existingBoard.ceo;

            send({ type: 'phase', phase: 'hr', label: 'HR Director đang phân tích lại bộ máy...' });
            hr = await geminiHR(profile, cfo, ceo, (text) => {
              send({ type: 'thinking', phase: 'hr', text });
            });
            enforceConstraints(cfo, hr);

          } else if (regenerateSection === 'ceo') {
            // Regenerate CEO + HR (CEO changed, HR depends on CEO)
            if (!existingBoard.cfo) {
              throw new Error('CFO data required to regenerate CEO');
            }
            cfo = existingBoard.cfo;

            send({ type: 'phase', phase: 'ceo', label: 'CEO đang xây dựng lại chiến lược...' });
            ceo = await geminiCEO(profile, cfo, (text) => {
              send({ type: 'thinking', phase: 'ceo', text });
            });
            generateStructuredKpis(ceo);

            send({ type: 'phase', phase: 'hr', label: 'HR Director đang thiết kế lại bộ máy...' });
            hr = await geminiHR(profile, cfo, ceo, (text) => {
              send({ type: 'thinking', phase: 'hr', text });
            });
            enforceConstraints(cfo, hr);

          } else {
            // regenerateSection === 'cfo' — full regen since everything depends on CFO
            send({ type: 'phase', phase: 'cfo', label: 'CFO đang phân tích lại tài chính...' });
            cfo = await geminiCFO(profile, (text) => {
              send({ type: 'thinking', phase: 'cfo', text });
            });

            send({ type: 'phase', phase: 'ceo', label: 'CEO đang xây dựng lại chiến lược...' });
            ceo = await geminiCEO(profile, cfo, (text) => {
              send({ type: 'thinking', phase: 'ceo', text });
            });
            generateStructuredKpis(ceo);

            send({ type: 'phase', phase: 'hr', label: 'HR Director đang thiết kế lại bộ máy...' });
            hr = await geminiHR(profile, cfo, ceo, (text) => {
              send({ type: 'thinking', phase: 'hr', text });
            });
            enforceConstraints(cfo, hr);
          }

          // Build tree stubs inline (Year + 4 Quarters)
          send({ type: 'phase', phase: 'tree', label: 'Đang xây dựng roadmap chi tiết...' });
          const board: BoardAnalysis = { cfo, ceo, hr };
          const rid = () => Math.random().toString(36).substring(2, 10);
          const expenseRatio = (100 - board.cfo.budgetAllocation.profit.percent) / 100;
          const totalExpense = Math.round(profile.revenue * expenseRatio);

          const tree: RoadmapNode = {
            id: rid(),
            level: 'year',
            title: `Kế hoạch ${profile.companyName} ${new Date().getFullYear()}`,
            description: board.ceo.vision,
            revenue: profile.revenue,
            expense: totalExpense,
            cashflow: profile.revenue - totalExpense,
            cashflowStatus: getCashflowStatus(profile.revenue, totalExpense),
            kpis: board.ceo.companyKPIs.slice(0, 3),
            children: board.ceo.quarterlyGoals.map((q, i) => {
              const qExp = Math.round(q.revenue * expenseRatio);
              return {
                id: rid(),
                level: 'quarter' as const,
                title: `Quý ${i + 1}`,
                description: q.keyObjectives.join(' · '),
                theme: q.theme,
                milestones: q.milestones,
                revenue: q.revenue,
                expense: qExp,
                cashflow: q.revenue - qExp,
                cashflowStatus: getCashflowStatus(q.revenue, qExp),
                kpis: board.ceo.companyKPIs.slice(0, 3),
                children: undefined,
                isExpanded: false,
              };
            }),
            isExpanded: true,
          };

          send({
            type: 'result',
            data: { board, tree, generatedAt: new Date().toISOString() },
          });
          send({ type: 'phase', phase: 'done', label: 'Hoàn tất phân tích lại!' });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error('Partial regeneration error:', errMsg);
          send({ type: 'error', message: `Lỗi khi phân tích lại: ${errMsg}` });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to start partial stream' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
