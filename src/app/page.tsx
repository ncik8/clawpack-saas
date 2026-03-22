import './globals.css'
import { Inter, Poppins } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const poppins = Poppins({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-poppins' })

export const metadata = {
  title: 'ClawPack - Post to All Social Media in One Click',
  description: 'Connect your accounts. Create once. We post everywhere. TikTok, Instagram, X, LinkedIn, Facebook - done.',
}

export default function Home() {
  return (
    <main className={`${inter.variable} ${poppins.variable} font-sans bg-white min-h-screen`}>
      {/* Header */}
      <header className="p-6 border-b border-slate-200">
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

      {/* Hero - Full Width Image */}
      <section className="w-full">
        <div className="w-full h-[500px] relative overflow-hidden">
          <img 
            src="/hero-full.jpg" 
            alt="ClawPack - Social Media Automation" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end">
            <div className="max-w-6xl mx-auto w-full px-6 pb-16">
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Post to all social media
                <br />
                <span className="text-blue-400">in one click</span>
              </h2>
              <p className="text-xl text-slate-200 max-w-xl">
                Connect your accounts. Create once. We post everywhere.
                <br />
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
          <div className="flex flex-wrap justify-center gap-8 text-4xl">
            <span title="TikTok">📱</span>
            <span title="Instagram">📸</span>
            <span title="X (Twitter)">𝕏</span>
            <span title="LinkedIn">💼</span>
            <span title="Facebook">📘</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Everything you need
          </h3>
          <p className="text-slate-600 text-center mb-12 max-w-xl mx-auto">
            Simple, powerful social media management. No complicated setup.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                emoji: '🚀',
                title: 'One Post, Everywhere',
                desc: 'Write once. We post to all your connected accounts automatically.'
              },
              {
                emoji: '🤖',
                title: 'AI Content Generator',
                desc: 'Tell us your business. We generate engaging posts for you.'
              },
              {
                emoji: '📊',
                title: 'Analytics Dashboard',
                desc: 'See what works. Track likes, shares, and engagement.'
              },
              {
                emoji: '📅',
                title: 'Smart Scheduling',
                desc: 'Post at the best times for your audience.'
              },
              {
                emoji: '🔄',
                title: 'Auto-Post Forever',
                desc: 'Set it once. We post every day, week, or month.'
              },
              {
                emoji: '💰',
                title: 'Affordable Pricing',
                desc: 'A fraction of what agencies charge. Free to start.'
              },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl hover:border-blue-300 hover:shadow-lg transition">
                <span className="text-4xl mb-4 block">{feature.emoji}</span>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h4>
                <p className="text-slate-600">{feature.desc}</p>
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
