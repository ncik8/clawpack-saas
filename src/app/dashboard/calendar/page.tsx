'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ScheduledPostTarget {
  id: string;
  platform: string;
  social_page_id: string | null;
  social_connection_id: string | null;
  status: string;
  scheduled_for: string;
  published_at: string | null;
  external_post_id: string | null;
  error_message: string | null;
}

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduled_for: string;
  status: string;
  video_url?: string;
  image_url?: string;
  timezone?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  scheduled_post_targets?: ScheduledPostTarget[];
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editScheduledFor, setEditScheduledFor] = useState('');
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // Fetch scheduled posts from Supabase
  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session found');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/schedule', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch scheduled posts: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform data - extract platforms from targets
      const transformedPosts = (data as ScheduledPost[]).map((post: any) => {
        const targets = post.scheduled_post_targets || [];
        const platforms = targets.map((t: any) => {
          if (t.social_page_id) {
            return `${t.platform}_${t.page_id || t.ig_user_id || ''}`;
          }
          return t.platform;
        });
        
        return {
          ...post,
          platforms,
          scheduled_post_targets: targets,
        };
      });
      
      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session found');
        return;
      }

      const response = await fetch(`/api/schedule?id=${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete post: ${response.status}`);
      }

      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  // Group posts by date
  const groupedPosts = posts.reduce((acc, post) => {
    const tz = post.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Hong_Kong';
    const date = new Date(post.scheduled_for).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: tz
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(post);
    return acc;
  }, {} as Record<string, ScheduledPost[]>);

  const formatTime = (dateStr: string, tz: string = 'Asia/Hong_Kong') => {
    const time = new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: tz
    });
    return `${time} UTC`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'sent' || status === 'published') {
      return <span className="px-2 py-1 text-xs font-medium bg-[#10b981]/20 text-[#10b981] rounded">Sent</span>;
    } else if (status === 'failed') {
      return <span className="px-2 py-1 text-xs font-medium bg-[#ef4444]/20 text-[#ef4444] rounded">Failed</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-[#f59e0b]/20 text-[#f59e0b] rounded">Pending</span>;
    }
  };

  const handleEdit = (post: ScheduledPost) => {
    setEditingPost(post);
    setEditContent(post.content);
    const tz = post.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Hong_Kong';
    const localDateStr = new Date(post.scheduled_for).toLocaleString('en-CA', { timeZone: tz }).replace(', ', 'T');
    setEditScheduledFor(localDateStr);
    setEditPlatforms([...post.platforms]);
  };

  const saveEdit = async () => {
    if (!editingPost) return;
    
    setEditLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session found');
        return;
      }

      const response = await fetch('/api/schedule', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingPost.id,
          content: editContent,
          platforms: editPlatforms,
          scheduledFor: new Date(editScheduledFor).toISOString(),
          videoUrl: editingPost.video_url,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update post');
      }

      const updatedPost = await response.json();
      setPosts(posts.map(p => p.id === editingPost.id ? updatedPost : p));
      setEditingPost(null);
      
    } catch (error: any) {
      console.error('Error updating post:', error);
      alert(`Failed to update post: ${error.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setEditContent('');
    setEditScheduledFor('');
    setEditPlatforms([]);
  };

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      x: '🐦',
      linkedin: '💼',
      facebook: '📘',
      instagram: '📷',
      bluesky: '☁️',
      mastodon: '🐘',
      threads: '🧵',
      tiktok: '🎵',
      youtube: '▶️',
    };
    return emojis[platform] || '📱';
  };

  const getBasePlatform = (platformId: string): string => {
    return platformId.split('_')[0];
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Calendar</h1>
        <p className="text-[#9ca3af] text-sm">View and manage your scheduled posts</p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-white text-xl mb-2">No scheduled posts yet</h3>
          <p className="text-[#9ca3af] mb-6 max-w-md mx-auto">
            Create your first post to see it scheduled here. Your posts will be automatically synced from our scheduling system.
          </p>
          <a 
            href="/dashboard/create" 
            className="inline-block px-6 py-3 bg-[#1780e3] text-white rounded-lg hover:bg-[#166bc7] transition-colors"
          >
            Create Your First Post
          </a>
          
          <div className="mt-8 p-4 bg-[#1f2937] rounded-lg max-w-md mx-auto">
            <p className="text-[#9ca3af] text-sm">
              <strong className="text-white">Want to see your posts?</strong><br />
              Create posts in the Create tab and they&apos;ll appear here after scheduling.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedPosts).map(([date, datePosts]) => (
            <div key={date}>
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-[#1780e3]">📅</span>
                {date}
              </h2>
              <div className="space-y-3">
                {datePosts.map((post) => (
                  <div 
                    key={post.id}
                    className="bg-[#1f2937] rounded-xl p-4 border border-[#374151] hover:border-[#1780e3]/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Time */}
                        <p className="text-[#1780e3] text-sm font-medium mb-1">
                          {formatTime(post.scheduled_for, post.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Hong_Kong')}
                        </p>
                        
                        {/* Content */}
                        <p className="text-white text-sm mb-2 line-clamp-2">
                          {post.content || 'No content'}
                        </p>
                        
                        {/* Platforms */}
                        <div className="flex flex-wrap gap-2">
                          {post.platforms.map((ch) => (
                            <span 
                              key={ch}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-[#374151] rounded text-xs text-white"
                            >
                              <span className="text-base">{getPlatformEmoji(getBasePlatform(ch))}</span>
                              <span className="capitalize">{getBasePlatform(ch)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Image Thumbnail */}
                      {post.image_url && (
                        <div className="flex-shrink-0">
                          <img 
                            src={post.image_url} 
                            alt="Post image" 
                            className="w-20 h-20 object-cover rounded-lg border border-[#374151]"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Status */}
                      <div className="mb-2">
                        {getStatusBadge(post.status)}
                      </div>
                      
                      {/* Error Message */}
                      {post.status === 'failed' && post.error_message && (
                        <p className="text-xs text-[#ef4444] mb-2 max-w-xs truncate" title={post.error_message}>
                          ❌ {post.error_message}
                        </p>
                      )}

                      {/* Actions */}
                      <button 
                        className="px-3 py-1 text-xs bg-[#ef4444]/20 text-[#ef4444] rounded hover:bg-[#ef4444]/30 transition-colors"
                        onClick={() => handleDelete(post.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1f2937] rounded-xl p-6 max-w-md w-full border border-[#374151]">
            <h2 className="text-white text-xl font-bold mb-4">Edit Scheduled Post</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9ca3af] mb-2">Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-32 p-3 bg-[#111827] border border-[#374151] rounded-lg text-white resize-none"
                  maxLength={500}
                />
                <div className="text-xs text-[#6b7280] mt-1 text-right">
                  {editContent.length}/500
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#9ca3af] mb-2">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={editScheduledFor}
                  onChange={(e) => setEditScheduledFor(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full p-3 bg-[#111827] border border-[#374151] rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-[#9ca3af] mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {['x', 'linkedin', 'bluesky', 'facebook', 'instagram'].map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => {
                        setEditPlatforms(prev =>
                          prev.includes(platform)
                            ? prev.filter(p => p !== platform)
                            : [...prev, platform]
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border ${
                        editPlatforms.includes(platform)
                          ? 'bg-[#064e3b] border-[#10b981] text-white'
                          : 'bg-[#1f2937] border-[#374151] text-[#9ca3af]'
                      }`}
                    >
                      {getPlatformEmoji(platform)} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#6b7280] mt-2">
                  Note: You can only select platforms you have connected
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveEdit}
                disabled={editLoading || !editContent.trim() || editPlatforms.length === 0 || !editScheduledFor}
                className="flex-1 py-2 bg-[#1780e3] text-white rounded-lg hover:bg-[#166bc7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={cancelEdit}
                className="flex-1 py-2 bg-[#374151] text-white rounded-lg hover:bg-[#4b5563] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
