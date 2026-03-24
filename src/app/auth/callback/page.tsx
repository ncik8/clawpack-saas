'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    // Immediately try to get session and redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" style={{borderTopColor: '#1780e3'}} />
        <p className="text-white">Signing you in...</p>
      </div>
    </div>
  );
}
