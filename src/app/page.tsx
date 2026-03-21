'use client'

import { useState } from 'react'

export default function Home() {
  const [step, setStep] = useState(1)
  const [businessType, setBusinessType] = useState('')
  const [businessName, setBusinessName] = useState('')

  const businessTypes = [
    { id: 'plumber', name: 'Plumber', emoji: '🔧' },
    { id: 'salon', name: 'Beauty Salon', emoji: '💅' },
    { id: 'gym', name: 'Gym / Trainer', emoji: '💪' },
    { id: 'dentist', name: 'Dentist', emoji: '🦷' },
    { id: 'restaurant', name: 'Restaurant', emoji: '🍽️' },
    { id: 'limo', name: 'Limo / Transport', emoji: '🚗' },
    { id: 'realtor', name: 'Real Estate', emoji: '🏠' },
    { id: 'other', name: 'Other', emoji: '✨' },
  ]

  const handleSubmit = () => {
    if (!businessType || !businessName) return
    // TODO: Connect to backend
    alert(`Setting up ${businessName} as a ${businessType} business!`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="p-6 border-b border-slate-700">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-400">🤖 ClawPack AI</h1>
          <button className="px-4 py-2 text-sm text-slate-300 hover:text-white">
            Login
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center py-20 px-6">
        <h2 className="text-5xl font-bold text-white mb-6">
          Your AI Business Assistant
        </h2>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          One platform that builds your website, books appointments, 
          posts to social media, and talks to your customers.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg">
            Start Free Trial
          </button>
          <button className="px-8 py-4 border border-slate-600 hover:border-slate-500 text-white rounded-xl font-semibold text-lg">
            Watch Demo
          </button>
        </div>
      </section>

      {/* Setup Wizard */}
      <section className="max-w-xl mx-auto px-6 pb-20">
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${
                  s <= step ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">
                What type of business do you have?
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {businessTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setBusinessType(type.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      businessType === type.id
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-2xl mr-3">{type.emoji}</span>
                    {type.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!businessType}
                className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">
                What's your business name?
              </h3>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Austin Plumbing Co."
                className="w-full px-4 py-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border border-slate-600 text-slate-300 rounded-xl font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!businessName}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">
                Your AI assistant is ready! 🚀
              </h3>
              <div className="space-y-4 text-slate-300">
                <p>For <span className="text-white font-semibold">{businessName}</span>, I'll set up:</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="text-green-400">✓</span>
                    Professional website
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-400">✓</span>
                    Booking system
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-400">✓</span>
                    Social media auto-posting
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-green-400">✓</span>
                    AI chatbot for customers
                  </li>
                </ul>
              </div>
              <button
                onClick={handleSubmit}
                className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg"
              >
                Create My Business →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h3 className="text-3xl font-bold text-white text-center mb-12">
          Everything your business needs
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { 
              title: '🌐 AI Website Builder', 
              desc: 'Describe your business and AI builds a professional website in minutes'
            },
            { 
              title: '📅 Smart Booking', 
              desc: 'Customers book appointments online, AI manages your calendar'
            },
            { 
              title: '📱 Social Auto-Post', 
              desc: 'AI posts to TikTok, Instagram, Facebook, LinkedIn automatically'
            },
            { 
              title: '💬 AI Chatbot', 
              desc: 'AI talks to customers 24/7 on WhatsApp, WeChat, or your website'
            },
            { 
              title: '💳 Easy Payments', 
              desc: 'Accept payments online, no complicated setup'
            },
            { 
              title: '📊 Learn & Improve', 
              desc: 'AI learns from every customer interaction and gets smarter'
            },
          ].map((feature, i) => (
            <div key={i} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h4 className="text-xl font-semibold text-white mb-2">{feature.title}</h4>
              <p className="text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
