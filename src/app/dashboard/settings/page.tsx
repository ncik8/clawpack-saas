'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [stabilityKey, setStabilityKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const apiKey = user.user_metadata?.stability_api_key || '';
      setStabilityKey(apiKey);
      const name = user.user_metadata?.display_name || user.email?.split('@')[0] || '';
      setDisplayName(name);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          display_name: displayName,
          stability_api_key: stabilityKey
        }
      });
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'Saved!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>
        ⚙️ Settings
      </h1>

      {/* Profile Section */}
      <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
          👤 Profile
        </h2>
        {user ? (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  background: '#111827',
                  color: 'white',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>
              <p><strong style={{ color: 'white' }}>Email:</strong> {user.email}</p>
            </div>
          </div>
        ) : (
          <p style={{ color: '#9ca3af' }}>Not logged in</p>
        )}
      </div>

      {/* AI APIs Section */}
      <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
          🤖 AI API Keys
        </h2>
        
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
          Add your API keys to enable AI features. MiniMax AI is available for all users automatically.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
            Stability AI API Key (for image generation)
          </label>
          <input
            type="password"
            value={stabilityKey}
            onChange={(e) => setStabilityKey(e.target.value)}
            placeholder="sk-..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #374151',
              background: '#111827',
              color: 'white',
              fontSize: '14px',
            }}
          />
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Get your key from <a href="https://platform.stability.ai" target="_blank" style={{ color: '#3b82f6' }}>platform.stability.ai</a>
          </p>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#3b82f6',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

        {message && (
          <p style={{ 
            color: message.type === 'success' ? '#10b981' : '#ef4444', 
            marginTop: '12px',
            fontSize: '14px'
          }}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}