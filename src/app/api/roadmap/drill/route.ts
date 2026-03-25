import { NextRequest } from 'next/server';
import {
  geminiExpandQuarter, geminiExpandMonth, geminiExpandWeek,
  StreamEvent,
} from '@/lib/gemini';
import {
  CompanyProfile, BoardAnalysis, RoadmapNode,
} from '@/lib/roadmap-types';

export const maxDuration = 60;

interface DrillRequest {
  profile: CompanyProfile;
  board: BoardAnalysis;
  parentNode: RoadmapNode;
  targetLevel: 'month' | 'week' | 'day';
  employees?: { id: number; name: string; department: string; role: string; baseSalary: number }[];
}

export async function POST(request: NextRequest) {
  try {
    const { profile, board, parentNode, targetLevel, employees }: DrillRequest = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          let children: RoadmapNode[];

          if (targetLevel === 'month') {
            send({ type: 'drill-phase', label: 'AI đang phân tích chi tiết quý...' });
            children = await geminiExpandQuarter(profile, board, parentNode, (text: string) => {
              send({ type: 'drill-thinking', text });
            });

          } else if (targetLevel === 'week') {
            send({ type: 'drill-phase', label: 'AI đang lên kế hoạch tháng...' });
            const quarterContext = {
              theme: parentNode.theme || '',
              milestones: parentNode.milestones || [],
            };
            children = await geminiExpandMonth(profile, board, parentNode, quarterContext, (text: string) => {
              send({ type: 'drill-thinking', text });
            });

          } else {
            // targetLevel === 'day'
            send({ type: 'drill-phase', label: 'AI đang phân công nhiệm vụ tuần...' });
            children = await geminiExpandWeek(profile, board, parentNode, employees || [], (text: string) => {
              send({ type: 'drill-thinking', text });
            });
          }

          send({ type: 'drill-result', children });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error('Drill AI error:', errMsg);
          send({ type: 'drill-error', message: `Lỗi khi phân tích: ${errMsg}` });
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
    return new Response(JSON.stringify({ error: 'Failed to start drill stream' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
