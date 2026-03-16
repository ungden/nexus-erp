import { NextRequest, NextResponse } from 'next/server';
import { batchExpandQuarters, batchExpandMonths } from '@/lib/ai-engine';
import { RoadmapNode, CompanyProfile, BoardAnalysis } from '@/lib/roadmap-types';

interface BatchRequest {
  action: 'expand-quarters' | 'expand-months';
  tree: RoadmapNode;
  profile: CompanyProfile;
  board: BoardAnalysis;
  employees?: { id: number; name: string; department: string; role: string; baseSalary: number }[];
}

export async function POST(request: NextRequest) {
  try {
    const { action, tree, profile, board, employees }: BatchRequest = await request.json();
    await new Promise(r => setTimeout(r, 1000));

    let updatedTree: RoadmapNode;
    if (action === 'expand-quarters') {
      updatedTree = batchExpandQuarters(tree, profile, board);
    } else if (action === 'expand-months') {
      updatedTree = batchExpandMonths(tree, profile, board, employees);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ tree: updatedTree });
  } catch {
    return NextResponse.json({ error: 'Batch expand failed' }, { status: 500 });
  }
}
