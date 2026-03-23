# ClawPack SaaS - Design Specification
## Social Media Scheduling Platform

---

## 1. Concept & Vision

**ClawPack** is a social media scheduling platform that feels like a premium tool, not enterprise bloatware. Clean, fast, intelligent.

**Personality:** Professional but approachable. Like having a smart assistant who handles the boring stuff so you can focus on creating.

**Core Promise:** Post smarter, not harder. AI-powered content creation with seamless multi-platform scheduling.

---

## 2. Design System

### Color Palette

```
Primary Background:    #0a0f1a (Deep Navy)
Secondary Background:  #111827 (Slate)
Card Background:      #1f2937 (Charcoal)
Border:               #374151 (Gray 700)

Primary Blue:         #1780e3 (CTA buttons, links)
Primary Hover:        #0d66c7 (Darker blue)
Success:             #10b981 (Green)
Warning:             #f59e0b (Amber)
Error:              #ef4444 (Red)

Text Primary:        #f9fafb (Off-white)
Text Secondary:      #9ca3af (Gray 400)
Text Muted:         #6b7280 (Gray 500)

Platform Colors:
- X/Twitter:         #1DA1F2
- LinkedIn:          #0A66C2
- Facebook:          #1877F2
- Instagram:         #E4405F
- TikTok:            #000000 (with gradient)
- YouTube:           #FF0000
- Pinterest:         #E60023
- Reddit:            #FF4500
- Discord:            #5865F2
- Telegram:           #0088cc
```

### Typography

```
Font Family:    Inter (primary), system-ui (fallback)
                SF Pro Display (Apple), Segoe UI (Windows)

Headings:
- H1: 32px / 700 weight / -0.02em tracking
- H2: 24px / 600 weight / -0.01em tracking
- H3: 20px / 600 weight

Body:           14px / 400 weight / 1.5 line-height
Small:          12px / 400 weight
Caption:        11px / 500 weight / uppercase / 0.05em tracking

Monospace:      JetBrains Mono (code, stats)
```

### Spacing System

```
Base unit: 4px

Spacing scale:
- xs:  4px
- sm:  8px
- md:  16px
- lg:  24px
- xl:  32px
- 2xl: 48px
- 3xl: 64px

Border radius:
- sm:  6px  (buttons, inputs)
- md:  8px  (cards)
- lg:  12px (modals, panels)
- full: 9999px (avatars, badges)
```

### Shadows

```
sm:  0 1px 2px rgba(0,0,0,0.3)
md:  0 4px 6px rgba(0,0,0,0.4)
lg:  0 10px 15px rgba(0,0,0,0.5)
xl:  0 20px 25px rgba(0,0,0,0.6)
```

---

## 3. Layout & Structure

### Global Layout

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (240px)  │         MAIN CONTENT               │
│                   │                                     │
│  Logo             │  Header (Breadcrumbs, Actions)      │
│  ─────────────    │  ───────────────────────────────    │
│  Navigation       │                                     │
│  • Dashboard      │  Page Content                       │
│  • Create        │                                     │
│  • Scheduler     │  (Scrollable)                       │
│  • Analytics     │                                     │
│  • AI Studio     │                                     │
│  ─────────────    │                                     │
│  Connected       │                                     │
│  Accounts        │                                     │
│  ─────────────    │                                     │
│  Help            │                                     │
│  Settings        │                                     │
│  ─────────────    │                                     │
│  User Avatar     │                                     │
└─────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

```
Mobile:  < 640px   (Single column, bottom nav)
Tablet:  640-1024px (Collapsible sidebar)
Desktop: > 1024px  (Full layout)
```

### Mobile Navigation

```
┌─────────────────────────┐
│  ☰   Logo        [+]   │  ← Sticky header
├─────────────────────────┤
│                         │
│     Content            │
│                         │
├─────────────────────────┤
│ 🏠  ✏️  📅  📊  👤   │  ← Bottom nav
└─────────────────────────┘
```

---

## 4. Component Library

### Buttons

```css
/* Primary CTA */
.btn-primary {
  background: #1780e3;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  transition: background 0.2s;
}
.btn-primary:hover { background: #0d66c7; }
.btn-primary:active { transform: scale(0.98); }

/* Secondary */
.btn-secondary {
  background: transparent;
  border: 1px solid #374151;
  color: #f9fafb;
  padding: 10px 20px;
  border-radius: 6px;
}
.btn-secondary:hover { border-color: #1780e3; color: #1780e3; }

/* Ghost */
.btn-ghost {
  background: transparent;
  color: #9ca3af;
  padding: 8px 16px;
}
.btn-ghost:hover { color: #f9fafb; background: rgba(255,255,255,0.05); }

/* Danger */
.btn-danger {
  background: #ef4444;
  color: white;
}

/* Loading state */
.btn-loading {
  opacity: 0.7;
  cursor: not-allowed;
  position: relative;
}
.btn-loading::after {
  content: '';
  position: absolute;
  width: 16px; height: 16px;
  top: 50%; left: 50%;
  margin: -8px 0 0 -8px;
  border: 2px solid transparent;
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

### Input Fields

```css
.input {
  background: #111827;
  border: 1px solid #374151;
  border-radius: 6px;
  padding: 10px 14px;
  color: #f9fafb;
  width: 100%;
  transition: border-color 0.2s;
}
.input:focus {
  outline: none;
  border-color: #1780e3;
  box-shadow: 0 0 0 3px rgba(23,128,227,0.2);
}
.input::placeholder { color: #6b7280; }
.input-error { border-color: #ef4444; }
```

### Cards

```css
.card {
  background: #1f2937;
  border-radius: 8px;
  border: 1px solid #374151;
  padding: 20px;
}
.card-hover {
  transition: transform 0.2s, box-shadow 0.2s;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px rgba(0,0,0,0.4);
}
```

### Platform Icons (SVG)

```
X/Twitter:    Bird silhouette
LinkedIn:    "in" badge
Facebook:     "f" letter
Instagram:    Camera outline
TikTok:       Music note
YouTube:     Play button
Pinterest:    P shape
Reddit:      Snoo alien
Discord:     Controller face
Telegram:    Paper plane
```

---

## 5. Page Designs

### 5.1 Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Good morning, Nick!              [+ Create Post]       │
│  Mar 24, 2026                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  142   │ │  89%    │ │  12.4K  │ │  $2.1K  │       │
│  │ Posts   │ │ Impr.   │ │ Reach   │ │ Rev.    │       │
│  │ This Mo │ │ Rate    │ │ This Mo │ │ Affil.  │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                         │
│  Recent Posts                      Upcoming (3)          │
│  ┌────────────────────────────┐  ┌───────────────────┐  │
│  │ 🐦 AI Tip post...          │  │ Tomorrow 9:00 AM  │  │
│  │ 2h ago • 23 likes         │  │ Instagram Story   │  │
│  │ [View] [Analytics]        │  │ [Edit]           │  │
│  ├────────────────────────────┤  ├───────────────────┤  │
│  │ 🟦 Product launch...        │  │ Wed 2:00 PM       │  │
│  │ Yesterday • 156 likes       │  │ LinkedIn Article  │  │
│  │ [View] [Analytics]        │  │ [Edit]           │  │
│  └────────────────────────────┘  └───────────────────┘  │
│                                                         │
│  Quick Actions                                          │
│  [✏️ Write Post] [📅 Schedule] [🤖 AI Generate] [📊]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Create Post

```
┌─────────────────────────────────────────────────────────┐
│  CREATE POST                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [AI] [Write] [Repurpose] [Templates]            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Tab Content Area:                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ What's on your mind?                             │   │
│  │                                                  │   │
│  │                                                  │   │
│  │                                                  │   │
│  │                              [@mention] [#tag]   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📷 Add Media    🎨 AI Image    📎 Attach        │   │
│  │ ┌─────┐ ┌─────┐ ┌─────┐                        │   │
│  │ │ +   │ │ img │ │ img │  (thumbnail preview)   │   │
│  │ └─────┘ └─────┘ └─────┘                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Platforms                    Schedule                  │
│  ☑ X @ClawPackNet           ○ Now  ● Schedule        │
│  ☑ LinkedIn Page               ┌──────────────────┐ │
│  ☐ Facebook                     │ Tue, Mar 25       │ │
│  ☐ Instagram                    │ 9:00 AM  ▼       │ │
│                                 └──────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Platform Previews                                 │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │ │ X Preview│ │ LI Preview│ │ IG Prev  │       │   │
│  │ │ 245 char │ │ 3000 max │ │ 2200    │       │   │
│  │ └──────────┘ └──────────┘ └──────────┘       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                           [Save Draft]  [Schedule]      │
│                              (or [Post Now])            │
└─────────────────────────────────────────────────────────┘
```

### 5.3 AI Assistant Panel

```
┌─────────────────────────────────────────────────────────┐
│  🤖 AI ASSISTANT                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Generate a post about...                        │   │
│  │                                                  │   │
│  │ [Product launch for our new AI tool_____]       │   │
│  │                                                  │   │
│  │ Tone: [Casual ▼]  Length: [Medium ▼]          │   │
│  │                                                  │   │
│  │                              [✨ Generate]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Generated Options:                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎯 Option 1                            [Use]   │   │
│  │ "Excited to announce our latest AI tool..."      │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎯 Option 2                            [Use]   │   │
│  │ "We've been working on something big..."        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎯 Option 3                            [Use]   │   │
│  │ "Big news! Our new product drops today..."      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ────────────────────────────────────────────────      │
│  Suggested Actions:                                     │
│  [Make shorter] [Add CTA] [More engaging] [Translate]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.4 Scheduler Calendar

```
┌─────────────────────────────────────────────────────────┐
│  SCHEDULER                            [< Mar 2026 >]   │
├─────────────────────────────────────────────────────────┤
│  Mon    Tue    Wed    Thu    Fri    Sat    Sun       │
│  24     25     26     27     28     29     30       │
│ ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐       │
│ │    ││ 📅 ││ 📅 ││    ││ 📅 ││    ││    │       │
│ │    ││ 2p ││ 9a ││    ││ 11a││    ││    │       │
│ └────┘└────┘└────┘└────┘└────┘└────┘└────┘       │
│                                                         │
│  March 25 - Tuesday                                    │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🐦 2:00 PM - X Post                             │ │
│  │ "AI Tip about prompts..."                        │ │
│  │ [Edit] [Delete] [Post Now]                      │ │
│  ├─────────────────────────────────────────────────┤ │
│  │ 🔵 9:00 AM - LinkedIn Article                   │ │
│  │ "How to use AI for marketing..."                  │ │
│  │ [Edit] [Delete] [Post Now]                      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
│  [+ Add Post]                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.5 Connected Accounts

```
┌─────────────────────────────────────────────────────────┐
│  CONNECTED ACCOUNTS                    [+ Add New]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  X/Twitter                                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🐦 @ClawPackNet                                  │ │
│  │                                                     │ │
│  │ Permissions: Post, Read                            │ │
│  │ Last posted: 2 hours ago                           │ │
│  │                                      [Manage] [x] │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
│  LinkedIn                                              │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🔵 Company Page: ClawPack                       │ │
│  │                                                     │ │
│  │ Permissions: Post, Read                            │ │
│  │ Last posted: Yesterday                             │ │
│  │                                      [Manage] [x] │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
│  Instagram (Not Connected)                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 📷 Click to connect your Instagram account        │ │
│  │                                                     │ │
│  │              [Connect Instagram →]                │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
│  Facebook (Not Connected)                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │ f Click to connect your Facebook Page             │ │
│  │                                                     │ │
│  │              [Connect Facebook →]                 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.6 Analytics

```
┌─────────────────────────────────────────────────────────┐
│  ANALYTICS                          [Last 30 days ▼]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Overview                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  12.4K  │ │  89%    │ │  3.2%   │ │  $2.1K  │   │
│  │ Reach   │ │ Impr.   │ │ Eng.Rate│ │ Rev.    │   │
│  │ ▲12%    │ │ ▲8%     │ │ ▼2%     │ │ ▲24%    │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                         │
│  Performance by Platform                               │
│  ┌─────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  │  X      ████████████████████░░░░  45%            │ │
│  │  LinkedIn████████████████░░░░░░░  30%           │ │
│  │  Instagram██████████░░░░░░░░░░░░░  15%           │ │
│  │  Facebook████████░░░░░░░░░░░░░░░░  10%           │ │
│  │                                                    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
│  Top Posts                                              │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 1. "AI Prompt tip..." 🐦 2.1K reach, 156 likes │ │
│  │ 2. "Product launch..." 🔵 1.8K reach, 89 likes  │ │
│  │ 3. "Tutorial post..." 📷 1.2K reach, 67 likes    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
│  Best Time to Post                                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 📊 Heatmap of engagement by hour/day             │ │
│  │ (Calendar heat map visualization)                   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 6. User Flow - Connect OAuth

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: User clicks "Connect X"                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  CONNECT X/TWITTER                               │   │
│  │                                                  │   │
│  │  We'll redirect you to Twitter to authorize      │   │
│  │  ClawPack to post on your behalf.                │   │
│  │                                                  │   │
│  │  [Cancel]              [Authorize →]            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ↓ (Redirects to Twitter OAuth)                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Twitter Authorization                            │   │
│  │                                                  │   │
│  │  ClawPack wants to:                              │   │
│  │  ✓ Post Tweets                                    │   │
│  │  ✓ Read your timeline                            │   │
│  │  ✓ See your followers                            │   │
│  │                                                  │   │
│  │  [Cancel]              [Authorize App]          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ↓ (Returns with OAuth token)                          │
│                                                         │
│  ✓ Connected successfully!                             │
│  @ClawPackNet is now linked.                          │
│                                                         │
│  [Done]                                                │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Modals & Overlays

### Confirmation Modal

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     ⚠️  Are you sure?                                  │
│                                                         │
│     This will permanently delete your scheduled post.  │
│     This action cannot be undone.                      │
│                                                         │
│                            [Cancel]  [Delete Post]     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Upgrade Modal (Free → Pro)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     ⭐ Unlock Pro Features                             │
│                                                         │
│     You're on the Free plan. Upgrade to access:        │
│                                                         │
│     ✓ Unlimited posts                                   │
│     ✓ AI Content Generation                             │
│     ✓ Advanced Analytics                                │
│     ✓ 5 Connected Accounts                             │
│     ✓ Priority Support                                 │
│                                                         │
│         [Free]    [Pro - $29/mo]    [Enterprise]      │
│                                                         │
│     💳 7-day free trial included                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Animations & Interactions

```css
/* Page transitions */
.page-enter {
  opacity: 0;
  transform: translateY(10px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.3s ease-out;
}

/* Button hover */
.btn-hover-lift {
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-hover-lift:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(23,128,227,0.3);
}

/* Card hover */
.card-hover-lift {
  transition: transform 0.2s, box-shadow 0.2s;
}
.card-hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px rgba(0,0,0,0.4);
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(
    90deg,
    #1f2937 25%,
    #374151 50%,
    #1f2937 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Spinner */
.spinner {
  width: 20px; height: 20px;
  border: 2px solid #374151;
  border-top-color: #1780e3;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 9. Empty States

### No Posts Yet

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    ✨                                   │
│                                                         │
│            No posts scheduled yet                        │
│                                                         │
│         Create your first post to get started!        │
│                                                         │
│              [+ Create Your First Post]                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### No Connected Accounts

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                   🔗                                    │
│                                                         │
│         Connect your social accounts                    │
│                                                         │
│    Link your accounts to start scheduling posts        │
│    across all major platforms.                          │
│                                                         │
│         [Connect X/Twitter]                           │
│         [Connect LinkedIn]                            │
│         [Connect Instagram]                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Notifications & Toasts

```css
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 14px 20px;
  border-radius: 8px;
  background: #1f2937;
  border: 1px solid #374151;
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
}

.toast-success { border-left: 4px solid #10b981; }
.toast-error { border-left: 4px solid #ef4444; }
.toast-warning { border-left: 4px solid #f59e0b; }
.toast-info { border-left: 4px solid #1780e3; }
```

---

## 11. Responsive Behaviors

### Mobile Create Post

```
┌─────────────────────────────────┐
│  ✕  Create Post                 │
├─────────────────────────────────┤
│                                 │
│  [AI] [Write] [Repurpose]       │
│                                 │
│  ┌───────────────────────────┐ │
│  │ What's on your mind?      │ │
│  │                           │ │
│  │                           │ │
│  └───────────────────────────┘ │
│                                 │
│  📷 📎 🎨                     │
│                                 │
│  Platforms:                    │
│  ☑ X  ☐ LinkedIn              │
│  ☐ FB  ☐ IG                   │
│                                 │
│  ○ Now  ● Schedule             │
│                                 │
│  [Save Draft]                  │
│  [Schedule]                    │
└─────────────────────────────────┘
```

---

## 12. Accessibility

```css
/* Focus visible */
*:focus-visible {
  outline: 2px solid #1780e3;
  outline-offset: 2px;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: #1780e3;
  color: white;
  z-index: 10000;
}
.skip-link:focus { top: 0; }

/* ARIA labels */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  border: 0;
}
```

---

*Last updated: 2026-03-24*
