import { NextResponse } from 'next/server';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-6f2My7cugwJBl0WILYjmmT5JPT4gkN5yUxlldZMeCC3jDiubRIsMcIbH5XtTidbGuwOKlKhrPO8NK0gnrQXyDPq-h6iLDpPdLdUGNDLt9ec1IvPGt8VnCE0';

export async function POST(request: Request) {
  try {
    const { topic } = await request.json();
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert social media content creator with 15 years of experience crafting viral posts for X/Twitter, LinkedIn, Facebook, Instagram and Bluesky.

Rules:
1. ALWAYS add 2-4 relevant trending hashtags with emojis
2. ALWAYS use punchy, attention-grabbing language
3. Keep posts under 280 characters for X, or engaging paragraph for LinkedIn
4. Make it conversational, not corporate
5. End with a question or call-to-action to boost engagement
6. For news topics, give a bold opinion or surprising angle`;

    const response = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-M2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a social media post about: ${topic}` }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('MiniMax API error:', error);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const data = await response.json();
    let generatedText = data.choices?.[0]?.message?.content?.trim() || '';

    
    // Fallback: some models put response in reasoning_content
    if (!generatedText && data.choices?.[0]?.message?.reasoning_content) {
      generatedText = data.choices[0].message.reasoning_content.trim();
    }
    
    // If still empty, return error with context
    if (!generatedText) {
      console.error('MiniMax empty response:', JSON.stringify(data));
      return NextResponse.json({ error: 'AI returned empty response. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ content: generatedText });
  } catch (error: any) {
    console.error('Generate post error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}