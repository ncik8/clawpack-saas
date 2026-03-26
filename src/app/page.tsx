import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[#1f2937]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1780e3] to-[#76afe5] flex items-center justify-center">
            <span className="text-white font-bold">CP</span>
          </div>
          <span className="text-white font-semibold text-xl">ClawPack</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-[#9ca3af] hover:text-white transition-colors">
            Pricing
          </Link>
          <Link 
            href="/login" 
            className="px-5 py-2 bg-[#1780e3] text-white rounded-lg font-medium hover:bg-[#166bc7] transition-colors"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Social media&apos;s most powerful<br />automation platform
          </h1>
          <p className="text-xl text-[#9ca3af] mb-10 max-w-2xl mx-auto">
            Schedule posts, generate AI content, and manage all your social accounts from one dashboard.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-16">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1 px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1780e3]"
            />
            <button className="px-6 py-3 bg-[#1780e3] text-white rounded-lg font-medium hover:bg-[#166bc7] transition-colors whitespace-nowrap">
              Get Started
            </button>
          </div>

          {/* Platform icons */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {[
              { name: 'X', icon: '🐦', color: '#1DA1F2' },
              { name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
              { name: 'Facebook', icon: '📘', color: '#1877F2' },
              { name: 'Instagram', icon: '📷', color: '#E4405F' },
              { name: 'TikTok', icon: '🎵', color: '#000000' },
              { name: 'Bluesky', icon: '☁️', color: '#1185FE' },
              { name: 'Discord', icon: '🎮', color: '#5865F2' },
              { name: 'Telegram', icon: '✈️', color: '#0088CC' },
            ].map((platform) => (
              <div 
                key={platform.name}
                className="w-12 h-12 rounded-xl bg-[#1f2937] border border-[#374151] flex items-center justify-center hover:border-[#1780e3] transition-colors"
                title={platform.name}
              >
                <span className="text-xl">{platform.icon}</span>
              </div>
            ))}
          </div>

          {/* Hero image placeholder */}
          <div className="bg-[#1f2937] rounded-2xl border border-[#374151] p-8 max-w-3xl mx-auto">
            <div className="bg-[#111827] rounded-xl h-64 flex items-center justify-center">
              <span className="text-[#6b7280]">Dashboard Preview</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features - on grey background */}
      <section className="px-8 py-20 bg-[#111827]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Everything you need to dominate social media
          </h2>
          <p className="text-[#9ca3af] text-center mb-12 max-w-2xl mx-auto">
            Powerful features that save you time and grow your audience.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🤖',
                title: 'AI Content Generation',
                description: 'Generate engaging posts with AI. Never stare at a blank composer again.'
              },
              {
                icon: '📅',
                title: 'Smart Scheduling',
                description: 'Schedule posts at the best times. AI finds optimal posting times for your audience.'
              },
              {
                icon: '📊',
                title: 'Analytics Dashboard',
                description: 'Track performance across all platforms in one place. Know what works.'
              },
              {
                icon: '🔗',
                title: '15+ Platforms',
                description: 'Connect all your accounts. X, LinkedIn, Facebook, Instagram, TikTok, and more.'
              },
              {
                icon: '✍️',
                title: 'Content Templates',
                description: 'Start fast with proven templates. Customize for your brand voice.'
              },
              {
                icon: '⚡',
                title: 'Bulk Scheduling',
                description: 'Upload a month of content in minutes. CSV import makes it easy.'
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-[#1f2937] rounded-xl p-6 border border-[#374151]">
                <span className="text-3xl mb-4 block">{feature.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-[#9ca3af] text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your social media?
          </h2>
          <p className="text-[#9ca3af] mb-8">
            Start free. No credit card required.
          </p>
          <Link 
            href="/signup" 
            className="inline-block px-8 py-4 bg-[#1780e3] text-white rounded-xl font-semibold text-lg hover:bg-[#166bc7] transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-[#1f2937]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1780e3] to-[#76afe5] flex items-center justify-center">
              <span className="text-white font-bold text-sm">CP</span>
            </div>
            <span className="text-white font-semibold">ClawPack</span>
          </div>
          <div className="flex gap-6 text-sm text-[#9ca3af]">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
          <p className="text-sm text-[#6b7280]">
            © 2026 ClawPack. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
