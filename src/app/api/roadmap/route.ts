import { NextRequest, NextResponse } from 'next/server';
import { generateBoardAnalysis, generateRoadmapTree } from '@/lib/ai-engine';
import { CompanyProfile } from '@/lib/roadmap-types';

export async function POST(request: NextRequest) {
  try {
    const profile: CompanyProfile = await request.json();
    // TODO: Khi có GEMINI_API_KEY, gọi Gemini thật cho mỗi AI persona
    await new Promise(resolve => setTimeout(resolve, 2000));
    const board = generateBoardAnalysis(profile);
    const tree = generateRoadmapTree(profile, board);
    return NextResponse.json({ board, tree, generatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 });
  }
}
