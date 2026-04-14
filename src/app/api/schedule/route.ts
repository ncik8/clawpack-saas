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

function parsePlatform(platformId: string): { basePlatform: string; pageId?: string } {
  const parts = platformId.split('_');
  if (parts.length === 1) {
    return { basePlatform: parts[0] };
  }
  return { basePlatform: parts[0], pageId: parts.slice(1).join('_') };
}

export async function GET(request: Request) {
  try {
    const userId = await getSupabaseUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch posts with their targets
    const { data: posts, error } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*, scheduled_post_targets(*)')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(posts || []);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { content, platforms, scheduledFor, videoUrl, imageUrl, timezone } = await request.json();

    if (!content || !platforms || !scheduledFor) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await getSupabaseUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse platforms and look up connection/page IDs
    const targets: Array<{
      platform: string;
      social_connection_id?: string;
      social_page_id?: string;
      scheduled_for: string;
    }> = [];

    for (const platformId of platforms) {
      const { basePlatform, pageId } = parsePlatform(platformId);

      if (basePlatform === 'facebook') {
        // Facebook - use social_pages (multi-account)
        if (!pageId) {
          // No specific page selected, get all active pages for this platform
          const { data: pages } = await supabaseAdmin
            .from('social_pages')
            .select('id, connection_id')
            .eq('user_id', userId)
            .eq('platform', 'facebook')
            .eq('is_active', true);

          if (pages && pages.length > 0) {
            for (const page of pages) {
              targets.push({
                platform: 'facebook',
                social_connection_id: page.connection_id,
                social_page_id: page.id,
                scheduled_for: scheduledFor,
              });
            }
          }
        } else {
          // Specific page selected
          const { data: page } = await supabaseAdmin
            .from('social_pages')
            .select('id, connection_id')
            .eq('user_id', userId)
            .eq('page_id', pageId)
            .eq('platform', 'facebook')
            .eq('is_active', true)
            .single();

          if (page) {
            targets.push({
              platform: 'facebook',
              social_connection_id: page.connection_id,
              social_page_id: page.id,
              scheduled_for: scheduledFor,
            });
          }
        }
      } else if (basePlatform === 'instagram') {
        // Instagram - use social_connections directly (IG accounts are in social_connections, NOT social_pages)
        // pageId here is actually the Instagram account's platform_user_id from social_connections
        if (!pageId) {
          // No specific account selected, get all active IG connections
          const { data: connections } = await supabaseAdmin
            .from('social_connections')
            .select('id')
            .eq('user_id', userId)
            .eq('platform', 'instagram');

          if (connections && connections.length > 0) {
            for (const conn of connections) {
              targets.push({
                platform: 'instagram',
                social_connection_id: conn.id,
                scheduled_for: scheduledFor,
              });
            }
          }
        } else {
          // Specific account selected - find by platform_user_id
          const { data: connection } = await supabaseAdmin
            .from('social_connections')
            .select('id')
            .eq('user_id', userId)
            .eq('platform', 'instagram')
            .eq('platform_user_id', pageId)
            .single();

          if (connection) {
            targets.push({
              platform: 'instagram',
              social_connection_id: connection.id,
              scheduled_for: scheduledFor,
            });
          }
        }
      } else {
        // Single-account platforms (x, linkedin, bluesky) - use connection directly
        const { data: connection } = await supabaseAdmin
          .from('social_connections')
          .select('*')
          .eq('user_id', userId)
          .eq('platform', basePlatform)
          .single();

        if (connection) {
          targets.push({
            platform: basePlatform,
            social_connection_id: connection.id,
            scheduled_for: scheduledFor,
          });
        }
      }
    }

    if (targets.length === 0) {
      return NextResponse.json({ error: 'No valid targets found' }, { status: 400 });
    }

    // Create scheduled post
    const { data: post, error: postError } = await supabaseAdmin
      .from('scheduled_posts')
      .insert({
        user_id: userId,
        content,
        scheduled_for: scheduledFor,
        status: 'pending',
        video_url: videoUrl || null,
        image_url: imageUrl || null,
        timezone: timezone || 'Asia/Hong_Kong',
      })
      .select()
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: postError?.message || 'Failed to create post' }, { status: 500 });
    }

    // Create targets
    const targetsToInsert = targets.map(t => ({
      ...t,
      scheduled_post_id: post.id,
      user_id: userId,
    }));

    const { error: targetsError } = await supabaseAdmin
      .from('scheduled_post_targets')
      .insert(targetsToInsert);

    if (targetsError) {
      // Rollback: delete the post
      await supabaseAdmin.from('scheduled_posts').delete().eq('id', post.id);
      return NextResponse.json({ error: targetsError.message }, { status: 500 });
    }

    // Fetch the complete post with targets
    const { data: completePost } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*, scheduled_post_targets(*)')
      .eq('id', post.id)
      .single();

    return NextResponse.json(completePost);

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

    // Parse platforms and build targets
    const targets: Array<{
      platform: string;
      social_connection_id?: string;
      social_page_id?: string;
      scheduled_for: string;
    }> = [];

    for (const platformId of platforms) {
      const { basePlatform, pageId } = parsePlatform(platformId);

      if (basePlatform === 'facebook') {
        if (!pageId) {
          const { data: pages } = await supabaseAdmin
            .from('social_pages')
            .select('id, connection_id')
            .eq('user_id', userId)
            .eq('platform', 'facebook')
            .eq('is_active', true);

          if (pages && pages.length > 0) {
            for (const page of pages) {
              targets.push({
                platform: 'facebook',
                social_connection_id: page.connection_id,
                social_page_id: page.id,
                scheduled_for: scheduledFor,
              });
            }
          }
        } else {
          const { data: page } = await supabaseAdmin
            .from('social_pages')
            .select('id, connection_id')
            .eq('user_id', userId)
            .eq('page_id', pageId)
            .eq('platform', 'facebook')
            .eq('is_active', true)
            .single();

          if (page) {
            targets.push({
              platform: 'facebook',
              social_connection_id: page.connection_id,
              social_page_id: page.id,
              scheduled_for: scheduledFor,
            });
          }
        }
      } else if (basePlatform === 'instagram') {
        // Instagram - use social_connections directly
        if (!pageId) {
          const { data: connections } = await supabaseAdmin
            .from('social_connections')
            .select('id')
            .eq('user_id', userId)
            .eq('platform', 'instagram');
          if (connections && connections.length > 0) {
            for (const conn of connections) {
              targets.push({
                platform: 'instagram',
                social_connection_id: conn.id,
                scheduled_for: scheduledFor,
              });
            }
          }
        } else {
          const { data: connection } = await supabaseAdmin
            .from('social_connections')
            .select('id')
            .eq('user_id', userId)
            .eq('platform', 'instagram')
            .eq('platform_user_id', pageId)
            .single();

          if (connection) {
            targets.push({
              platform: 'instagram',
              social_connection_id: connection.id,
              scheduled_for: scheduledFor,
            });
          }
        }
      } else {
        const { data: connection } = await supabaseAdmin
          .from('social_connections')
          .select('id')
          .eq('user_id', userId)
          .eq('platform', basePlatform)
          .single();

        if (connection) {
          targets.push({
            platform: basePlatform,
            social_connection_id: connection.id,
            scheduled_for: scheduledFor,
          });
        }
      }
    }

    if (targets.length === 0) {
      return NextResponse.json({ error: 'No valid targets found' }, { status: 400 });
    }

    // Update post
    const { data: post, error: postError } = await supabaseAdmin
      .from('scheduled_posts')
      .update({
        content,
        scheduled_for: scheduledFor,
        video_url: videoUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: postError?.message || 'Failed to update post' }, { status: 500 });
    }

    // Delete old targets and insert new ones
    await supabaseAdmin
      .from('scheduled_post_targets')
      .delete()
      .eq('scheduled_post_id', id);

    const targetsToInsert = targets.map(t => ({
      ...t,
      scheduled_post_id: post.id,
      user_id: userId,
    }));

    await supabaseAdmin
      .from('scheduled_post_targets')
      .insert(targetsToInsert);

    // Fetch complete post with targets
    const { data: completePost } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*, scheduled_post_targets(*)')
      .eq('id', post.id)
      .single();

    return NextResponse.json(completePost);

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

    // Targets are deleted via CASCADE

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
