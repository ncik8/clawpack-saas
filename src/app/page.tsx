import './globals.css'

export const metadata = {
  title: 'ClawPack - Post to All Social Media in One Click',
  description: 'Connect your accounts. Create once. We post everywhere. TikTok, Instagram, X, LinkedIn, Facebook - done.',
}

export default function Home() {
  return (
    <main className="font-sans bg-white min-h-screen">
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">
            <span className="text-blue-600">🤖</span> ClawPack
          </h1>
          <div className="flex gap-6">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition font-medium">
              How it Works
            </a>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[73px]" />

      {/* Hero - Full Width Image */}
      <section className="w-full">
        <div className="w-full h-[500px] relative overflow-hidden">
          <img 
            src="/hero-full.jpg" 
            alt="ClawPack - Social Media Automation" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center">
            <div className="bg-gradient-to-r from-[#6344ec] to-[#9a3dda] rounded-2xl px-10 py-8 max-w-lg mx-4 text-left shadow-2xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
                Post to all social media<br />in one click
              </h2>
              <p className="text-lg text-white/90 mb-2">
                Connect your accounts. Create once. We post everywhere.
              </p>
              <p className="text-base text-white/70">
                TikTok, Instagram, X, LinkedIn, Facebook - done.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-16 px-6 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-500 text-sm uppercase tracking-wider mb-8">Supported Platforms</p>
          <div className="flex flex-wrap justify-center gap-10 items-center">
            <img src="/tiktok.svg" alt="TikTok" className="h-10 w-10" title="TikTok" />
            <img src="/instagram.svg" alt="Instagram" className="h-10 w-10" title="Instagram" />
            <img src="/x.svg" alt="X" className="h-10 w-10" title="X (Twitter)" />
            <img src="/linkedin.svg" alt="LinkedIn" className="h-10 w-10" title="LinkedIn" />
            <img src="/facebook.svg" alt="Facebook" className="h-10 w-10" title="Facebook" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-slate-900 text-center mb-4">
            All the tools you need in one place
          </h3>
          <p className="text-slate-600 text-center mb-16 max-w-xl mx-auto text-lg">
            Simple, powerful social media management. No complicated setup.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                title: 'One Post, Everywhere',
                desc: 'Write once. We automatically post to all your connected accounts across every platform.'
              },
              {
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                title: 'AI Content Generator',
                desc: 'Tell us your business. Our AI creates engaging posts tailored to your audience.'
              },
              {
                color: 'text-green-600',
                bg: 'bg-green-50',
                title: 'Smart Scheduling',
                desc: 'Post at the perfect time. We analyze your audience and find the best moments.'
              },
              {
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                title: 'Auto-Post Forever',
                desc: 'Set it once. We post every day, week, or month automatically. Just sit back.'
              },
              {
                color: 'text-pink-600',
                bg: 'bg-pink-50',
                title: 'Analytics Dashboard',
                desc: 'See what works. Track likes, shares, comments, and grow your audience.'
              },
              {
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                title: 'Affordable Pricing',
                desc: 'A fraction of what agencies charge. Start free, upgrade when you need more.'
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white border border-slate-200 p-8 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 ${feature.bg} ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {i === 0 && <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    {i === 1 && <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                    {i === 2 && <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                    {i === 3 && <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />}
                    {i === 4 && <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
                    {i === 5 && <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h4>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-slate-900 text-center mb-12">
            How it works
          </h3>
          
          <div className="space-y-8">
            {[
              { step: '1', title: 'Connect your accounts', desc: 'Link TikTok, Instagram, X, LinkedIn, Facebook with one click.' },
              { step: '2', title: 'Create or generate', desc: 'Write your post or let AI generate one for you.' },
              { step: '3', title: 'Post everywhere', desc: 'Click once. We post to all platforms instantly.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to simplify your social media?
          </h3>
          <p className="text-blue-100 mb-8">
            Join the waitlist and get early access.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-6 py-4 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 max-w-sm w-full"
              required
            />
            <button
              type="submit"
              className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition whitespace-nowrap"
            >
              Join Waitlist
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">
            © 2026 ClawPack. All rights reserved.
          </p>
          <div className="flex gap-6 text-slate-400 text-sm">
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
