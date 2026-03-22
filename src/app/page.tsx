'use client'

import { useState } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubmitted(true)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="p-6 border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            <span className="text-blue-400">🤖</span> ClawPack
          </h1>
          <a href="#pricing" className="px-4 py-2 text-sm text-slate-300 hover:text-white transition">
            Pricing
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Post to all social media
            <br />
            <span className="text-blue-400">in one click</span>
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-xl mx-auto">
            Connect your accounts. Create once. We post everywhere.
            <br />
            TikTok, Instagram, X, LinkedIn, Facebook - done.
          </p>
          
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
              <button
                type="submit"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition whitespace-nowrap"
              >
                Get Early Access
              </button>
            </form>
          ) : (
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl px-6 py-4 max-w-md mx-auto">
              <p className="text-green-400 font-semibold">✓ You're on the list!</p>
              <p className="text-slate-400 text-sm mt-1">We'll notify you when we launch.</p>
            </div>
          )}
        </div>
      </section>

      {/* Platforms */}
      <section className="py-16 px-6 border-y border-slate-800">
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
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-4">
            Everything you need
          </h3>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
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
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl hover:border-slate-600 transition">
                <span className="text-4xl mb-4 block">{feature.emoji}</span>
                <h4 className="text-xl font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-slate-800/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-12">
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
                  <h4 className="text-xl font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-4">
            Simple Pricing
          </h3>
          <p className="text-slate-400 text-center mb-12">
            Start free. Upgrade when you need more.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <h4 className="text-xl font-semibold text-white mb-2">Free</h4>
              <p className="text-4xl font-bold text-white mb-6">$0<span className="text-lg text-slate-400 font-normal">/mo</span></p>
              <ul className="space-y-3 text-slate-400 mb-8">
                <li>✓ 3 social accounts</li>
                <li>✓ 10 posts per month</li>
                <li>✓ Basic scheduling</li>
                <li>✓ Manual posting</li>
              </ul>
              <button className="w-full py-3 border border-slate-600 text-slate-300 rounded-xl hover:border-slate-500 transition">
                Get Started
              </button>
            </div>
            
            {/* Pro */}
            <div className="bg-blue-600/10 border-2 border-blue-500 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-sm px-3 py-1 rounded-full">
                Popular
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Pro</h4>
              <p className="text-4xl font-bold text-white mb-6">$19<span className="text-lg text-slate-400 font-normal">/mo</span></p>
              <ul className="space-y-3 text-slate-400 mb-8">
                <li>✓ 10 social accounts</li>
                <li>✓ Unlimited posts</li>
                <li>✓ AI content generation</li>
                <li>✓ Smart scheduling</li>
                <li>✓ Analytics</li>
                <li>✓ Priority support</li>
              </ul>
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">
                Start Free Trial
              </button>
            </div>
            
            {/* Agency */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <h4 className="text-xl font-semibold text-white mb-2">Agency</h4>
              <p className="text-4xl font-bold text-white mb-6">$49<span className="text-lg text-slate-400 font-normal">/mo</span></p>
              <ul className="space-y-3 text-slate-400 mb-8">
                <li>✓ Unlimited accounts</li>
                <li>✓ Unlimited posts</li>
                <li>✓ White-label</li>
                <li>✓ Client management</li>
                <li>✓ API access</li>
                <li>✓ Dedicated support</li>
              </ul>
              <button className="w-full py-3 border border-slate-600 text-slate-300 rounded-xl hover:border-slate-500 transition">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to simplify your social media?
          </h3>
          <p className="text-slate-400 mb-8">
            Join the waitlist and get early access.
          </p>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 max-w-sm"
                required
              />
              <button
                type="submit"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              >
                Join Waitlist
              </button>
            </form>
          ) : (
            <p className="text-green-400 font-semibold">✓ You're on the list!</p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
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
