'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const PLATFORM_INFO: Record<string, { name: string; emoji: string }> = {
  'x': { name: 'X / Twitter', emoji: '🐦' },
  'linkedin': { name: 'LinkedIn', emoji: '💼' },
  'facebook': { name: 'Facebook', emoji: '🐘' },
  'instagram': { name: 'Instagram', emoji: '📷' },
  'bluesky': { name: 'Bluesky', emoji: '💙' },
};

export default function DashboardPage() {
  const [stats, setStats] = useState({ posts: 0, scheduled: 0, connected: 0 });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // Get user name
      const userMeta = session.user.user_metadata;
      setUserName(userMeta?.full_name || userMeta?.name || 'there');

      const userId = session.user.id;

      // Count social connections
      const { count: connCount } = await supabase
        .from('social_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Count scheduled posts
      const { count: schedCount } = await supabase
        .from('scheduled_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');

      // Count sent posts
      const { count: sentCount } = await supabase
        .from('scheduled_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'sent');

      setStats({
        posts: sentCount || 0,
        scheduled: schedCount || 0,
        connected: connCount || 0,
      });

      // Fetch upcoming scheduled posts
      const { data: upcoming } = await supabase
        .from('scheduled_posts')
        .select('*, scheduled_post_targets(*)')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true })
        .limit(5);

      if (upcoming) {
        setUpcomingPosts(upcoming);
      }

      // Fetch recent sent posts
      const { data: recent } = await supabase
        .from('scheduled_posts')
        .select('*, scheduled_post_targets(*)')
        .eq('user_id', userId)
        .eq('status', 'sent')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (recent) {
        setRecentPosts(recent);
      }

    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPlatformIcon = (platform: string) => {
    const info = PLATFORM_INFO[platform] || { name: platform, emoji: '📱' };
    return info.emoji;
  };

  const getPostPlatforms = (targets: any[]) => {
    if (!targets || targets.length === 0) return [];
    const platforms = [...new Set(targets.map(t => t.platform))];
    return platforms;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Good morning{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-[#9ca3af] mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Link href="/dashboard/create" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          Create Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-3xl font-bold text-white">{loading ? '...' : stats.posts}</p>
          <p className="text-[#9ca3af] text-sm mt-1">Posts Sent</p>
        </div>
        <div className="card">
          <p className="text-3xl font-bold text-white">{loading ? '...' : stats.scheduled}</p>
          <p className="text-[#9ca3af] text-sm mt-1">Scheduled</p>
        </div>
        <div className="card">
          <p className="text-3xl font-bold text-white">{loading ? '...' : stats.connected}</p>
          <p className="text-[#9ca3af] text-sm mt-1">Connected</p>
        </div>
        <div className="card">
          <p className="text-3xl font-bold text-white">
            {getPlatformEmojiCount(stats.connected)}
          </p>
          <p className="text-[#9ca3af] text-sm mt-1">Platforms</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Posts</h2>
            {recentPosts.length > 0 && (
              <Link href="/dashboard/calendar" className="text-sm text-[#1780e3] hover:underline">
                View all
              </Link>
            )}
          </div>
          
          {loading ? (
            <p className="text-[#6b7280] text-sm">Loading...</p>
          ) : recentPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#6b7280] mb-2">No posts sent yet</p>
              <Link href="/dashboard/create" className="text-[#1780e3] text-sm hover:underline">
                Create your first post →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => {
                const platforms = getPostPlatforms(post.scheduled_post_targets || []);
                return (
                  <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#111827] border border-[#374151]">
                    <div className="flex gap-1">
                      {platforms.map(p => (
                        <span key={p} style={{ fontSize: '16px' }}>{getPlatformIcon(p)}</span>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white line-clamp-2">{post.content}</p>
                      <p className="text-xs text-[#6b7280] mt-2">
                        Sent {formatDate(post.updated_at || post.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Posts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Upcoming</h2>
            {upcomingPosts.length > 0 && (
              <Link href="/dashboard/scheduler" className="text-sm text-[#1780e3] hover:underline">
                View calendar
              </Link>
            )}
          </div>
          
          {loading ? (
            <p className="text-[#6b7280] text-sm">Loading...</p>
          ) : upcomingPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#6b7280] mb-2">No scheduled posts</p>
              <Link href="/dashboard/scheduler" className="text-[#1780e3] text-sm hover:underline">
                Schedule a post →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingPosts.map((post) => {
                const platforms = getPostPlatforms(post.scheduled_post_targets || []);
                return (
                  <div key={post.id} className="flex items-center justify-between p-3 rounded-lg bg-[#111827] border border-[#374151]">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {platforms.map(p => (
                          <span key={p} style={{ fontSize: '16px' }}>{getPlatformIcon(p)}</span>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm text-white line-clamp-1">{post.content}</p>
                        <p className="text-xs text-[#6b7280]">{formatDate(post.scheduled_for)}</p>
                      </div>
                    </div>
                    <Link 
                      href="/dashboard/scheduler"
                      className="btn btn-ghost text-xs py-1 px-2"
                    >
                      View
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex gap-3">
          <Link href="/dashboard/create" className="card card-hover flex items-center gap-3">
            <WriteIcon className="w-5 h-5 text-[#1780e3]" />
            <span className="text-white font-medium">Write Post</span>
          </Link>
          <Link href="/dashboard/scheduler" className="card card-hover flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-[#10b981]" />
            <span className="text-white font-medium">Schedule</span>
          </Link>
          <Link href="/dashboard/connected-accounts" className="card card-hover flex items-center gap-3">
            <LinkIcon className="w-5 h-5 text-[#8b5cf6]" />
            <span className="text-white font-medium">Accounts</span>
          </Link>
          <Link href="/dashboard/analytics" className="card card-hover flex items-center gap-3">
            <ChartIcon className="w-5 h-5 text-[#E4405F]" />
            <span className="text-white font-medium">Analytics</span>
          </Link>
        </div>
      </div>

      {/* Empty state for no connections */}
      {stats.connected === 0 && !loading && (
        <div className="mt-8 p-6 rounded-lg bg-[#1f2937] border border-[#374151] text-center">
          <p className="text-white font-medium mb-2">Connect your social accounts to get started</p>
          <p className="text-[#9ca3af] text-sm mb-4">
            Link your X, LinkedIn, Facebook, Instagram, and Bluesky to start posting.
          </p>
          <Link href="/dashboard/connected-accounts" className="btn btn-primary">
            Connect Accounts
          </Link>
        </div>
      )}
    </div>
  );
}

function getPlatformEmojiCount(count: number): string {
  if (count >= 5) return '🎉';
  if (count >= 3) return '🚀';
  if (count >= 1) return '✨';
  return '🔗';
}

function PlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CalendarIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function ChartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function WriteIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function LinkIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}