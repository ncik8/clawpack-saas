'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ConnectedPlatform {
  id: string;
  name: string;
  emoji: string;
  connected: boolean;
  platformUsername?: string;
}

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    loadConnectedPlatforms();
  }, []);

  const loadConnectedPlatforms = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch connected platforms from our social_connections table
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
      const platformsWithStatus = allPlatforms.map(p => ({
        id: p,
        name: platformInfo[p]?.name || p,
        emoji: platformInfo[p]?.emoji || '📱',
        connected: connected.some(c => c.platform === p),
        platformUsername: connected.find(c => c.platform === p)?.platform_username,
      }));

      setConnectedPlatforms(platformsWithStatus);
      
      // Pre-select connected platforms
      setPlatforms(connected.map(c => c.platform));
    } catch (err) {
      console.error('Error loading platforms:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    const platform = connectedPlatforms.find(p => p.id === platformId);
    if (!platform?.connected) return; // Can't select disconnected platforms
    
    setPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handlePost = async () => {
    if (!content.trim()) {
      setResult({ success: false, message: 'Please enter some content' });
      return;
    }

    if (platforms.length === 0) {
      setResult({ success: false, message: 'Please select at least one platform' });
      return;
    }

    setPosting(true);
    setResult(null);

    const results: string[] = [];
    const errors: string[] = [];

    for (const platform of platforms) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          errors.push(`Not logged in`);
          continue;
        }

        // Build form data for image upload
        const formData = new FormData();
        formData.append('text', content);
        if (imageFile) {
          formData.append('image', imageFile);
        }

        const endpoint = platform === 'x' ? '/api/post/x' : '/api/post/linkedin';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          results.push(`${platform} ✓`);
        } else {
          errors.push(`${platform}: ${data.error}`);
        }
      } catch (err) {
        errors.push(`${platform}: Network error`);
      }
    }

    setPosting(false);

    if (results.length > 0 && errors.length === 0) {
      setResult({ success: true, message: `Posted to ${results.join(', ')}!` });
      setContent('');
    } else if (results.length > 0 && errors.length > 0) {
      setResult({ 
        success: true, 
        message: `Posted to ${results.join(', ')}. Failed: ${errors.join(', ')}` 
      });
    } else {
      setResult({ success: false, message: errors.join('. ') });
    }
  };

  const charCount = content.length;
  const maxChars = 280;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        Create Post
      </h1>

      {/* Platform Selection */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
          Select Platforms
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {connectedPlatforms.map(platform => (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              disabled={!platform.connected}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: platforms.includes(platform.id) ? '2px solid #10b981' : '2px solid #374151',
                background: platforms.includes(platform.id) ? '#064e3b' : platform.connected ? '#1f2937' : '#1f293780',
                color: platform.connected ? 'white' : '#6b7280',
                cursor: platform.connected ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: platform.connected ? 1 : 0.5,
              }}
            >
              <span>{platform.emoji}</span>
              <span>{platform.name}</span>
              {platform.connected && (
                <span style={{ fontSize: '12px', color: '#10b981' }}>
                  @{platform.platformUsername || 'connected'}
                </span>
              )}
              {!platform.connected && (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Not connected</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Input */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '14px', color: '#6b7280' }}>Content</h2>
          <span style={{ 
            fontSize: '12px', 
            color: charCount > maxChars ? '#ef4444' : '#6b7280' 
          }}>
            {charCount}/{maxChars}
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          maxLength={500}
          style={{
            width: '100%',
            height: '150px',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #374151',
            background: '#1f2937',
            color: 'white',
            fontSize: '16px',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>

      {/* Image Upload */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="file"
          accept="image/*"
          id="image-upload"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              setImageFile(file);
              // Create preview
              const reader = new FileReader();
              reader.onload = (e) => setImagePreview(e.target?.result as string);
              reader.readAsDataURL(file);
            }
          }}
        />
        <label
          htmlFor="image-upload"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '2px solid #374151',
            background: '#1f2937',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📷 Add Image
        </label>
        {imagePreview && (
          <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{
                maxWidth: '200px',
                maxHeight: '150px',
                borderRadius: '8px',
                border: '2px solid #374151',
              }}
            />
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: 'none',
                background: '#ef4444',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: '24px',
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Post Button */}
      <button
        onClick={handlePost}
        disabled={posting || platforms.length === 0 || !content.trim()}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: platforms.length > 0 && content.trim() ? '#3b82f6' : '#374151',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: platforms.length > 0 && content.trim() ? 'pointer' : 'not-allowed',
          opacity: posting ? 0.7 : 1,
        }}
      >
        {posting ? 'Posting...' : 'Post Now'}
      </button>

      {/* Result Message */}
      {result && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '8px',
          background: result.success ? '#064e3b' : '#7f1d1d',
          color: 'white',
        }}>
          {result.message}
        </div>
      )}

      {/* Connect More Accounts */}
      <div style={{ marginTop: '32px', padding: '16px', background: '#1f2937', borderRadius: '8px' }}>
        <p style={{ color: '#9ca3af', marginBottom: '12px' }}>
          Want to connect more accounts?
        </p>
        <a 
          href="/dashboard/connected-accounts"
          style={{ color: '#3b82f6', textDecoration: 'underline' }}
        >
          Go to Connected Accounts →
        </a>
      </div>
    </div>
  );
}
