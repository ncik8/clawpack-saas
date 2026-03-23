import Link from 'next/link';

export default function DashboardPage() {
  const stats = [
    { label: 'Posts', value: '142', change: '+12%', changeType: 'up' },
    { label: 'Impressions', value: '89%', change: '+8%', changeType: 'up' },
    { label: 'Reach', value: '12.4K', change: '+24%', changeType: 'up' },
    { label: 'Engagement', value: '3.2%', change: '-2%', changeType: 'down' },
  ];

  const recentPosts = [
    {
      id: 1,
      platform: 'x',
      content: 'AI Prompt Tip: Before asking AI to write anything, give it a ROLE + TASK + FORMAT...',
      time: '2 hours ago',
      likes: 23,
      comments: 5,
    },
    {
      id: 2,
      platform: 'linkedin',
      content: 'Excited to announce our latest product launch! After months of development...',
      time: 'Yesterday',
      likes: 156,
      comments: 23,
    },
  ];

  const upcomingPosts = [
    {
      id: 3,
      platform: 'x',
      time: 'Tomorrow 9:00 AM',
      title: 'Weekly AI tip thread',
    },
    {
      id: 4,
      platform: 'instagram',
      time: 'Wed 2:00 PM',
      title: 'Product showcase story',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Good morning, Nick!</h1>
          <p className="text-[#9ca3af] mt-1">March 24, 2026</p>
        </div>
        <Link href="/dashboard/create" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          Create Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-[#9ca3af] text-sm mt-1">{stat.label}</p>
            <p className={`text-xs mt-2 ${stat.changeType === 'up' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {stat.change} from last month
            </p>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Posts</h2>
            <button className="text-sm text-[#1780e3] hover:underline">View all</button>
          </div>
          <div className="space-y-4">
            {recentPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#111827] border border-[#374151]">
                <PlatformIcon platform={post.platform} className="w-5 h-5 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#6b7280]">
                    <span>{post.time}</span>
                    <span className="flex items-center gap-1">
                      <HeartIcon className="w-3 h-3" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <CommentIcon className="w-3 h-3" />
                      {post.comments}
                    </span>
                  </div>
                </div>
                <button className="btn btn-ghost text-xs py-1 px-2">Analytics</button>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Posts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Upcoming</h2>
            <Link href="/dashboard/scheduler" className="text-sm text-[#1780e3] hover:underline">
              View calendar
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingPosts.map((post) => (
              <div key={post.id} className="flex items-center justify-between p-3 rounded-lg bg-[#111827] border border-[#374151]">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={post.platform} className="w-5 h-5" />
                  <div>
                    <p className="text-sm text-white">{post.title}</p>
                    <p className="text-xs text-[#6b7280]">{post.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-ghost text-xs py-1 px-2">Edit</button>
                  <button className="btn btn-primary text-xs py-1 px-2">Post Now</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex gap-3">
          <Link href="/dashboard/create" className="card card-hover flex items-center gap-3">
            <WriteIcon className="w-5 h-5 text-[#1780e3]" />
            <span className="text-white font-medium">Write Post</span>
          </Link>
          <Link href="/dashboard/scheduler" className="card card-hover flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-[#10b981]" />
            <span className="text-white font-medium">Schedule</span>
          </Link>
          <button className="card card-hover flex items-center gap-3">
            <SparklesIcon className="w-5 h-5 text-[#f59e0b]" />
            <span className="text-white font-medium">AI Generate</span>
          </button>
          <Link href="/dashboard/analytics" className="card card-hover flex items-center gap-3">
            <ChartIcon className="w-5 h-5 text-[#E4405F]" />
            <span className="text-white font-medium">Analytics</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function PlatformIcon({ platform, className = 'w-5 h-5' }: { platform: string; className?: string }) {
  const icons: Record<string, JSX.Element> = {
    x: (
      <svg className={`${className} text-[#1DA1F2]`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    linkedin: (
      <svg className={`${className} text-[#0A66C2]`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    instagram: (
      <svg className={`${className} text-[#E4405F]`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  };

  return icons[platform] || <div className={`${className} bg-gray-600 rounded`} />;
}

// Icons
function PlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function HeartIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function CommentIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function CalendarIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

function ChartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function WriteIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}
