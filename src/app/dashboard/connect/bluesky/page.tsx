'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BlueskyConnectPage() {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not logged in');
        return;
      }

      // Call our API to connect Bluesky
      const response = await fetch('/api/connect/bluesky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to connect');
        return;
      }

      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard/connected-accounts';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <div className="bg-green-500/20 border border-green-500 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">☁️</div>
          <h2 className="text-xl font-bold text-white mb-2">Connected!</h2>
          <p className="text-[#9ca3af]">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Connect Bluesky</h1>
        <p className="text-[#9ca3af] text-sm">
          Enter your Bluesky credentials to connect your account.
        </p>
      </div>

      <form onSubmit={handleConnect} className="space-y-4">
        <div>
          <label className="block text-sm text-[#9ca3af] mb-2">
            Bluesky Handle
          </label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="yourname.bsky.social"
            className="w-full px-4 py-3 rounded-lg bg-[#111827] border border-[#374151] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1780e3]"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-[#9ca3af] mb-2">
            App Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            className="w-full px-4 py-3 rounded-lg bg-[#111827] border border-[#374151] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1780e3]"
            required
          />
          <p className="text-xs text-[#6b7280] mt-2">
            Get your app password from{' '}
            <a 
              href="https://bsky.app/settings/app-passwords" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#3b82f6] hover:underline"
            >
              Bluesky Settings → App Passwords
            </a>
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-[#1780e3] text-white font-bold hover:bg-[#166bc7] transition-colors disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect Bluesky'}
        </button>
      </form>

      <div className="mt-6 p-4 rounded-lg bg-[#1f2937] border border-[#374151]">
        <p className="text-sm text-[#9ca3af]">
          <strong className="text-white">How to get an App Password:</strong><br/>
          1. Go to.bsky.app<br/>
          2. Settings → App Passwords<br/>
          3. Create a new app password<br/>
          4. Copy and paste it here
        </p>
      </div>
    </div>
  );
}