'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [minimaxKey, setMinimaxKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [testTopic, setTestTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user);
    setUser(user);
    
    if (user) {
      // Load saved API key from user metadata
      const apiKey = user.user_metadata?.minimax_api_key || '';
      setMinimaxKey(apiKey);
      
      // Load display name from metadata or email
      const name = user.user_metadata?.display_name || user.email?.split('@')[0] || '';
      setDisplayName(name);
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          display_name: displayName,
          minimax_api_key: minimaxKey
        }
      });
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile saved!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const saveApiKey = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { minimax_api_key: minimaxKey }
      });
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'API key saved!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const testAiGeneration = async () => {
    if (!testTopic.trim()) {
      setMessage({ type: 'error', text: 'Please enter a topic' });
      return;
    }
    
    setTesting(true);
    try {
      const response = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: testTopic,
          userApiKey: minimaxKey
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      
      setGeneratedContent(data.content);
      setMessage({ type: 'success', text: 'Content generated!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setTesting(false);
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
              <p style={{ fontSize: '12px', marginTop: '8px', color: '#6b7280' }}>User ID: {user.id}</p>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              style={{
                marginTop: '16px',
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
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        ) : (
          <p style={{ color: '#9ca3af' }}>Not logged in</p>
        )}
      </div>

      {/* MiniMax AI Section */}
      <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
          🤖 MiniMax AI API Key
        </h2>
        
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
          Enter your MiniMax API key to enable AI-powered post generation. 
          Get your key from <a href="https://platform.minimax.chat" target="_blank" style={{ color: '#3b82f6' }}>platform.minimax.chat</a>
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
            API Key
          </label>
          <input
            type="password"
            value={minimaxKey}
            onChange={(e) => setMinimaxKey(e.target.value)}
            placeholder="Enter your MiniMax API key"
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
        </div>

        <button
          onClick={saveApiKey}
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
          {saving ? 'Saving...' : 'Save API Key'}
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

      {/* AI Test Section */}
      <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
          🧪 Test AI Generation
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
            Topic
          </label>
          <input
            type="text"
            value={testTopic}
            onChange={(e) => setTestTopic(e.target.value)}
            placeholder="e.g., New product launch, Tech news, Crypto tips"
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
        </div>

        <button
          onClick={testAiGeneration}
          disabled={testing}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#10b981',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: testing ? 'not-allowed' : 'pointer',
            opacity: testing ? 0.7 : 1,
          }}
        >
          {testing ? 'Generating...' : 'Generate Post'}
        </button>

        {generatedContent && (
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
              Generated Content:
            </label>
            <div style={{ 
              padding: '16px', 
              borderRadius: '8px', 
              background: '#111827', 
              color: 'white',
              fontSize: '14px',
              whiteSpace: 'pre-wrap'
            }}>
              {generatedContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}