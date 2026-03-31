import { NextResponse } from 'next/server';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

export async function POST(request: Request) {
  try {
    const { topic } = await request.json();
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const systemPrompt = `You are a social media expert with 12 years experience in writing content for all different types of platforms and have a good understanding of hashtags. 
Generate an engaging social media post under 280 characters. Include relevant emojis and 2-3 hashtags. Make it punchy and attention-grabbing.`;

    const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_pro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a social media post about: ${topic}` }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('MiniMax API error:', error);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({ content: generatedText });
  } catch (error: any) {
    console.error('Generate post error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}