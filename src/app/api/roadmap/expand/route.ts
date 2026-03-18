import { NextRequest, NextResponse } from 'next/server';
import { expandNode } from '@/lib/ai-engine';
import { RoadmapNode, CompanyProfile, BoardAnalysis } from '@/lib/roadmap-types';

export const maxDuration = 15;

interface ExpandRequest {
  node: RoadmapNode;
  profile: CompanyProfile;
  board: BoardAnalysis;
  employees?: { id: number; name: string; department: string; role: string; baseSalary: number }[];
}

export async function POST(request: NextRequest) {
  try {
    const { node, profile, board, employees }: ExpandRequest = await request.json();
    const children = expandNode(node, profile, board, employees);
    return NextResponse.json({ children });
  } catch {
    return NextResponse.json({ error: 'Failed to expand' }, { status: 500 });
  }
}
