'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseBrowser, uploadVideoToSupabaseBrowser, deleteVideoFromSupabaseBrowser } from '@/lib/supabase-browser';

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
  const [scheduling, setScheduling] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string>('');
  
  // AI Generate state
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'ai'; content: string}[]>([]);

  useEffect(() => {
    loadConnectedPlatforms();
  }, []);

  const getBasePlatform = (platformId: string): string => {
    // For multi-account platforms like facebook_123, returns 'facebook'
    return platformId.split('_')[0];
  };

  const loadConnectedPlatforms = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch ALL connected platforms from social_connections table
      const { data: connections } = await supabase
        .from('social_connections')
        .select('platform, platform_username, platform_user_id')
        .eq('user_id', session.user.id);

      const connected = connections || [];
      
      const platformInfo: Record<string, { name: string; emoji: string }> = {
        'x': { name: 'X / Twitter', emoji: '🐦' },
        'linkedin': { name: 'LinkedIn', emoji: '💼' },
        'bluesky': { name: 'Bluesky', emoji: '☁️' },
        'facebook': { name: 'Facebook', emoji: '📘' },
        'instagram': { name: 'Instagram', emoji: '📷' },
      };

      // Build platform items - for multi-account platforms (FB/IG), each account is separate
      const platformItems: ConnectedPlatform[] = [];
      const basePlatforms = ['x', 'linkedin', 'bluesky', 'facebook', 'instagram'];
      
      for (const base of basePlatforms) {
        const accountsForBase = connected.filter(c => c.platform === base);
        
        if (accountsForBase.length === 0) {
          // No accounts for this platform - show as disconnected
          platformItems.push({
            id: base,
            name: platformInfo[base]?.name || base,
            emoji: platformInfo[base]?.emoji || '📱',
            connected: false,
          });
        } else {
          // Has accounts - add each as separate selectable item
          for (const account of accountsForBase) {
            const displayName = account.platform_username 
              ? `${platformInfo[base]?.name || base} - ${account.platform_username}`
              : platformInfo[base]?.name || base;
            platformItems.push({
              id: `${base}_${account.platform_user_id}`,
              name: displayName,
              emoji: platformInfo[base]?.emoji || '📱',
              connected: true,
              platformUsername: account.platform_username,
            });
          }
        }
      }

      setConnectedPlatforms(platformItems);
      
      // Don't pre-select any platforms - user must explicitly choose
      // This prevents accidental posts to platforms user didn't intend
      setPlatforms([]);
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

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) {
      setResult({ success: false, message: 'Please enter a topic for AI' });
      return;
    }
    
    const userMessage = aiTopic;
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiTopic('');
    setAiGenerating(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: userMessage }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      
      setAiMessages(prev => [...prev, { role: 'ai', content: data.content }]);
    } catch (error: any) {
      setResult({ success: false, message: error.message });
    } finally {
      setAiGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setResult({ success: true, message: 'Copied!' });
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

        if (platform === 'x') {
          // For X: upload image or video first if present, then post with media_ids
          let mediaIds: string[] = [];

          // Check for image file
          if (imageFile) {
            // Upload image first
            const uploadFormData = new FormData();
            uploadFormData.append('file', imageFile);

            const uploadRes = await fetch('/api/x/media/upload', {
              method: 'POST',
              body: uploadFormData,
            });

            const uploadData = await uploadRes.json();

            if (!uploadRes.ok || !uploadData.media_id) {
              errors.push(`X: Image upload failed - ${uploadData.error || 'Unknown error'}`);
              continue;
            }

            mediaIds = [uploadData.media_id];
          }
          // Check for video file (video takes precedence if both exist)
          else if (videoFile) {
            // Upload video directly to Supabase from browser (bypasses Vercel 4.5MB limit)
            const videoUrl = await uploadVideoToSupabaseBrowser(videoFile);

            if (!videoUrl) {
              errors.push(`X: Video upload to storage failed`);
              continue;
            }

            // Now post to X with the Supabase video URL
            const postRes = await fetch('/api/x/post', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
             },
              body: JSON.stringify({
                text: content,
                video_url: videoUrl,
              }),
            });

            const postData = await postRes.json();
            if (!postRes.ok) {
              errors.push(`X: Video post failed - ${postData.error || 'Unknown error'}`);
              continue;
            }

            results.push('X (video)');
            // Delete video from Supabase after successful post
            await deleteVideoFromSupabaseBrowser(videoUrl);
            setContent('');
            setVideoFile(null);
            setVideoPreview(null);
            continue;
          }

          // Create post with media_ids
          console.log('About to post to X with media_ids');
          try {
            const postRes = await fetch('/api/x/post', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
             },
              body: JSON.stringify({
                text: content,
                media_ids: mediaIds,
              }),
            });

            const postData = await postRes.json();

            if (postRes.ok && postData.data?.id) {
              results.push(`X ✓`);
            } else {
              errors.push(`X: ${postData.error || 'Post failed'}`);
            }
          } catch (e: unknown) {
            errors.push(`X: Network error - ${String((e as any).message || JSON.stringify(e))}`);
          }
        } else if (platform === 'linkedin') {
          // LinkedIn: form data with image or video
          const formData = new FormData();
          formData.append('text', content);
          if (imageFile) {
            formData.append('image', imageFile);
          } else if (videoFile) {
            formData.append('video', videoFile);
          }

          const response = await fetch('/api/post/linkedin', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
          });

          const data = await response.json();

          if (response.ok && data.success) {
            results.push(`LinkedIn ✓`);
          } else {
            errors.push(`LinkedIn: ${data.error}`);
          }
        } else if (getBasePlatform(platform) === 'bluesky') {
          // Bluesky: text with optional image (video not supported on bsky.social PDS)
          const formData = new FormData();
          formData.append('text', content);
          if (imageFile) {
            formData.append('image', imageFile);
          }

          const response = await fetch('/api/post/bluesky', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
          });

          const data = await response.json();

          if (response.ok && data.success) {
            results.push(`Bluesky ✓`);
          } else {
            errors.push(`Bluesky: ${data.error}`);
          }
        } else if (getBasePlatform(platform) === 'facebook') {
          // Facebook: posts to specific page IDs (not all)
          const fbPageIds = platforms
            .filter(p => p.startsWith('facebook_'))
            .map(p => p.replace('facebook_', ''));
          const response = await fetch('/api/post/facebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: content, pageIds: fbPageIds }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            results.push(`Facebook ✓`);
          } else {
            errors.push(`Facebook: ${data.error}`);
          }
        } else if (getBasePlatform(platform) === 'instagram') {
          // Instagram: posts to all connected IG accounts
          const response = await fetch('/api/post/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: content }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            results.push(`Instagram ✓`);
          } else {
            errors.push(`Instagram: ${data.error}`);
          }
        }
      } catch (err) {
        errors.push(`${platform}: Network error`);
      }
    }

    setPosting(false);

    if (results.length > 0 && errors.length === 0) {
      setResult({ success: true, message: `Posted to ${results.join(', ')}!` });
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setVideoFile(null);
      setVideoPreview(null);
    } else if (results.length > 0 && errors.length > 0) {
      setResult({ 
        success: true, 
        message: `Posted to ${results.join(', ')}. Failed: ${errors.join(', ')}` 
      });
    } else {
      setResult({ success: false, message: errors.join('. ') });
    }
  };

  const handleSchedule = async () => {
    if (!content.trim()) {
      setResult({ success: false, message: 'Please enter some content' });
      return;
    }

    if (platforms.length === 0) {
      setResult({ success: false, message: 'Please select at least one platform' });
      return;
    }

    if (!scheduledFor) {
      setResult({ success: false, message: 'Please select a date and time for scheduling' });
      return;
    }

    setPosting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setResult({ success: false, message: 'Not logged in' });
        setPosting(false);
        return;
      }

      // Handle video upload if present
      let videoUrl: string | null = null;
      if (videoFile) {
        videoUrl = await uploadVideoToSupabaseBrowser(videoFile);
        if (!videoUrl) {
          setResult({ success: false, message: 'Failed to upload video' });
          setPosting(false);
          return;
        }
      }

      // Create scheduled post
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          platforms,
          scheduledFor: new Date(scheduledFor).toISOString(),
          videoUrl: videoUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule post');
      }

      setResult({ 
        success: true, 
        message: `Post scheduled for ${new Date(scheduledFor).toLocaleString()}!` 
      });
      
      // Reset form
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setVideoFile(null);
      setVideoPreview(null);
      setScheduledFor('');
      setScheduling(false);
      
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Failed to schedule post' });
    } finally {
      setPosting(false);
    }
  };

  const charCount = content.length;
  
  // Character limits per platform
  const platformLimits: Record<string, number> = {
    x: 280,
    linkedin: 3000,
    bluesky: 300,
    facebook: 63206,
    instagram: 2200,
  };
  
  // Helper to get base platform from platform ID (handles facebook_123 format)
  const getLimitForPlatform = (platformId: string): number => {
    const base = getBasePlatform(platformId);
    return platformLimits[base] || 280;
  };
  
  // Show lowest limit when multiple platforms selected, or platform-specific limit
  const maxChars = platforms.length > 0
    ? Math.min(...platforms.map(p => getLimitForPlatform(p)))
    : 280;
  
  const limitLabel = platforms.length > 1
    ? `${platforms.length} platforms (min: ${maxChars})`
    : platforms.length === 1
      ? `${platforms[0]} limit: ${maxChars}`
      : 'X limit: 280';

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

      {/* AI Generate - Chat Style */}
      <div style={{ background: '#1f2937', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '12px' }}>
          💬 AI Chat
        </h2>
        
        {/* Chat Messages */}
        <div style={{ 
          minHeight: '200px', 
          maxHeight: '300px', 
          overflow: 'auto',
          marginBottom: '12px',
          padding: '12px',
          background: '#111827',
          borderRadius: '8px',
        }}>
          {aiMessages.length === 0 && (
            <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '60px' }}>
              Ask me anything about your post content!
            </p>
          )}
          
          {aiMessages.map((msg, i) => (
            <div key={i} style={{ 
              display: 'flex', 
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '12px',
            }}>
              {msg.role === 'ai' && (
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '8px',
                  fontSize: '12px',
                  flexShrink: 0,
                }}>
                  🤖
                </div>
              )}
              <div style={{ 
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user' ? '#1780e3' : '#374151',
                color: 'white',
                fontSize: '14px',
                lineHeight: '1.4',
                wordBreak: 'break-word',
              }}>
                {msg.content}
                {msg.role === 'ai' && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button
                      onClick={() => setContent(msg.content)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Use This
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.content);
                        setResult({ success: true, message: 'Copied!' });
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {aiGenerating && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', fontSize: '12px' }}>🤖</div>
              <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 4px', background: '#374151', color: '#9ca3af', fontSize: '14px' }}>
                Thinking...
              </div>
            </div>
          )}
        </div>
        
        {/* Input */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder="Ask AI to generate a post..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '24px',
              border: '1px solid #374151',
              background: '#111827',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
          />
          <button
            onClick={handleAiGenerate}
            disabled={aiGenerating || !aiTopic.trim()}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              background: aiGenerating ? '#374151' : '#10b981',
              color: 'white',
              fontSize: '18px',
              cursor: aiGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {aiGenerating ? '⏳' : '➤'}
          </button>
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
            {charCount}/{maxChars} {limitLabel}
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

      {/* Media Upload */}
      <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280' }}>
        Images: JPG, PNG, GIF (max 20MB) • Videos: MP4, MOV (max 100MB) {platforms.includes('bluesky') && '• Bluesky: images only (video coming soon)'}
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

      {/* Video Upload */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
          id="video-upload"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              setVideoFile(file);
              // Create preview
              const reader = new FileReader();
              reader.onload = (e) => setVideoPreview(e.target?.result as string);
              reader.readAsDataURL(file);
            }
          }}
        />
        <label
          htmlFor="video-upload"
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
          🎥 Add Video
        </label>
        {videoPreview && (
          <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
            <video
              src={videoPreview}
              controls
              style={{
                maxWidth: '200px',
                maxHeight: '150px',
                borderRadius: '8px',
                border: '2px solid #374151',
              }}
            />
            <button
              onClick={() => {
                setVideoFile(null);
                setVideoPreview(null);
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

      {/* Scheduling Option */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <input
            type="checkbox"
            id="schedule-toggle"
            checked={scheduling}
            onChange={(e) => setScheduling(e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          <label htmlFor="schedule-toggle" style={{ color: 'white', cursor: 'pointer' }}>
            Schedule for later
          </label>
        </div>
        
        {scheduling && (
          <div style={{ marginTop: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #374151',
                background: 'white',
                color: '#111',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* Post/Schedule Button */}
      <button
        onClick={scheduling ? handleSchedule : handlePost}
        disabled={posting || platforms.length === 0 || !content.trim() || (scheduling && !scheduledFor)}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: platforms.length > 0 && content.trim() && (!scheduling || scheduledFor) ? '#3b82f6' : '#374151',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: platforms.length > 0 && content.trim() && (!scheduling || scheduledFor) ? 'pointer' : 'not-allowed',
          opacity: posting ? 0.7 : 1,
        }}
      >
        {posting ? (scheduling ? 'Scheduling...' : 'Posting...') : (scheduling ? 'Schedule Post' : 'Post Now')}
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
// force redeploy
