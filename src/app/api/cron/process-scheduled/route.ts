import { NextResponse } from 'next/server';

// This endpoint is called by Vercel Cron to process scheduled posts
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dcyifihwvqxtpypphpef.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase key' }, { status: 500 });
    }

    // Get scheduled posts that are due
    const now = new Date().toISOString();
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/scheduled_posts?status=eq.scheduled&scheduled_time=lte.${now}&select=*`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          ' Prefer': 'return=representation'
        }
      }
    );

    const posts = await response.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ message: 'No posts to process', processed: 0 });
    }

    let processed = 0;
    let errors = 0;

    for (const post of posts) {
      try {
        // Get user's social connection tokens
        const connectionRes = await fetch(
          `${supabaseUrl}/rest/v1/social_connections?user_id=eq.${post.user_id}&platform=eq.${post.platform}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        );

        const connections = await connectionRes.json();

        if (!connections || connections.length === 0) {
          console.log(`No connection found for user ${post.user_id} platform ${post.platform}`);
          continue;
        }

        const connection = connections[0];

        // Post based on platform
        let postResult;
        
        if (post.platform === 'x' || post.platform === 'twitter') {
          postResult = await postToX(post.content, connection);
        } else if (post.platform === 'linkedin') {
          postResult = await postToLinkedIn(post.content, connection);
        } else if (post.platform === 'bluesky') {
          postResult = await postToBluesky(post.content, connection);
        }

        // Update post status to published
        await fetch(
          `${supabaseUrl}/rest/v1/scheduled_posts?id=eq.${post.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              status: 'published',
              published_at: new Date().toISOString()
            })
          }
        );

        processed++;
      } catch (err) {
        console.error(`Error processing post ${post.id}:`, err);
        errors++;
        
        // Mark as failed
        await fetch(
          `${supabaseUrl}/rest/v1/scheduled_posts?id=eq.${post.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ status: 'failed' })
          }
        );
      }
    }

    return NextResponse.json({ 
      message: 'Processed scheduled posts',
      processed,
      errors 
    });

  } catch (error) {
    console.error('Process scheduled error:', error);
    return NextResponse.json({ error: 'Failed to process posts' }, { status: 500 });
  }
}

async function postToX(content: string, connection: any) {
  // X/Twitter posting logic using OAuth 1.0a
  // This would use the stored access_token and refresh_token
  console.log('Posting to X:', content.substring(0, 50));
  return { success: true };
}

async function postToLinkedIn(content: string, connection: any) {
  // LinkedIn posting logic
  console.log('Posting to LinkedIn:', content.substring(0, 50));
  return { success: true };
}

async function postToBluesky(content: string, connection: any) {
  // Bluesky posting logic using app password
  console.log('Posting to Bluesky:', content.substring(0, 50));
  return { success: true };
}
