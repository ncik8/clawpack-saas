'use client';

import { useState } from 'react';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';
const MINIMAX_API_KEY = process.env.NEXT_PUBLIC_MINIMAX_API_KEY || '';
const MINIMAX_URL = 'https://api.minimax.io/anthropic';

const SYSTEM_PROMPT = `You are an expert social media copywriter with deep knowledge of hashtags, SEO, engagement optimization, and platform-specific best practices.

Your expertise includes:
- Writing compelling posts that drive engagement
- Using relevant hashtags strategically (1-5 per platform)
- Optimizing for each platform (X:280 chars, LinkedIn:3000, etc.)
- Creating calls-to-action that work
- Understanding what content performs well on each platform

Always provide:
1. A catchy headline/hook
2. 2-3 relevant hashtags
3. A clear, engaging message

Format your response as a ready-to-post message. Keep it authentic and human.`;

export default function SchedulerPage() {
  const [content, setContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['x']);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiError, setAiError] = useState('');

  const platformsList = [
    { id: 'x', name: 'X / Twitter', emoji: '🐦', maxChars: 280 },
    { id: 'linkedin', name: 'LinkedIn', emoji: '💼', maxChars: 3000 },
    { id: 'facebook', name: 'Facebook', emoji: '📘', maxChars: 63206 },
    { id: 'instagram', name: 'Instagram', emoji: '📷', maxChars: 2200 },
  ];

  const handleSchedule = () => {
    window.open(`${POSTIZ_URL}/posts/new`, '_blank');
  };

  const generateAiSuggestions = async () => {
    if (!aiPrompt.trim()) return;
    
    setAiLoading(true);
    setAiError('');
    setAiSuggestions([]);

    const targetPlatform = platforms.includes('x') ? 'X/Twitter' 
      : platforms.includes('linkedin') ? 'LinkedIn' 
      : platforms.includes('instagram') ? 'Instagram' 
      : 'Facebook';

    try {
      const response = await fetch(MINIMAX_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.7',
          max_tokens: 500,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Write 3 engaging social media posts about: "${aiPrompt}". Target platform: ${targetPlatform}. Make each post unique with different angles. Return ONLY the 3 posts, numbered 1-3, nothing else.` }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      
      // Parse the 3 suggestions
      const suggestions = text
        .split(/\n?\d\.\s*/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 20);
      
      setAiSuggestions(suggestions.slice(0, 3));
    } catch (err) {
      setAiError('Failed to generate suggestions. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const useSuggestion = (suggestion: string) => {
    setContent(suggestion);
    setAiSuggestions([]);
    setAiPrompt('');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create Post</h1>
        <p className="text-[#9ca3af]">Write, optimize, and schedule your social media posts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Post Composer */}
        <div>
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Post</h2>
            
            {/* Content */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                What do you want to share?
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content..."
                className="input h-32 resize-none"
                maxLength={platformsList.find(p => platforms.includes(p.id))?.maxChars || 280}
              />
              <p className="text-xs text-[#9ca3af] mt-1">
                {content.length}/{platformsList.find(p => platforms.includes(p.id))?.maxChars || 280} characters
              </p>
            </div>

            {/* Platform Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Select platforms
              </label>
              <div className="flex flex-wrap gap-3">
                {platformsList.map((platform) => (
                  <label
                    key={platform.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                      platforms.includes(platform.id)
                        ? 'bg-[#1780e3]/20 border-[#1780e3] text-white'
                        : 'bg-[#1f2937] border-[#374151] text-[#9ca3af] hover:border-[#1780e3]/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={platforms.includes(platform.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPlatforms([...platforms, platform.id]);
                        } else {
                          setPlatforms(platforms.filter(p => p !== platform.id));
                        }
                      }}
                      className="hidden"
                    />
                    <span>{platform.emoji}</span>
                    <span>{platform.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Schedule Time */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                When to post
              </label>
              <div className="flex gap-3">
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="input flex-1"
                />
                <button
                  onClick={() => {
                    const now = new Date();
                    now.setMinutes(now.getMinutes() + 5);
                    setScheduledTime(now.toISOString().slice(0, 16));
                  }}
                  className="btn btn-secondary"
                >
                  +5 min
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    now.setHours(now.getHours() + 1);
                    setScheduledTime(now.toISOString().slice(0, 16));
                  }}
                  className="btn btn-secondary"
                >
                  +1 hour
                </button>
              </div>
              <p className="text-xs text-[#9ca3af] mt-1">
                Time is in Hong Kong timezone (GMT+8)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSchedule}
                className="btn btn-primary flex-1"
              >
                Create Post
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - AI Assistant */}
        <div>
          <div className="card bg-gradient-to-br from-[#083056] to-[#1780e3]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🤖</span>
              <h2 className="text-xl font-semibold text-white">AI Post Assistant</h2>
            </div>
            <p className="text-white/80 text-sm mb-4">
              Describe your post topic and let AI generate engaging content with optimal hashtags and SEO.
            </p>

            {/* AI Input */}
            <div className="mb-4">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., 'We're launching our new AI tool that helps small businesses automate social media'"
                className="input w-full h-24 resize-none bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>

            <button
              onClick={generateAiSuggestions}
              disabled={aiLoading || !aiPrompt.trim()}
              className="btn w-full mb-4"
              style={{ backgroundColor: '#22c55e', color: 'white' }}
            >
              {aiLoading ? (
                <>
                  <span className="spinner mr-2" />
                  Generating...
                </>
              ) : (
                '✨ Generate Suggestions'
              )}
            </button>

            {aiError && (
              <p className="text-red-300 text-sm mb-4">{aiError}</p>
            )}

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-white text-sm font-medium">Choose a suggestion:</p>
                {aiSuggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="bg-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-colors"
                    onClick={() => {
                      setContent(suggestion);
                      setAiSuggestions([]);
                      setAiPrompt('');
                    }}
                  >
                    <p className="text-white text-sm whitespace-pre-wrap">{suggestion}</p>
                    <p className="text-white/60 text-xs mt-2">Click to use this</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <p className="text-white/80 text-xs">
                <strong>Pro tip:</strong> Be specific about your topic, audience, and goal for better results!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
