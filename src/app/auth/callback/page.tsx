'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Check for OAuth hash in URL
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Give time for cookies to be set
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } else {
      // No hash, try to get session anyway
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      });
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-white">Signing you in...</p>
      </div>
    </div>
  );
}
