'use client';

import { useState } from 'react';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am to 7pm

export default function SchedulerPage() {
  const [currentDate, setCurrentDate] = useState(new Date('2026-03-24'));

  const scheduledPosts = [
    { id: 1, platform: 'x', time: '9:00 AM', title: 'Weekly AI tip thread', day: 'Tue', color: '#1DA1F2' },
    { id: 2, platform: 'instagram', time: '2:00 PM', title: 'Product showcase story', day: 'Wed', color: '#E4405F' },
    { id: 3, platform: 'linkedin', time: '11:00 AM', title: 'Company update', day: 'Thu', color: '#0A66C2' },
  ];

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Scheduler</h1>
        <button className="btn btn-primary">+ Add Post</button>
      </div>

      {/* Calendar */}
      <div className="card mb-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <button className="btn btn-ghost">&lt;</button>
          <h2 className="text-lg font-medium text-white">{getMonthName(currentDate)}</h2>
          <button className="btn btn-ghost">&gt;</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {days.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-[#9ca3af] py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for first week */}
          <div className="aspect-square" />
          <div className="aspect-square" />
          <div className="aspect-square" />
          <div className="aspect-square" />
          <div className="aspect-square" />
          <div className="aspect-square" />
          <div className="aspect-square" />
          
          {/* Week 1 */}
          {[24, 25, 26, 27, 28, 29, 30].map((day) => (
            <div
              key={`w1-${day}`}
              className={`aspect-square rounded-lg border border-[#374151] p-2 ${
                day === 24 ? 'bg-[#1780e3]/10 border-[#1780e3]' : ''
              }`}
            >
              <span className={`text-sm ${day === 24 ? 'text-[#1780e3] font-medium' : 'text-white'}`}>
                {day}
              </span>
              {day === 25 && (
                <div className="mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1DA1F2] mx-auto" />
                </div>
              )}
              {day === 27 && (
                <div className="mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E4405F] mx-auto" />
                </div>
              )}
              {day === 28 && (
                <div className="mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] mx-auto" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled posts list */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">March 2026</h2>
        <div className="space-y-3">
          {scheduledPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between p-4 rounded-lg bg-[#111827] border border-[#374151]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: post.color }}
                />
                <div>
                  <p className="text-sm font-medium text-white">{post.title}</p>
                  <p className="text-xs text-[#6b7280]">
                    {post.day} at {post.time}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost text-xs py-1 px-2">Edit</button>
                <button className="btn btn-ghost text-xs py-1 px-2 text-[#ef4444]">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
