'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Connection {
  platform: string;
  platform_user_id: string;
  platform_username: string;
}

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

const PLATFORM_INFO: Record<string, { name: string; emoji: string; charLimit: number }> = {
  'x': { name: 'X / Twitter', emoji: '🐦', charLimit: 280 },
  'linkedin': { name: 'LinkedIn', emoji: '💼', charLimit: 3000 },
  'facebook': { name: 'Facebook', emoji: '🐘', charLimit: 63206 },
  'instagram': { name: 'Instagram', emoji: '📷', charLimit: 2200 },
  'bluesky': { name: 'Bluesky', emoji: '💙', charLimit: 300 },
};

// Get the most restrictive character limit from selected platforms
const getActiveCharLimit = (platforms: string[]): number => {
  if (platforms.length === 0) return 3000;
  let minLimit = 99999;
  for (const p of platforms) {
    const [platform] = p.split(':');
    const info = PLATFORM_INFO[platform];
    if (info && info.charLimit < minLimit) {
      minLimit = info.charLimit;
    }
  }
  return minLimit === 99999 ? 3000 : minLimit;
};

export default function SchedulerPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [fbPages, setFbPages] = useState<any[]>([]);
  const [igAccounts, setIgAccounts] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadScheduledPosts();
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const { data: connData } = await supabase
      .from('social_connections')
      .select('platform, platform_user_id, platform_username')
      .eq('user_id', session.user.id);

    const { data: pagesData } = await supabase
      .from('social_pages')
      .select('*')
      .eq('is_active', true)
      .eq('platform', 'facebook');

    const { data: igData } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'instagram');

    if (connData) setConnections(connData);
    if (pagesData) setFbPages(pagesData);
    if (igData) setIgAccounts(igData);
    // NO pre-selection - start with nothing
  };

  const getConnectionsByPlatform = (platform: string): Connection[] => {
    return connections.filter(c => c.platform === platform);
  };

  const isPlatformConnected = (platform: string): boolean => {
    return connections.some(c => c.platform === platform);
  };

  const togglePlatform = (platformWithId: string) => {
    setPlatforms(prev =>
      prev.includes(platformWithId)
        ? prev.filter(p => p !== platformWithId)
        : [...prev, platformWithId]
    );
  };

  const toggleAllPages = (platform: string, connected: boolean, pageIds: string[]) => {
    if (connected) {
      // Remove all pages of this platform
      setPlatforms(prev => prev.filter(p => !pageIds.some(id => p === `${platform}:${id}`)));
    } else {
      // Add all pages of this platform
      const newPages = pageIds.map(id => `${platform}:${id}`);
      setPlatforms(prev => [...new Set([...prev, ...newPages])]);
    }
  };

  const isPageSelected = (platform: string, pageId: string): boolean => {
    return platforms.includes(`${platform}:${pageId}`);
  };

  const getSelectedCountByPlatform = (platform: string): number => {
    return platforms.filter(p => p.startsWith(`${platform}:`)).length;
  };

  const loadScheduledPosts = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('scheduled_for', { ascending: true });

      if (!error && data) {
        setPosts(data);
      }
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!content.trim() || platforms.length === 0 || !scheduleDate || !scheduleTime) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    const now = new Date();

    if (new Date(scheduledFor) <= now) {
      setMessage({ type: 'error', text: 'Schedule time must be in the future' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Not logged in' });
        return;
      }

      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content,
          platforms,
          scheduledFor,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Post scheduled!' });
        setContent('');
        setScheduleDate('');
        setScheduleTime('');
        setPlatforms([]);
        setImageUrl('');
        setVideoUrl('');
        loadScheduledPosts();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to schedule post' });
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/schedule?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setPosts(posts.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
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

  const getPlatformDisplay = (p: string) => {
    const [platform, pageId] = p.split(':');
    const conn = connections.find(c => c.platform === platform && c.platform_user_id === pageId);
    const info = PLATFORM_INFO[platform] || { name: platform, emoji: '📱' };
    const username = conn?.platform_username || pageId || platform;
    return `${info.emoji} ${info.name}: ${username}`;
  };

  const activeLimit = getActiveCharLimit(platforms);

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        Schedule Posts
      </h1>

      {/* Schedule Form */}
      <div style={{ background: '#1f2937', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>New Scheduled Post</h2>

        {/* Platform Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '12px' }}>
            Select Platforms
          </label>

          {/* X / LinkedIn / Bluesky - simple toggles */}
          {['x', 'linkedin', 'bluesky'].map(platform => {
            const conn = getConnectionsByPlatform(platform)[0];
            const info = PLATFORM_INFO[platform];
            const isConnected = !!conn;
            const platformValue = conn ? `${platform}:${conn.platform_user_id}` : '';
            const isSelected = platforms.includes(platformValue);

            return (
              <div key={platform} style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => isConnected && togglePlatform(platformValue)}
                  disabled={!isConnected}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #10b981' : '2px solid #374151',
                    background: isSelected ? '#064e3b' : '#374151',
                    color: isConnected ? 'white' : '#6b7280',
                    cursor: isConnected ? 'pointer' : 'not-allowed',
                    opacity: isConnected ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{info.emoji}</span>
                  <span style={{ flex: 1 }}>{info.name}</span>
                  {isSelected && <span style={{ color: '#10b981' }}>✓</span>}
                  {!isConnected && <span style={{ fontSize: '12px' }}>Not connected</span>}
                </button>
              </div>
            );
          })}

          {/* Facebook - show all pages from social_pages */}
          {fbPages.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>🐘</span>
                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Facebook Pages</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fbPages.map(page => {
                  const pageValue = `facebook:${page.page_id}`;
                  const isSelected = platforms.includes(pageValue);
                  return (
                    <button
                      key={page.page_id}
                      onClick={() => togglePlatform(pageValue)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #10b981' : '2px solid #374151',
                        background: isSelected ? '#064e3b' : '#374151',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ flex: 1 }}>{page.page_name}</span>
                      {isSelected && <span style={{ color: '#10b981' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Click to select/deselect pages</p>
            </div>
          )}

          {/* Instagram - show all IG accounts from social_connections */}
          {igAccounts.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>📷</span>
                <span style={{ color: '#9ca3af', fontSize: '14px' }}>Instagram Accounts</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {igAccounts.map(acc => {
                  const accValue = `instagram:${acc.platform_user_id}`;
                  const isSelected = platforms.includes(accValue);
                  return (
                    <button
                      key={acc.platform_user_id}
                      onClick={() => togglePlatform(accValue)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #10b981' : '2px solid #374151',
                        background: isSelected ? '#064e3b' : '#374151',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ flex: 1 }}>@{acc.platform_username}</span>
                      {isSelected && <span style={{ color: '#10b981' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Click to select/deselect accounts</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            style={{
              width: '100%',
              height: '100px',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #374151',
              background: '#111827',
              color: 'white',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: '12px', color: content.length > activeLimit ? '#ef4444' : '#6b7280', marginTop: '4px' }}>
            {content.length}/{activeLimit}
            {content.length > activeLimit && <span style={{ marginLeft: '8px' }}>⚠️ Exceeds limit for some platforms</span>}
          </div>
        </div>

        {/* Image URL */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
            Image URL (optional)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '2px solid #374151',
              background: '#111827',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Video URL */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
            Video URL (optional)
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '2px solid #374151',
              background: '#111827',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Date & Time */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
              Date
            </label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '2px solid #374151',
                background: '#111827',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
              Time
            </label>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '2px solid #374151',
                background: '#111827',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <button
          onClick={handleSchedule}
          disabled={submitting || content.length > activeLimit}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: '#3b82f6',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Scheduling...' : 'Schedule Post'}
        </button>

        {message && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            borderRadius: '6px',
            background: message.type === 'success' ? '#064e3b' : '#7f1d1d',
            color: 'white',
            fontSize: '14px',
          }}>
            {message.text}
          </div>
        )}
      </div>

      {/* Scheduled Posts List */}
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Scheduled Posts</h2>
      
      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading...</p>
      ) : posts.length === 0 ? (
        <p style={{ color: '#6b7280', background: '#1f2937', padding: '24px', borderRadius: '8px', textAlign: 'center' }}>
          No scheduled posts yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {posts.map(post => (
            <div
              key={post.id}
              style={{
                background: '#1f2937',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {post.platforms.map(p => (
                    <span key={p} style={{ fontSize: '12px', background: '#374151', padding: '2px 8px', borderRadius: '4px' }}>
                      {getPlatformDisplay(p)}
                    </span>
                  ))}
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: post.status === 'pending' ? '#1e40af' : post.status === 'sent' ? '#065f46' : '#7f1d1d',
                  }}>
                    {post.status}
                  </span>
                </div>
                <p style={{ color: 'white', marginBottom: '8px' }}>{post.content}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Scheduled: {formatDate(post.scheduled_for)}
                </p>
              </div>
              <button
                onClick={() => deletePost(post.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#374151',
                  color: '#9ca3af',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
