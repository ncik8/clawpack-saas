'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const API_URL = '/api/postiz-api';

interface Channel {
  id: string;
  platform: string;
  name: string;
  emoji?: string;
  connected: boolean;
  platformUsername?: string;
}

export default function ConnectedAccountsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Provision Postiz user if needed (on first load)
  useEffect(() => {
    const provisionPostiz = async () => {
      // Get Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      try {
        await fetch('/api/postiz-provision', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: session.user.email }),
        });
      } catch (err) {
        console.error('Postiz provisioning failed:', err);
      }
    };

    provisionPostiz();

    // Listen for OAuth callback messages from popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'social-connected') {
        const platform = event.data.platform;
        // Sync tokens to Postiz
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch('/api/sync-postiz', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ platform }),
            });
          }
        } catch (err) {
          console.error('Sync failed:', err);
        }
        // Refresh page
        window.location.reload();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Load channels - check both our social_connections AND Postiz
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // Get Supabase token for authorization
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseToken = session?.access_token;
        
        if (!supabaseToken) {
          setChannels(getDefaultChannels());
          setLoading(false);
          return;
        }

        // First, check our social_connections table (this is the source of truth for our OAuth)
        const { data: connections } = await supabase
          .from('social_connections')
          .select('platform, platform_username')
          .eq('user_id', session.user.id);

        const connectedPlatforms = connections || [];
        
        // Build channels from our connections
        const channelMap: Record<string, { name: string; emoji: string }> = {
          'x': { name: 'X / Twitter', emoji: '🐦' },
          'linkedin': { name: 'LinkedIn', emoji: '💼' },
        };

        const channelsFromOurDB = ['x', 'linkedin'].map(p => ({
          id: p,
          platform: p,
          name: channelMap[p]?.name || p,
          emoji: channelMap[p]?.emoji || '📱',
          connected: connectedPlatforms.some(c => c.platform === p),
          platformUsername: connectedPlatforms.find(c => c.platform === p)?.platform_username,
        }));

        setChannels(channelsFromOurDB);
      } catch (error) {
        console.error('Failed to fetch channels:', error);
        setChannels(getDefaultChannels());
      }
    };

    fetchChannels();
    setLoading(false);
  }, []);

  const getDefaultChannels = () => [
    { id: 'x', platform: 'x', name: 'X / Twitter', connected: false },
    { id: 'linkedin', platform: 'linkedin', name: 'LinkedIn', connected: false },
    { id: 'bluesky', platform: 'bluesky', name: 'Bluesky', connected: false },
    { id: 'mastodon', platform: 'mastodon', name: 'Mastodon', connected: false },
    { id: 'threads', platform: 'threads', name: 'Threads', connected: false },
  ];

  const getPlatformName = (id: string): string => {
    const names: Record<string, string> = {
      'twitter': 'X / Twitter',
      'linkedin': 'LinkedIn',
      'linkedin-oauth2': 'LinkedIn',
      'facebook': 'Facebook',
      'instagram': 'Instagram',
      'bluesky': 'Bluesky',
      'mastodon': 'Mastodon',
      'threads': 'Threads',
      'tiktok': 'TikTok',
      'youtube': 'YouTube',
    };
    return names[id] || id;
  };

  // Map frontend platform IDs to Postiz OAuth paths
  const getOAuthPath = (platform: string): string => {
    const pathMap: Record<string, string> = {
      'x': 'twitter',
      'linkedin': 'linkedin-oauth2',
      'linkedin-page': 'linkedin',
      'facebook': 'facebook',
      'instagram': 'instagram',
      'instagram-standalone': 'instagram',
      'tiktok': 'tiktok',
      'youtube': 'youtube',
      'bluesky': 'bluesky',
      'mastodon': 'mastodon',
      'threads': 'threads',
      'pinterest': 'pinterest',
      'dribbble': 'dribbble',
      'discord': 'discord',
      'telegram': 'telegram',
      'wordpress': 'wordpress',
      'reddit': 'reddit',
      'slack': 'slack',
      'nostr': 'nostr',
    };
    return pathMap[platform] || platform;
  };

  const handleConnect = async (platform: string) => {
    // Check if platform is coming soon
    const platformInfo = platforms.find(p => p.id === platform);
    if (platformInfo?.comingSoon) {
      return; // Just ignore clicks on coming soon platforms
    }
    
    setConnecting(platform);
    
    // For X/Twitter, use OAuth 1.0a for media support
    if (platform === 'x') {
      window.location.href = '/api/x/connect';
      return;
    }
    
    // For LinkedIn, use our own OAuth flow
    if (platform === 'linkedin') {
      window.location.href = '/api/connect/linkedin';
      return;
    }
    
    // Bluesky (not yet implemented)
    if (platform === 'bluesky') {
      alert('Bluesky integration is coming soon!');
      setConnecting(null);
      return;
    }
    
    setConnecting(null);
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm('Are you sure you want to disconnect this channel?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/social-disconnect?platform=${platform}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const updated = channels.map(ch =>
          ch.platform === platform ? { ...ch, connected: false } : ch
        );
        setChannels(updated);
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const platforms = [
    { id: 'x', name: 'X / Twitter', emoji: '🐦', color: '#1DA1F2', comingSoon: false },
    { id: 'linkedin', name: 'LinkedIn', emoji: '💼', color: '#0A66C2', comingSoon: false },
    { id: 'bluesky', name: 'Bluesky', emoji: '☁️', color: '#1185FE', comingSoon: true },
    { id: 'mastodon', name: 'Mastodon', emoji: '🐘', color: '#6364FF', comingSoon: true },
    { id: 'nostr', name: 'Nostr', emoji: '⚡', color: '#FFD700', comingSoon: true },
    { id: 'threads', name: 'Threads', emoji: '🧵', color: '#000000', comingSoon: true },
    { id: 'facebook', name: 'Facebook', emoji: '📘', color: '#1877F2', comingSoon: true },
    { id: 'instagram', name: 'Instagram', emoji: '📷', color: '#E4405F', comingSoon: true },
    { id: 'tiktok', name: 'TikTok', emoji: '🎵', color: '#000000', comingSoon: true },
    { id: 'youtube', name: 'YouTube', emoji: '▶️', color: '#FF0000', comingSoon: true },
    { id: 'pinterest', name: 'Pinterest', emoji: '📌', color: '#BD081C', comingSoon: true },
    { id: 'dribbble', name: 'Dribbble', emoji: '🏀', color: '#EA4C89', comingSoon: true },
    { id: 'discord', name: 'Discord', emoji: '🎮', color: '#5865F2', comingSoon: true },
    { id: 'telegram', name: 'Telegram', emoji: '✈️', color: '#0088CC', comingSoon: true },
    { id: 'wordpress', name: 'WordPress', emoji: '📝', color: '#21759B', comingSoon: true },
    { id: 'reddit', name: 'Reddit', emoji: '🤖', color: '#FF4500', comingSoon: true },
    { id: 'slack', name: 'Slack', emoji: '💬', color: '#4A154B', comingSoon: true },
    { id: 'linkedin-page', name: 'LinkedIn Page', emoji: '💼', color: '#0A66C2', comingSoon: true },
  ];

  const isConnected = (platformId: string) => {
    const channel = channels.find(c => c.platform === platformId);
    return channel?.connected || false;
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
        <h1 className="text-2xl font-bold text-white mb-2">Connected Accounts</h1>
        <p className="text-[#9ca3af] text-sm">Connect your social media accounts to start posting</p>
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {platforms.map((platform) => {
          const connected = isConnected(platform.id);
          const isConnecting = connecting === platform.id;
          
          return (
            <div 
              key={platform.id}
              className={`relative rounded-xl p-3 text-center transition-all ${
                connected 
                  ? 'bg-[#22c55e]/20 border-2 border-[#22c55e]' 
                  : platform.comingSoon
                    ? 'bg-[#374151]/50 border border-[#4b5563] opacity-60'
                    : 'bg-[#1f2937] border border-[#374151] hover:border-[#1780e3]/50'
              }`}
            >
              {/* Coming Soon badge */}
              {platform.comingSoon && (
                <span className="absolute -top-2 -right-2 bg-[#f59e0b] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Soon
                </span>
              )}

              {/* Connected badge */}
              {connected && (
                <span className="absolute -top-2 -right-2 bg-[#22c55e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ✓
                </span>
              )}

              {/* Icon */}
              <div 
                className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-xl"
                style={{ backgroundColor: `${platform.color}20` }}
              >
                {platform.emoji}
              </div>

              {/* Name */}
              <p className="text-white text-xs font-medium truncate">{platform.name}</p>

              {/* Action */}
              {platform.comingSoon ? (
                <button 
                  className="mt-2 w-full text-[10px] py-1 bg-[#4b5563] text-[#9ca3af] rounded cursor-not-allowed"
                  disabled
                >
                  Coming Soon
                </button>
              ) : connected ? (
                <div className="mt-2 flex gap-1">
                  <button 
                    className="flex-1 text-[10px] py-1 bg-[#22c55e] text-white rounded text-center"
                    disabled
                  >
                    ✓
                  </button>
                  <button 
                    className="flex-1 text-[10px] py-1 bg-[#374151] text-[#ef4444] rounded text-center hover:bg-[#4b5563]"
                    onClick={() => handleDisconnect(platform.id)}
                  >
                    ✕
                  </button>
                </div>
              ) : isConnecting ? (
                <button 
                  className="mt-2 w-full text-[10px] py-1 bg-[#1780e3] text-white rounded animate-pulse"
                  disabled
                >
                 ...
                </button>
              ) : (
                <button 
                  className="mt-2 w-full text-[10px] py-1 bg-[#1780e3] text-white rounded hover:bg-[#166bc7] transition-colors"
                  onClick={() => handleConnect(platform.id)}
                >
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 p-3 rounded-lg bg-[#1780e3]/10 border border-[#1780e3]/30">
        <p className="text-sm text-[#1780e3]">
          <strong>How it works:</strong> Click Connect to authorize your account via secure OAuth. Your credentials are stored securely and never shared.
        </p>
      </div>
    </div>
  );
}
