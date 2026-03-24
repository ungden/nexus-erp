import { NextRequest } from 'next/server';
import { generateBoardStreaming, StreamEvent } from '@/lib/gemini';
import { CompanyProfile } from '@/lib/roadmap-types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const profile: CompanyProfile = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          await generateBoardStreaming(profile, send);
        } catch (err) {
          send({ type: 'error', message: String(err) });
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
    return new Response(JSON.stringify({ error: 'Failed to start stream' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
