import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Hero Section */}
      <header className="bg-gradient-to-br from-[#083056] to-[#1780e3] text-white py-20 px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur mb-6">
            <span className="text-3xl font-bold">CP</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            ClawPack AI
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Schedule and publish social media posts across 15+ platforms from one place. 
            X, LinkedIn, Instagram, Facebook, Bluesky, Mastodon, Nostr, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/login" 
              className="px-8 py-4 bg-white text-[#1780e3] rounded-xl font-semibold text-lg hover:bg-white/90 transition-colors"
            >
              Get Started Free
            </Link>
            <Link 
              href="/pricing" 
              className="px-8 py-4 bg-white/10 backdrop-blur text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </header>

      {/* Supported Platforms */}
      <section className="py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Supported Platforms
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'X / Twitter', icon: '🐦', color: '#1DA1F2' },
              { name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
              { name: 'Facebook', icon: '📘', color: '#1877F2' },
              { name: 'Instagram', icon: '📷', color: '#E4405F' },
              { name: 'Bluesky', icon: '☁️', color: '#1185FE' },
              { name: 'Mastodon', icon: '🐘', color: '#6364FF' },
              { name: 'Nostr', icon: '⚡', color: '#黄金色' },
              { name: 'TikTok', icon: '🎵', color: '#000000' },
              { name: 'YouTube', icon: '▶️', color: '#FF0000' },
              { name: 'Discord', icon: '🎮', color: '#5865F2' },
              { name: 'Telegram', icon: '✈️', color: '#0088CC' },
              { name: 'WordPress', icon: '📝', color: '#21759B' },
              { name: 'Dribbble', icon: '🏀', color: '#EA4C89' },
              { name: 'Pinterest', icon: '📌', color: '#BD081C' },
              { name: 'Threads', icon: '🧵', color: '#000000' },
              { name: 'Mighty Networks', icon: '🌐', color: '#4C4C9D' },
            ].map((platform) => (
              <div 
                key={platform.name}
                className="bg-[#1f2937] rounded-xl p-4 flex items-center gap-3 hover:bg-[#374151] transition-colors"
              >
                <span className="text-2xl">{platform.icon}</span>
                <span className="text-white font-medium">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-8 bg-[#1f2937]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'AI-Powered Prompts',
                description: 'Access 100+ expert-crafted prompts for content creation, coding, marketing, and research.',
                icon: '🤖'
              },
              {
                title: 'Smart Scheduling',
                description: 'Schedule posts across all platforms from one dashboard. Set it and forget it.',
                icon: '📅'
              },
              {
                title: 'Analytics',
                description: 'Track your social media performance with detailed analytics.',
                icon: '📊'
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-[#0a0f1a] rounded-xl p-6">
                <span className="text-4xl mb-4 block">{feature.icon}</span>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-[#9ca3af]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-[#9ca3af] mb-8">
            Pay only for what you use. No monthly fees, no commitments.
          </p>
          <Link 
            href="/pricing" 
            className="inline-block px-8 py-4 bg-[#1780e3] text-white rounded-xl font-semibold text-lg hover:bg-[#166bc7] transition-colors"
          >
            View All Plans
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-[#374151]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1780e3] to-[#76afe5] flex items-center justify-center">
              <span className="text-white font-bold text-sm">CP</span>
            </div>
            <span className="text-white font-semibold">ClawPack AI</span>
          </div>
          <div className="flex gap-6 text-sm text-[#9ca3af]">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
          <p className="text-sm text-[#6b7280]">
            © 2026 ClawPack AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
