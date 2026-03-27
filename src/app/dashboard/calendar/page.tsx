'use client';

import { useState, useEffect } from 'react';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const POSTIZ_API_KEY = process.env.NEXT_PUBLIC_POSTIZ_API_KEY || '';

interface ScheduledPost {
  id: string;
  content: string;
  scheduledAt: string;
  channels: string[];
  status: string;
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const res = await fetch(`${POSTIZ_URL}/api/posts`, {
        headers: {
          Authorization: `Bearer ${POSTIZ_API_KEY}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const res = await fetch(`${POSTIZ_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${POSTIZ_API_KEY}`,
        },
      });
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== postId));
        setSelectedPost(null);
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  // Group posts by date
  const groupedPosts = posts.reduce((acc, post) => {
    const date = new Date(post.scheduledAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(post);
    return acc;
  }, {} as Record<string, ScheduledPost[]>);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Calendar</h1>
        <p className="text-[#9ca3af] text-sm">View and manage your scheduled posts</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-white text-lg mb-2">No scheduled posts</h3>
          <p className="text-[#9ca3af] text-sm">Create your first post to see it here</p>
          <a 
            href="/dashboard/create" 
            className="inline-block mt-4 px-6 py-2 bg-[#1780e3] text-white rounded-lg hover:bg-[#166bc7] transition-colors"
          >
            Create Post
          </a>
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
                          {formatTime(post.scheduledAt)}
                        </p>
                        
                        {/* Content */}
                        <p className="text-white text-sm mb-2 line-clamp-2">
                          {post.content || 'No content'}
                        </p>
                        
                        {/* Platforms */}
                        <div className="flex flex-wrap gap-2">
                          {post.channels.map((ch) => (
                            <span 
                              key={ch}
                              className="text-lg"
                              title={ch}
                            >
                              {getPlatformEmoji(ch)}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          className="px-3 py-1 text-xs bg-[#374151] text-white rounded hover:bg-[#4b5563] transition-colors"
                          onClick={() => window.open(`${POSTIZ_URL}/posts/${post.id}/edit`, '_blank')}
                        >
                          Edit
                        </button>
                        <button 
                          className="px-3 py-1 text-xs bg-[#ef4444]/20 text-[#ef4444] rounded hover:bg-[#ef4444]/30 transition-colors"
                          onClick={() => handleDelete(post.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
