'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export default function SchedulerPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['x']);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [connectedPlatforms, setConnectedPlatforms] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadScheduledPosts();
    loadConnectedPlatforms();
  }, []);

  const loadConnectedPlatforms = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const { data: connections } = await supabase
      .from('social_connections')
      .select('platform, platform_username')
      .eq('user_id', session.user.id);

    const connected = connections || [];
    const platformInfo: Record<string, { name: string; emoji: string }> = {
      'x': { name: 'X / Twitter', emoji: '🐦' },
      'linkedin': { name: 'LinkedIn', emoji: '💼' },
    };

    const allPlatforms = ['x', 'linkedin'];
    setConnectedPlatforms(
      allPlatforms.map(p => ({
        id: p,
        name: platformInfo[p]?.name || p,
        emoji: platformInfo[p]?.emoji || '📱',
        connected: connected.some(c => c.platform === p),
      }))
    );
    setPlatforms(connected.map(c => c.platform));
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
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Post scheduled!' });
        setContent('');
        setScheduleDate('');
        setScheduleTime('');
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
          <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
            Platforms
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {connectedPlatforms.map(platform => (
              <button
                key={platform.id}
                onClick={() => {
                  if (!platform.connected) return;
                  setPlatforms(prev =>
                    prev.includes(platform.id)
                      ? prev.filter(p => p !== platform.id)
                      : [...prev, platform.id]
                  );
                }}
                disabled={!platform.connected}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: platforms.includes(platform.id) ? '2px solid #10b981' : '2px solid #374151',
                  background: platforms.includes(platform.id) ? '#064e3b' : '#374151',
                  color: platform.connected ? 'white' : '#6b7280',
                  cursor: platform.connected ? 'pointer' : 'not-allowed',
                  opacity: platform.connected ? 1 : 0.5,
                }}
              >
                {platform.emoji} {platform.name}
              </button>
            ))}
          </div>
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
            maxLength={500}
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
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {content.length}/280
          </div>
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
          disabled={submitting}
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
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {post.platforms.map(p => (
                    <span key={p} style={{ fontSize: '12px', background: '#374151', padding: '2px 8px', borderRadius: '4px' }}>
                      {p}
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
