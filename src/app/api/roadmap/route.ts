import { NextRequest, NextResponse } from 'next/server';
import { generateBoardWithGemini } from '@/lib/gemini';
import { CompanyProfile } from '@/lib/roadmap-types';

export async function POST(request: NextRequest) {
  try {
    const profile: CompanyProfile = await request.json();
    const { board, tree } = await generateBoardWithGemini(profile);
    return NextResponse.json({ board, tree, generatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 });
  }
}
