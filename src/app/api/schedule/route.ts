import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getSupabaseUser(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) return null;
  return user.id;
}

export async function GET(request: Request) {
  try {
    const userId = await getSupabaseUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { content, platforms, scheduledFor, videoUrl, imageUrl } = await request.json();

    if (!content || !platforms || !scheduledFor) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await getSupabaseUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract base platforms (remove _page_id suffix for FB/IG)
    const basePlatforms = platforms.map((p: string) => p.split('_')[0]);
    
    // Verify user has these platforms connected
    const { data: connections } = await supabaseAdmin
      .from('social_connections')
      .select('platform')
      .eq('user_id', userId)
      .in('platform', basePlatforms);

    const connectedPlatforms = connections?.map(c => c.platform) || [];
    const unconnected = basePlatforms.filter((p: string) => !connectedPlatforms.includes(p));

    if (unconnected.length > 0) {
      return NextResponse.json({ 
        error: `Platforms not connected: ${unconnected.join(', ')}` 
      }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('scheduled_posts')
      .insert({
        user_id: userId,
        content,
        platforms,
        scheduled_for: scheduledFor,
        status: 'pending',
        video_url: videoUrl || null,
        image_url: imageUrl || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, content, platforms, scheduledFor, videoUrl } = await request.json();

    if (!id || !content || !platforms || !scheduledFor) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await getSupabaseUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract base platforms (remove _page_id suffix for FB/IG)
    const basePlatforms = platforms.map((p: string) => p.split('_')[0]);
    
    // Verify user has these platforms connected
    const { data: connections } = await supabaseAdmin
      .from('social_connections')
      .select('platform')
      .eq('user_id', userId)
      .in('platform', basePlatforms);

    const connectedPlatforms = connections?.map(c => c.platform) || [];
    const unconnected = basePlatforms.filter((p: string) => !connectedPlatforms.includes(p));

    if (unconnected.length > 0) {
      return NextResponse.json({ 
        error: `Platforms not connected: ${unconnected.join(', ')}` 
      }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('scheduled_posts')
      .update({
        content,
        platforms,
        scheduled_for: scheduledFor,
        video_url: videoUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
    }

    const userId = await getSupabaseUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('scheduled_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}