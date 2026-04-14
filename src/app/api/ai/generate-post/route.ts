import { NextResponse } from 'next/server';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-6f2My7cugwJBl0WILYjmmT5JPT4gkN5yUxlldZMeCC3jDiubRIsMcIbH5XtTidbGuwOKlKhrPO8NK0gnrQXyDPq-h6iLDpPdLdUGNDLt9ec1IvPGt8VnCE0';

export async function POST(request: Request) {
  try {
    const { topic } = await request.json();
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const systemPrompt = `You are a social media expert with 12 years experience in writing content for all different types of platforms and have a good understanding of hashtags. 
Generate an engaging social media post under 280 characters. Include relevant emojis and 2-3 hashtags. Make it punchy and attention-grabbing.`;

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