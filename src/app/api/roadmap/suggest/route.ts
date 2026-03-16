import { NextRequest, NextResponse } from 'next/server';
import { suggestCompanyStructure } from '@/lib/ai-suggest';

export async function POST(request: NextRequest) {
  try {
    const { industry, targetRevenue } = await request.json();
    
    // TODO: Khi có GEMINI_API_KEY, gọi Gemini để suggest thông minh hơn
    
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate AI thinking
    const suggestion = suggestCompanyStructure(industry, targetRevenue);
    
    return NextResponse.json(suggestion);
  } catch {
    return NextResponse.json({ error: 'Failed to suggest' }, { status: 500 });
  }
}
