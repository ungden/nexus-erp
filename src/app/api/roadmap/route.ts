import { NextRequest, NextResponse } from 'next/server';
import { generateYearRoadmap } from '@/lib/ai-roadmap';
import { CompanyProfile } from '@/lib/roadmap-types';

export async function POST(request: NextRequest) {
  try {
    const profile: CompanyProfile = await request.json();
    
    // TODO: Khi có GEMINI_API_KEY, gọi Gemini thật ở đây
    // const apiKey = process.env.GEMINI_API_KEY;
    // if (apiKey) { ... gọi Gemini ... }
    
    // Hiện tại dùng AI giả lập thông minh
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI thinking
    const tree = generateYearRoadmap(profile);
    
    return NextResponse.json({ tree, generatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: 'Failed to generate roadmap' }, { status: 500 });
  }
}
