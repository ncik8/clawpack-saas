#!/usr/bin/env python3
"""Create X/Twitter Developer Account and App using Playwright"""
import sys
sys.path.insert(0, '/Volumes/My Shared Files/UTM')

from playwright.sync_api import sync_playwright
import time

def setup_twitter_dev_account(email, password, phone):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = context.new_page()
        
        print("1. Opening Twitter Developer Portal...")
        page.goto("https://developer.twitter.com/en/portal/dashboard")
        page.wait_for_load_state("networkidle")
        time.sleep(3)
        
        # Check if we need to log in first
        if "login" in page.url.lower():
            print("Logging into Twitter...")
            page.fill('input[name="text"]', email)
            page.click('button:has-text("Next")')
            time.sleep(2)
            page.fill('input[name="password"]', password)
            page.click('button:has-text("Log in")')
            time.sleep(3)
        
        print("Current URL:", page.url)
        print("Page title:", page.title())
        
        # Look for "Create Project" or "Sign up for Free Account"
        try:
            # Try to find create project button
            create_btn = page.locator('text=Create Project')
            if create_btn.count() > 0:
                print("\nFound 'Create Project' button!")
                page.screenshot(path="/tmp/twitter-dev-1.png")
                return "Create Project button found"
        except:
            pass
        
        try:
            signup_btn = page.locator('text=Sign up for free')
            if signup_btn.count() > 0:
                print("\nFound 'Sign up for free' button!")
                page.screenshot(path="/tmp/twitter-dev-1.png")
                return "Sign up button found"
        except:
            pass
        
        # Take screenshot to see what we see
        page.screenshot(path="/tmp/twitter-dev-1.png")
        print("\nScreenshot saved to /tmp/twitter-dev-1.png")
        print("Current URL:", page.url)
        
        browser.close()
        return "Done"

if __name__ == "__main__":
    print("Twitter Developer Account Setup")
    print("=" * 40)
    print("Need: email, password, phone number")
    print("=" * 40)
