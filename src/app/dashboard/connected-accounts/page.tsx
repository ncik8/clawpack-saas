'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const POSTIZ_API_KEY = process.env.NEXT_PUBLIC_POSTIZ_API_KEY || '';

interface Channel {
  id: string;
  integration: {
    id: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
    provider: string;
  };
  connectedAt: string;
  health: boolean;
}

export default function ConnectedAccountsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch(`${POSTIZ_URL}/api/v1/channels`, {
        headers: {
          Authorization: `Bearer ${POSTIZ_API_KEY}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (provider: string) => {
    // Redirect to Postiz for OAuth connection
    window.open(`${POSTIZ_URL}/integrations/social/${provider}`, '_blank');
    setConnecting(provider);
    
    // Refresh channels after connection
    setTimeout(() => {
      fetchChannels();
      setConnecting(null);
    }, 5000);
  };

  const handleDisconnect = async (channelId: string) => {
    if (!confirm('Are you sure you want to disconnect this channel?')) return;
    
    try {
      const res = await fetch(`${POSTIZ_URL}/api/v1/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${POSTIZ_API_KEY}`,
        },
      });
      if (res.ok) {
        setChannels(channels.filter(c => c.id !== channelId));
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const platforms = [
    { 
      id: 'x', 
      name: 'X / Twitter', 
      description: 'Post tweets and manage your Twitter account',
      connected: channels.some(c => c.integration.provider === 'x'),
      icon: (
        <svg className="w-8 h-8 text-[#1DA1F2]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      description: 'Share posts and connect with your network',
      connected: channels.some(c => c.integration.provider === 'linkedin'),
      icon: (
        <svg className="w-8 h-8 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      description: 'Post to your Facebook page or profile',
      connected: channels.some(c => c.integration.provider === 'facebook'),
      icon: (
        <svg className="w-8 h-8 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      description: 'Share photos and stories to Instagram',
      connected: channels.some(c => c.integration.provider === 'instagram'),
      icon: (
        <svg className="w-8 h-8 text-[#E4405F]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      ),
    },
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      description: 'Create and share TikTok videos',
      connected: channels.some(c => c.integration.provider === 'tiktok'),
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
        </svg>
      ),
    },
    { 
      id: 'youtube', 
      name: 'YouTube', 
      description: 'Upload videos and manage your channel',
      connected: channels.some(c => c.integration.provider === 'youtube'),
      icon: (
        <svg className="w-8 h-8 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Connected Accounts</h1>
        <p className="text-[#9ca3af]">Connect your social media accounts to start posting</p>
      </div>

      {/* Postiz Status */}
      <div className="mb-6 p-4 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30">
        <p className="text-sm text-[#22c55e]">
          ✅ Connected to <strong>Postiz</strong> at {POSTIZ_URL}
        </p>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platforms.map((platform) => {
          const isConnected = platform.connected;
          const isConnecting = connecting === platform.id;
          
          return (
            <div key={platform.id} className="card hover:border-[#1780e3]/50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${isConnected ? 'bg-[#22c55e]/20' : 'bg-[#374151]'}`}>
                  {platform.icon}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{platform.name}</h3>
                    {isConnected && (
                      <span className="badge badge-success text-xs">Connected</span>
                    )}
                  </div>
                  <p className="text-sm text-[#9ca3af] mt-1">{platform.description}</p>
                </div>
              </div>

              {/* Action */}
              <div className="mt-6 flex gap-3">
                {isConnected ? (
                  <>
                    <button 
                      className="btn btn-secondary flex-1"
                      onClick={() => window.open(`${POSTIZ_URL}/channels`, '_blank')}
                    >
                      Manage in Postiz
                    </button>
                    <button 
                      className="btn btn-ghost text-[#ef4444]"
                      onClick={() => {
                        const channel = channels.find(c => c.integration.provider === platform.id);
                        if (channel) handleDisconnect(channel.id);
                      }}
                    >
                      Disconnect
                    </button>
                  </>
                ) : isConnecting ? (
                  <button className="btn btn-primary flex-1" disabled>
                    <span className="spinner mr-2" />
                    Connecting...
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary flex-1"
                    onClick={() => handleConnect(platform.id)}
                  >
                    Connect {platform.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-8 p-4 rounded-lg bg-[#1780e3]/10 border border-[#1780e3]/30">
        <p className="text-sm text-[#1780e3]">
          <strong>How it works:</strong> Clicking Connect opens Postiz where you authorize 
          the account. Once connected, you can schedule posts to multiple platforms from one place.
        </p>
      </div>
    </div>
  );
}
