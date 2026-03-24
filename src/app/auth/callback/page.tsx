'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      // Wait for Supabase to set cookies
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    };
    
    checkSessionAndRedirect();
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
