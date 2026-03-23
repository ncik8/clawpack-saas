#!/usr/bin/env python3
"""Post to X.com using Playwright browser automation"""
import sys
sys.path.insert(0, '/Volumes/My Shared Files/UTM')

from playwright.sync_api import sync_playwright
import time

def post_to_x(username, password, message):
    with sync_playwright() as p:
        # Launch browser (visible so you can see it work)
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = context.new_page()
        
        print("Opening X.com...")
        page.goto("https://x.com/login")
        page.wait_for_load_state("networkidle")
        time.sleep(3)
        
        print("Logging in...")
        # Enter username
        page.fill('input[name="text"]', username)
        page.click('button:has-text("Next")')
        time.sleep(2)
        
        # Enter password
        page.fill('input[name="password"]', password)
        page.click('button:has-text("Log in")')
        time.sleep(3)
        
        print("Composing tweet...")
        page.goto("https://x.com/home")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        
        # Click compose button
        page.click('a[href="/compose/post"]', timeout=5000)
        time.sleep(2)
        
        # Type message
        page.fill('.public-DraftEditor-content', message)
        time.sleep(1)
        
        # Click post button
        page.click('button[data-testid="tweetButton"]:not([disabled])')
        time.sleep(3)
        
        print("Tweet posted!")
        
        # Take screenshot
        page.screenshot(path="/tmp/x-post-success.png")
        print("Screenshot saved to /tmp/x-post-success.png")
        
        browser.close()
        return True

if __name__ == "__main__":
    # Test with a simple message
    test_message = "🤖 Testing ClawPack AI Social Poster 🧪"
    print(f"Will post: {test_message}")
    print("To use: Call post_to_x(email, password, message)")
