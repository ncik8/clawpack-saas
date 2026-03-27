'use client';

import { useState } from 'react';

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://post.clawpack.net';

export default function SchedulerPage() {
  const [content, setContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['x']);

  const handleSchedule = () => {
    // Redirect to scheduling page to create a new post
    window.open(`${POSTIZ_URL}/posts/new`, '_blank');
  };

  const platformsList = [
    { id: 'x', name: 'X / Twitter', emoji: '🐦' },
    { id: 'linkedin', name: 'LinkedIn', emoji: '💼' },
    { id: 'facebook', name: 'Facebook', emoji: '📘' },
    { id: 'instagram', name: 'Instagram', emoji: '📷' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Schedule Posts</h1>
        <p className="text-[#9ca3af]">Create and schedule social media posts</p>
      </div>

      {/* Quick Schedule Card */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Create New Post</h2>
        
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
            maxLength={280}
          />
          <p className="text-xs text-[#9ca3af] mt-1">{content.length}/280 characters</p>
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

        <p className="text-xs text-[#9ca3af] mt-4">
          Opens the post composer where you can preview, add images, and schedule.
        </p>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-lg bg-[#1780e3]/10 border border-[#1780e3]/30">
        <p className="text-sm text-[#1780e3]">
          <strong>How it works:</strong> Create your post, select platforms, and schedule. 
          Your content will be published automatically at the scheduled time.
        </p>
      </div>
    </div>
  );
}
