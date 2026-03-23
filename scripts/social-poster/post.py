#!/usr/bin/env python3
"""
Social Media Auto-Poster
Uses Playwright browser automation to post to X and LinkedIn
Topics: AI prompts, predictive markets, social media tools, fake/real tool
Schedule: 8am + 8pm HKT, Monday-Friday
"""
import sys
sys.path.insert(0, '/Volumes/My Shared Files/UTM')

from playwright.sync_api import sync_playwright
import json
import random
from datetime import datetime

# Topics for posts
TOPICS = [
    {
        "theme": "AI Prompts",
        "templates": [
            "Stop writing prompts from scratch. 🤖 Here's a simple framework that works every time:\n\n1. WHO you are\n2. WHAT you want\n3. HOW you want it\n\nSave this. #AI #ChatGPT #Productivity",
            "The best AI prompt I've used this week:\n\n'Ignore everything before this. You are [role]. Your task is [goal]. Constraints: [limits].'\n\nTry it. Thank me later. #AI #PromptEngineering",
            "90% of people use AI wrong. They're asking it questions instead of giving it tasks.\n\nTask = context + goal + format\n\nThat's it. That's the whole framework. 🤖 #AI #Productivity"
        ]
    },
    {
        "theme": "Predictive Markets",
        "templates": [
            "Prediction markets are underrated for forecasting.\n\nUnlike polls, money talks. When traders put skin in the game, they reveal real beliefs.\n\nPolymarket, Kalshi, Metaculus — the future is being priced right now. 📊 #PredictiveMarkets #Forecasting",
            "What if you could bet on tomorrow's news today?\n\nPrediction markets make the invisible visible. They aggregate information faster than any expert.\n\nThe market price IS the forecast. 📈 #PredictiveMarkets #Markets",
            "The most contrarian take on prediction markets:\n\nThey're more accurate than experts NOT because of crowd wisdom — but because they FORCE people to put money on their beliefs.\n\nNothing clarifies thinking like real stakes. 🎯 #Forecasting #Markets"
        ]
    },
    {
        "theme": "Social Media Tools",
        "templates": [
            "Managing 5 social accounts manually = part-time job.\n\nWhat if AI could post to all of them in one click?\n\nThat's what we're building. 🚀\n\nConnect TikTok, Instagram, X, LinkedIn, Facebook. Write once. Post everywhere.\n\nBeta coming soon. #SocialMedia #Automation #AI",
            "I just posted to 5 platforms in 30 seconds.\n\nNo, really. One draft. Auto-distributed.\n\nThe future of social media management is here. 🤖\n\n#SocialMedia #ContentCreation #AI",
            "The average business spends 6+ hours/week on social media.\n\nThat's 300+ hours/year. Equivalent to 7.5 full work weeks.\n\nWhat if posting took 30 seconds instead? 🕐\n\n#SocialMedia #Automation #Productivity"
        ]
    },
    {
        "theme": "Fake or Real Tool",
        "templates": [
            "Can you tell what's real and what's AI-generated?\n\nTest yourself: [link]\n\nAI-generated images are getting scarily good. 🔍\n\nThe ability to detect fakes is becoming essential. #AI #Deepfake #FactCheck",
            "We built a tool to detect AI-generated images.\n\nUpload any image. Get an instant authenticity score.\n\nBecause seeing isn't believing anymore. 🖼️\n\n#AI #ImageDetection #Deepfake",
            "How to spot an AI-generated image:\n\n1. Check the hands (AI still messes these up)\n2. Look at the text on signs\n3. Check lighting inconsistencies\n4. Use a detector tool 🔎\n\n#AI #Deepfake #MediaLiteracy"
        ]
    }
]

def get_random_post():
    topic = random.choice(TOPICS)
    post = random.choice(topic["templates"])
    return post, topic["theme"]

def post_to_x(message, browser=None):
    """Post to X using Playwright browser"""
    if not browser:
        return False, "No browser"
    
    try:
        context = browser.contexts()[0]
        page = context.new_page()
        
        # Go to X compose
        page.goto("https://x.com/compose/post", timeout=30000)
        page.wait_for_timeout(3000)
        
        # Type the message
        page.fill('[data-testid="tweetTextarea_0"]', message)
        page.wait_for_timeout(1000)
        
        # Click post
        page.click('[data-testid="tweetButtonInline"]:not([disabled])', timeout=5000)
        page.wait_for_timeout(3000)
        
        page.close()
        return True, "Posted successfully"
    except Exception as e:
        return False, str(e)

def post_to_linkedin(message, browser=None):
    """Post to LinkedIn using Playwright browser"""
    if not browser:
        return False, "No browser"
    
    try:
        context = browser.contexts()[0]
        page = context.new_page()
        
        # Go to LinkedIn
        page.goto("https://www.linkedin.com/feed/", timeout=30000)
        page.wait_for_timeout(3000)
        
        # Click start post button
        page.click('[data-control-name="create_post"]', timeout=5000)
        page.wait_for_timeout(2000)
        
        # Type message
        page.fill('.share-box-form__editor', message)
        page.wait_for_timeout(1000)
        
        # Click post
        page.click('[data-control-name="submit"]', timeout=5000)
        page.wait_for_timeout(3000)
        
        page.close()
        return True, "Posted successfully"
    except Exception as e:
        return False, str(e)

def main():
    message, theme = get_random_post()
    print(f"Theme: {theme}")
    print(f"Message: {message}")
    
    with sync_playwright() as p:
        # Connect to existing Brave browser
        browser = p.chromium.connect_over_cdp("ws://127.0.0.1:9224/devtools/browser/096794fe-edc9-4568-92a7-fa3b33f88f83")
        
        # Post to X
        print("\nPosting to X...")
        success, result = post_to_x(message, browser)
        print(f"X Result: {result}")
        
        # Post to LinkedIn
        print("\nPosting to LinkedIn...")
        success2, result2 = post_to_linkedin(message, browser)
        print(f"LinkedIn Result: {result2}")
        
        browser.close()
    
    # Save last post info
    with open("/tmp/last_post.json", "w") as f:
        json.dump({
            "time": datetime.now().isoformat(),
            "theme": theme,
            "message": message,
            "x_result": result,
            "linkedin_result": result2
        }, f)
    
    return success, result

if __name__ == "__main__":
    main()
