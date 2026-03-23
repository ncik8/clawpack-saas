#!/bin/bash
# Social Media Auto-Poster Cron Script
# Posts to X and LinkedIn using Playwright browser automation

WS_URL="ws://127.0.0.1:9224/devtools/browser/096794fe-edc9-4568-92a7-fa3b33f88f83"
TOPICS_DIR="/Users/nick/Projects/clawpack-saas/scripts/social-poster"

cd "$TOPICS_DIR"

# Run the poster
python3 post.py >> /tmp/social-post.log 2>&1

echo "$(date): Posted" >> /tmp/social-post.log
