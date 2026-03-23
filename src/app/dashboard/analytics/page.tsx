'use client';

export default function AnalyticsPage() {
  const stats = [
    { label: 'Total Reach', value: '12.4K', change: '+12%', up: true },
    { label: 'Impressions', value: '89%', change: '+8%', up: true },
    { label: 'Engagement Rate', value: '3.2%', change: '-2%', up: false },
    { label: 'Revenue', value: '$2.1K', change: '+24%', up: true },
  ];

  const platformData = [
    { platform: 'X', percentage: 45, color: '#1DA1F2' },
    { platform: 'LinkedIn', percentage: 30, color: '#0A66C2' },
    { platform: 'Instagram', percentage: 15, color: '#E4405F' },
    { platform: 'Facebook', percentage: 10, color: '#1877F2' },
  ];

  const topPosts = [
    { platform: 'x', content: 'AI Prompt tip about prompts...', reach: '2.1K', likes: 156 },
    { platform: 'linkedin', content: 'Product launch announcement...', reach: '1.8K', likes: 89 },
    { platform: 'instagram', content: 'Behind the scenes story...', reach: '1.2K', likes: 67 },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <select className="input w-auto">
          <option>Last 30 days</option>
          <option>Last 7 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-[#9ca3af] text-sm mt-1">{stat.label}</p>
            <p className={`text-xs mt-2 ${stat.up ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {stat.change} from last month
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Platform breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Performance</h3>
          <div className="space-y-4">
            {platformData.map((item) => (
              <div key={item.platform}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white">{item.platform}</span>
                  <span className="text-sm text-[#9ca3af]">{item.percentage}%</span>
                </div>
                <div className="h-2 bg-[#111827] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best times */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Best Time to Post</h3>
          <div className="grid grid-cols-7 gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs text-[#6b7280] mb-2">{day}</div>
            ))}
            {Array.from({ length: 7 * 5 }).map((_, i) => {
              const intensity = Math.random();
              return (
                <div
                  key={i}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: intensity > 0.7 
                      ? '#10b981' 
                      : intensity > 0.4 
                        ? '#10b981/50'
                        : '#111827'
                  }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-[#6b7280]">
            <span>Low</span>
            <div className="w-3 h-3 rounded-sm bg-[#111827]" />
            <div className="w-3 h-3 rounded-sm bg-[#10b981]/50" />
            <div className="w-3 h-3 rounded-sm bg-[#10b981]" />
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Top posts */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Top Posts</h3>
        <div className="space-y-3">
          {topPosts.map((post, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-[#111827] border border-[#374151]"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-[#6b7280]">#{index + 1}</span>
                <div>
                  <p className="text-sm text-white line-clamp-1">{post.content}</p>
                  <p className="text-xs text-[#6b7280] mt-1">{post.reach} reach</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#10b981]">❤️ {post.likes}</span>
                <button className="btn btn-ghost text-xs">View</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
