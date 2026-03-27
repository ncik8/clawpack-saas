#!/usr/bin/env python3
"""
Generate social media post ideas for ClawPack
Posts to: X, LinkedIn, Bluesky
"""
import random

# Morning post (8am) - AI tips/prompts focus
morning_posts = [
    "💡 AI Prompt Tip: Instead of vague prompts, try 'Act as a [role] and [task] for [audience]' - much better results! #AI #Prompts",
    "🚀 Stop wasting time on manual posting! Schedule all your social media from one place. #Productivity #SocialMedia",
    "📝 Best AI prompts for content creators: 1) Start with 'Explain like I'm 5...' 2) 'Give me 10 variations of...' 3) 'What would happen if...' #ContentCreation",
    "🤖 Why I use AI assistants: 1) 24/7 availability 2) Instant research 3) No creative blocks 4) Scales my output 10x #AI #Productivity",
    "⚡ The future of social media management is HERE. Connect all platforms, schedule posts, let AI help you create. #SocialMedia #Automation",
]

# Evening post (6pm) - Engagement/questions
evening_posts = [
    "👋 What's your biggest challenge with social media marketing? Drop a comment below! 👇 #SocialMedia #Marketing",
    "❓ Poll: How many social platforms do you manage? A) 1-2 B) 3-5 C) 6+ #SocialMedia",
    "🔍 What features matter most to you in a social media scheduler? AI integration? Bulk scheduling? Analytics? #Productivity",
    "💬 What's one thing you wish your AI assistant could do that it can't now? #AI #Innovation",
    "🎯 Quick question: What's your biggest time-waster when creating content? #ContentCreation #Productivity",
]

def get_morning_post():
    return random.choice(morning_posts)

def get_evening_post():
    return random.choice(evening_posts)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == "morning":
            print(get_morning_post())
        elif sys.argv[1] == "evening":
            print(get_evening_post())
    else:
        print("Usage: daily-posts.py [morning|evening]")
