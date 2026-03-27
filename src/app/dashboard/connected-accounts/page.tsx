'use client';

import { useState, useEffect } from 'react';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';

interface Channel {
  id: string;
  platform: string;
  name: string;
  connected: boolean;
}

export default function ConnectedAccountsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Load channels from localStorage (simulated connection state)
  useEffect(() => {
    const saved = localStorage.getItem('connected_channels');
    if (saved) {
      setChannels(JSON.parse(saved));
    } else {
      // Default connected platforms (for demo)
      const defaults = [
        { id: 'x', platform: 'x', name: 'X / Twitter', connected: true },
        { id: 'linkedin', platform: 'linkedin', name: 'LinkedIn', connected: true },
        { id: 'bluesky', platform: 'bluesky', name: 'Bluesky', connected: false },
        { id: 'mastodon', platform: 'mastodon', name: 'Mastodon', connected: false },
        { id: 'threads', platform: 'threads', name: 'Threads', connected: false },
      ];
      setChannels(defaults);
    }
    setLoading(false);
  }, []);

  const handleConnect = (platform: string) => {
    setConnecting(platform);
    // Redirect to Postiz OAuth
    window.open(`${POSTIZ_URL}/integrations/social/${platform}`, '_blank');
    
    // After OAuth, user returns - give them a moment to complete
    setTimeout(() => {
      // Update local state to show as "connected"
      const updated = channels.map(ch => 
        ch.platform === platform ? { ...ch, connected: true } : ch
      );
      setChannels(updated);
      localStorage.setItem('connected_channels', JSON.stringify(updated));
      setConnecting(null);
    }, 3000);
  };

  const handleDisconnect = (platform: string) => {
    if (!confirm('Are you sure you want to disconnect this channel?')) return;
    
    const updated = channels.map(ch => 
      ch.platform === platform ? { ...ch, connected: false } : ch
    );
    setChannels(updated);
    localStorage.setItem('connected_channels', JSON.stringify(updated));
  };

  const platforms = [
    { id: 'x', name: 'X / Twitter', emoji: '🐦', color: '#1DA1F2', comingSoon: false },
    { id: 'linkedin', name: 'LinkedIn', emoji: '💼', color: '#0A66C2', comingSoon: false },
    { id: 'linkedin-page', name: 'LinkedIn Page', emoji: '💼', color: '#0A66C2', comingSoon: false },
    { id: 'bluesky', name: 'Bluesky', emoji: '☁️', color: '#1185FE', comingSoon: false },
    { id: 'mastodon', name: 'Mastodon', emoji: '🐘', color: '#6364FF', comingSoon: false },
    { id: 'nostr', name: 'Nostr', emoji: '⚡', color: '#FFD700', comingSoon: false },
    { id: 'threads', name: 'Threads', emoji: '🧵', color: '#000000', comingSoon: false },
    { id: 'facebook', name: 'Facebook', emoji: '📘', color: '#1877F2', comingSoon: true },
    { id: 'instagram', name: 'Instagram', emoji: '📷', color: '#E4405F', comingSoon: true },
    { id: 'instagram-standalone', name: 'Instagram (Standalone)', emoji: '📷', color: '#E4405F', comingSoon: true },
    { id: 'tiktok', name: 'TikTok', emoji: '🎵', color: '#000000', comingSoon: true },
    { id: 'youtube', name: 'YouTube', emoji: '▶️', color: '#FF0000', comingSoon: true },
    { id: 'pinterest', name: 'Pinterest', emoji: '📌', color: '#BD081C', comingSoon: false },
    { id: 'dribbble', name: 'Dribbble', emoji: '🏀', color: '#EA4C89', comingSoon: false },
    { id: 'discord', name: 'Discord', emoji: '🎮', color: '#5865F2', comingSoon: false },
    { id: 'telegram', name: 'Telegram', emoji: '✈️', color: '#0088CC', comingSoon: false },
    { id: 'wordpress', name: 'WordPress', emoji: '📝', color: '#21759B', comingSoon: false },
    { id: 'reddit', name: 'Reddit', emoji: '🤖', color: '#FF4500', comingSoon: false },
    { id: 'slack', name: 'Slack', emoji: '💬', color: '#4A154B', comingSoon: false },
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
