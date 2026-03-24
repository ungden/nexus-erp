import { NextRequest, NextResponse } from 'next/server';
import { generateBoardWithGemini } from '@/lib/gemini';
import { CompanyProfile } from '@/lib/roadmap-types';

// Vercel free tier = 60s max. Nâng lên tối đa cho phép.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const profile: CompanyProfile = await request.json();
    const { board, tree } = await generateBoardWithGemini(profile);
    return NextResponse.json({ board, tree, generatedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Roadmap API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
