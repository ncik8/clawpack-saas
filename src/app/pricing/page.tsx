import Link from 'next/link';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#083056] to-[#1780e3] text-white py-12 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-white/90">
            $5/month includes 100 X posts. All other platforms free.
          </p>
        </div>
      </header>

      {/* Pricing Cards */}
      <section className="py-16 px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          
          {/* Free Tier */}
          <div className="bg-[#1f2937] rounded-2xl p-8 border border-[#374151]">
            <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
            <p className="text-[#9ca3af] text-sm mb-6">Try it out</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-[#9ca3af]">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                '5 posts per month',
                'All platforms',
                'Basic analytics',
                'Email support',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-[#9ca3af]">
                  <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link 
              href="/signup" 
              className="block w-full py-3 text-center bg-[#374151] text-white rounded-xl font-semibold hover:bg-[#4b5563] transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Starter - X Included */}
          <div className="bg-[#1f2937] rounded-2xl p-8 border-2 border-[#1780e3] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#1780e3] rounded-full text-sm text-white font-medium">
              Most Popular
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Starter</h3>
            <p className="text-[#9ca3af] text-sm mb-6">Perfect for individuals</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$5</span>
              <span className="text-[#9ca3af]">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                '100 X posts/month',
                'Unlimited posts (other platforms)',
                'All 15+ platforms',
                'Advanced analytics',
                'Priority support',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-[#9ca3af]">
                  <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link 
              href="/signup" 
              className="block w-full py-3 text-center bg-[#1780e3] text-white rounded-xl font-semibold hover:bg-[#166bc7] transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-[#1f2937] rounded-2xl p-8 border border-[#374151]">
            <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
            <p className="text-[#9ca3af] text-sm mb-6">For power users</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$15</span>
              <span className="text-[#9ca3af]">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                '500 X posts/month',
                'Unlimited posts (other platforms)',
                'All 15+ platforms',
                'Advanced analytics',
                'Priority support',
                'API access',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-[#9ca3af]">
                  <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link 
              href="/signup" 
              className="block w-full py-3 text-center bg-[#374151] text-white rounded-xl font-semibold hover:bg-[#4b5563] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* X Pricing Note */}
      <section className="py-8 px-8 bg-[#1f2937]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#9ca3af]">
            <strong className="text-white">X posts cost $0.02 each.</strong> Your plan includes a monthly allowance. 
            Additional posts are billed at cost. Other platforms (LinkedIn, Facebook, Bluesky, Mastodon, etc.) are always free and unlimited.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'What platforms are supported?',
                a: 'X/Twitter, LinkedIn, Facebook, Instagram, Bluesky, Mastodon, Nostr, TikTok, YouTube, Discord, Telegram, WordPress, Dribbble, Pinterest, Threads, and more. All free and unlimited except X.'
              },
              {
                q: 'What counts as a post?',
                a: 'Only X/Twitter posts count toward your monthly limit. All other platforms (LinkedIn, Facebook, Bluesky, etc.) are unlimited and free.'
              },
              {
                q: 'What if I exceed my X post limit?',
                a: 'You can purchase additional X posts at $0.02 each (cost price). Or upgrade to a higher tier for more monthly X posts.'
              },
              {
                q: 'Can I change plans anytime?',
                a: 'Yes! Upgrade or downgrade at any time. Changes take effect immediately.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! Start with our Free tier (5 posts/month) and upgrade when you need more.'
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-[#1f2937] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-[#9ca3af]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-[#9ca3af] mb-8">
            Join ClawPack AI today. $5/month for 100 X posts + unlimited everything else.
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
      <footer className="py-8 px-8 border-t border-[#374151]">
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
