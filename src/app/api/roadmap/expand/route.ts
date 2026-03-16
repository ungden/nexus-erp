import { NextRequest, NextResponse } from 'next/server';
import { expandNode } from '@/lib/ai-roadmap';
import { RoadmapNode, CompanyProfile } from '@/lib/roadmap-types';

interface ExpandRequest {
  node: RoadmapNode;
  profile: CompanyProfile;
  employees?: { id: number; name: string; department: string; role: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const { node, profile, employees }: ExpandRequest = await request.json();
    
    // TODO: Khi có GEMINI_API_KEY, gọi Gemini thật ở đây
    
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate AI thinking
    const children = expandNode(node, profile, employees);
    
    return NextResponse.json({ children });
  } catch {
    return NextResponse.json({ error: 'Failed to expand node' }, { status: 500 });
  }
}
