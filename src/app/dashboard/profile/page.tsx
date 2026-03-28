'use client';

import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Hong_Kong');
  const [timezones] = useState([
    'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
    'America/Chicago', 'America/New_York', 'America/Sao_Paulo', 'Atlantic/Reykjavik',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Kolkata',
    'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'
  ]);

  useEffect(() => {
    // Auto-detect timezone
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(detected);
  }, []);

  const user = {
    name: 'Nick Williams',
    email: 'charliemo123@gmail.com',
    plan: 'Free',
    memberSince: 'March 2026',
    postsUsed: 3,
    postsLimit: 5,
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'subscription', name: 'Subscription', icon: '💳' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'api', name: 'API Keys', icon: '🔑' },
  ];

  const plans = [
    { 
      name: 'Free', 
      price: 0, 
      posts: '5 posts/month',
      features: ['All platforms', 'Basic analytics', 'Email support'],
      color: '#6b7280'
    },
    { 
      name: 'Starter', 
      price: 5, 
      posts: '100 X posts/month',
      features: ['Everything in Free', '100 X posts/month', 'Priority support'],
      color: '#1780e3',
      highlight: true
    },
    { 
      name: 'Pro', 
      price: 15, 
      posts: '500 X posts/month',
      features: ['Everything in Starter', '500 X posts/month', 'API access'],
      color: '#22c55e'
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-[#9ca3af] text-sm">Manage your account, subscription, and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#1780e3]/10 text-[#1780e3]'
                    : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
            <hr className="border-[#374151] my-4" />
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
            >
              <span>🗑️</span>
              Delete Account
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Info */}
              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
                
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1780e3] to-[#76afe5] flex items-center justify-center text-white font-bold text-xl">
                    N
                  </div>
                  <button className="btn btn-secondary text-sm">
                    Change Avatar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-2">Full Name</label>
                    <input
                      type="text"
                      defaultValue={user.name}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-2">Email</label>
                    <input
                      type="email"
                      defaultValue={user.email}
                      className="input"
                      disabled
                    />
                    <p className="text-xs text-[#6b7280] mt-1">Email cannot be changed</p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-[#9ca3af] mb-2">Bio</label>
                  <textarea
                    placeholder="Tell us about yourself..."
                    className="input h-24 resize-none"
                  />
                </div>

                <button className="btn btn-primary mt-4">
                  Save Changes
                </button>
              </div>

              {/* Current Plan */}
              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Current Plan</h2>
                <div className="flex items-center justify-between p-4 bg-[#111827] rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{user.plan}</span>
                      <span className="text-xs bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-0.5 rounded">Active</span>
                    </div>
                    <p className="text-[#9ca3af] text-sm mt-1">
                      {user.postsUsed}/{user.postsLimit} posts this month
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="btn btn-primary"
                  >
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Subscription</h2>
                
                {/* Current */}
                <div className="p-4 bg-[#111827] rounded-lg mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-semibold">Starter Plan</p>
                      <p className="text-[#9ca3af] text-sm">$5/month</p>
                    </div>
                    <span className="text-xs bg-[#22c55e]/20 text-[#22c55e] px-2 py-0.5 rounded">Active</span>
                  </div>
                  <p className="text-[#6b7280] text-xs">Next billing: April 27, 2026</p>
                </div>

                <div className="bg-[#1780e3]/10 border border-[#1780e3]/30 rounded-lg p-4 mb-4">
                  <p className="text-[#1780e3] text-sm">
                    <strong>💳 Powered by Stripe</strong><br />
                    Manage your subscription, payment method, and billing history securely through Stripe.
                  </p>
                </div>

                <a 
                  href="#" 
                  className="btn btn-primary inline-block"
                  onClick={(e) => {
                    e.preventDefault();
                    // In production, this would link to Stripe Customer Portal
                    alert('Stripe Customer Portal link would go here');
                  }}
                >
                  Manage via Stripe
                </a>
              </div>

              {/* Billing History */}
              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Billing History</h2>
                <div className="text-center py-8 text-[#6b7280]">
                  <p>No invoices yet</p>
                  <p className="text-sm">View your invoices in the Stripe Customer Portal after your first billing</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
                
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-2">Current Password</label>
                    <input type="password" className="input" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-2">New Password</label>
                    <input type="password" className="input" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9ca3af] mb-2">Confirm New Password</label>
                    <input type="password" className="input" />
                  </div>
                  <button className="btn btn-primary">
                    Update Password
                  </button>
                </div>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h2>
                <p className="text-[#9ca3af] text-sm mb-4">
                  Add an extra layer of security to your account
                </p>
                <button className="btn btn-secondary">
                  Enable 2FA
                </button>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Active Sessions</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#111827] rounded-lg">
                    <div>
                      <p className="text-white text-sm">MacBook Pro - Chrome</p>
                      <p className="text-[#6b7280] text-xs">Hong Kong • Current session</p>
                    </div>
                    <span className="text-xs text-[#22c55e]">Active</span>
                  </div>
                </div>
              </div>

              <button className="btn btn-secondary text-[#ef4444]">
                Sign Out All Other Devices
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Notification Preferences</h2>
                
                <div className="space-y-4">
                  {[
                    { label: 'Email notifications', desc: 'Receive email updates about your account', enabled: true },
                    { label: 'Marketing emails', desc: 'Tips, news, and product updates', enabled: false },
                    { label: 'Post reminders', desc: 'Remind me to create content', enabled: true },
                    { label: 'Weekly digest', desc: 'Summary of your social media performance', enabled: false },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-[#374151] last:border-0">
                      <div>
                        <p className="text-white">{item.label}</p>
                        <p className="text-[#6b7280] text-sm">{item.desc}</p>
                      </div>
                      <button className={`w-12 h-6 rounded-full transition-colors ${item.enabled ? 'bg-[#22c55e]' : 'bg-[#374151]'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${item.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Timezone</h2>
                <p className="text-[#9ca3af] text-sm mb-4">
                  Your timezone is used to display scheduling times and send notifications at the right time.
                </p>
                
                <div className="flex items-center gap-4">
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="input flex-1"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-primary">
                    Save
                  </button>
                </div>

                <div className="mt-4 p-3 bg-[#111827] rounded-lg">
                  <p className="text-white text-sm">Current local time:</p>
                  <p className="text-[#1780e3] font-semibold">
                    {new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })} {' '}
                    <span className="text-[#9ca3af] text-sm">
                      ({new Date().toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' })})
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Your API Keys</h2>
                <p className="text-[#9ca3af] text-sm mb-4">
                  Use API keys to integrate ClawPack with other services
                </p>
                
                <div className="bg-[#111827] rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-mono text-sm">••••••••••••••••••••••••</p>
                    <button className="text-xs text-[#1780e3] hover:underline">Copy</button>
                  </div>
                  <p className="text-[#6b7280] text-xs">Created: March 27, 2026</p>
                </div>

                <button className="btn btn-secondary">
                  Generate New API Key
                </button>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold text-white mb-4">Integrated AI Services</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#111827] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1780e3]/20 rounded-lg flex items-center justify-center text-sm">🧠</div>
                      <div>
                        <p className="text-white text-sm">MiniMax AI</p>
                        <p className="text-[#6b7280] text-xs">AI content generation</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#22c55e]">Connected</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#111827] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#22c55e]/20 rounded-lg flex items-center justify-center text-sm">🖼️</div>
                      <div>
                        <p className="text-white text-sm">Stability AI</p>
                        <p className="text-[#6b7280] text-xs">Bring your own API key</p>
                      </div>
                    </div>
                    <button className="text-xs text-[#1780e3] hover:underline">Configure</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="mt-6 pt-6 border-t border-[#374151]">
            <button 
              onClick={async () => {
                localStorage.removeItem('postiz_jwt');
                localStorage.removeItem('postiz_cookie');
                const { supabase } = await import('@/lib/supabase');
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="btn btn-secondary text-[#ef4444]"
            >
              🚪 Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1f2937] rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
              <button onClick={() => setShowUpgradeModal(false)} className="text-[#9ca3af] hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div 
                  key={plan.name}
                  className={`rounded-xl p-6 border-2 ${
                    plan.highlight ? 'border-[#1780e3] bg-[#1780e3]/5' : 'border-[#374151] bg-[#111827]'
                  }`}
                >
                  {plan.highlight && (
                    <span className="text-xs bg-[#1780e3] text-white px-2 py-0.5 rounded-full">Most Popular</span>
                  )}
                  <h3 className="text-xl font-semibold text-white mt-2">{plan.name}</h3>
                  <div className="my-4">
                    <span className="text-3xl font-bold text-white">${plan.price}</span>
                    <span className="text-[#9ca3af]">/month</span>
                  </div>
                  <p className="text-[#9ca3af] text-sm mb-4">{plan.posts}</p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-white">
                        <span className="text-[#22c55e]">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button 
                    className={`w-full py-2 rounded-lg font-medium ${
                      plan.highlight 
                        ? 'bg-[#1780e3] text-white hover:bg-[#166bc7]' 
                        : 'bg-[#374151] text-white hover:bg-[#4b5563]'
                    }`}
                  >
                    {plan.price === 0 ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
