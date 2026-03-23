'use client';

import { useState } from 'react';

const platforms = [
  { id: 'x', name: 'X / Twitter', checked: true },
  { id: 'linkedin', name: 'LinkedIn', checked: true },
  { id: 'facebook', name: 'Facebook', checked: false },
  { id: 'instagram', name: 'Instagram', checked: false },
];

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'ai' | 'repurpose'>('write');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const charCount = content.length;
  const maxXChars = 280;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Create Post</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'write', label: 'Write', icon: '✏️' },
          { id: 'ai', label: 'AI Assistant', icon: '🤖' },
          { id: 'repurpose', label: 'Repurpose', icon: '🔄' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#1780e3] text-white'
                : 'bg-[#1f2937] text-[#9ca3af] hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="col-span-2 space-y-4">
          {/* Text area */}
          <div className="card">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full h-40 bg-transparent border-none resize-none text-white placeholder-[#6b7280] focus:outline-none"
            />
            <div className="flex items-center justify-between pt-3 border-t border-[#374151]">
              <div className="flex gap-2">
                <button className="btn btn-ghost py-1 px-2 text-xs">📷 Image</button>
                <button className="btn btn-ghost py-1 px-2 text-xs">🎨 AI Image</button>
                <button className="btn btn-ghost py-1 px-2 text-xs">📎 File</button>
              </div>
              <span className={`text-xs ${charCount > maxXChars ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                {charCount > 0 && `${charCount} characters`}
              </span>
            </div>
          </div>

          {/* Media preview */}
          <div className="card">
            <p className="text-sm text-[#9ca3af] mb-3">Media</p>
            <div className="flex gap-2">
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-[#374151] flex items-center justify-center text-[#6b7280] hover:border-[#1780e3] hover:text-[#1780e3] cursor-pointer transition-colors">
                <span className="text-2xl">+</span>
              </div>
            </div>
          </div>

          {/* Platforms */}
          <div className="card">
            <p className="text-sm font-medium text-white mb-3">Platforms</p>
            <div className="space-y-2">
              {platforms.map((platform) => (
                <label key={platform.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platform.checked}
                    className="w-4 h-4 rounded border-[#374151] bg-[#111827] text-[#1780e3] focus:ring-[#1780e3]"
                  />
                  <span className="text-sm text-white">{platform.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="card">
            <p className="text-sm font-medium text-white mb-3">Schedule</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === 'now'}
                  onChange={() => setScheduleMode('now')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-white">Post now</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === 'schedule'}
                  onChange={() => setScheduleMode('schedule')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-white">Schedule</span>
              </label>
            </div>
            {scheduleMode === 'schedule' && (
              <div className="flex gap-3 mt-4">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="input flex-1"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="input flex-1"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button className="btn btn-secondary">Save Draft</button>
            <button className="btn btn-primary">
              {scheduleMode === 'now' ? 'Post Now' : 'Schedule'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="card">
            <p className="text-sm font-medium text-white mb-3">X Preview</p>
            <div className="bg-[#111827] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1780e3] to-[#76afe5]" />
                <div>
                  <p className="text-sm font-medium text-white">Nick Williams</p>
                  <p className="text-xs text-[#6b7280]">@nickwilliams</p>
                </div>
              </div>
              <p className="text-sm text-white mb-2">{content || 'Your post content will appear here...'}</p>
              <div className="flex items-center gap-4 text-[#6b7280] text-xs">
                <span>{charCount}/{maxXChars}</span>
                <span>Retweet</span>
                <span>Like</span>
                <span>Share</span>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-medium text-white mb-3">LinkedIn Preview</p>
            <div className="bg-[#111827] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-bold text-sm">
                  N
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Nick Williams</p>
                  <p className="text-xs text-[#6b7280]">2h ago</p>
                </div>
              </div>
              <p className="text-sm text-white">{content || 'Your post content will appear here...'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
