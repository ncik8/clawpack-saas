'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for the reset link!');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-[#1780e3] to-[#76afe5] mb-4">
          <span className="text-white font-bold text-2xl">CP</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        <p className="text-[#9ca3af] mt-2">Enter your email to receive a reset link</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-sm">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
            {loading ? <span className="spinner" /> : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-sm text-[#9ca3af] mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-[#1780e3] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
