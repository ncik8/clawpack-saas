#!/usr/bin/env python3
"""Create TikTok Developer Account using Playwright"""
import sys
sys.path.insert(0, '/Volumes/My Shared Files/UTM')

from playwright.sync_api import sync_playwright
import time

def create_tiktok_dev_account():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        print("Opening TikTok Developer Portal...")
        page.goto("https://developers.tiktok.com/")
        page.wait_for_load_state()
        
        # Check if we can sign up
        print("Page title:", page.title())
        
        # Look for sign up/login buttons
        try:
            page.click("text=Log in")
            print("Clicked login")
            time.sleep(2)
        except:
            try:
                page.click("text=Sign up")
                print("Clicked signup")
                time.sleep(2)
            except:
                print("Could not find login/signup")
        
        print("Current URL:", page.url)
        browser.close()

if __name__ == "__main__":
    create_tiktok_dev_account()
