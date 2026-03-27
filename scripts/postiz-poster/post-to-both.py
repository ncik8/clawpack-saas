#!/usr/bin/env python3
"""
Post to both Nick's and Charlie's Postiz accounts
Channels: X, Bluesky, LinkedIn
"""
import urllib.request
import urllib.error
import json
import sys

# Nick's Postiz (X, Bluesky, LinkedIn)
NICK_API = "205db6f05aec4fffed618a4ac75635cb013ba15ca6b06cba049217de38bc317e"
NICK_CHANNELS = {
    "x": "cmn7eaevv0001rt8fu8b7ehtp",
    "bluesky": "cmn7rp8m50003oz745ihp1tls",
    "linkedin": "cmn7omtqt0001oz7418dgh40v"
}

# Charlie's Postiz (X, Bluesky, LinkedIn)  
CHARLIE_API = "447bf915c4536ec7ed201cd513168e63af9246c5fb61582afc0be444d0725ea8"
CHARLIE_CHANNELS = {
    "x": "cmn7tsejb0007oz74aw1e707v",
    "bluesky": "cmn7us1hl000boz74h6mjvdwc",
    "linkedin": "cmn7tsq7e0009oz74vmg3sv3a"
}

POSTIZ_URL = "https://post.clawpack.net"

def create_post(api_key, channel_ids, content):
    """Create a post to multiple channels via Postiz API"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Build posts array for each channel
    posts = []
    for platform, channel_id in channel_ids.items():
        posts.append({
            "integration": {"id": channel_id},
            "value": [{"content": content}],
            "settings": {"__type": platform}
        })
    
    payload = {
        "type": "now",
        "shortLink": False,
        "tags": [],
        "posts": posts
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f"{POSTIZ_URL}/api/v1/posts",
        data=data,
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 500, str(e)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: post-to-both.py <content>")
        sys.exit(1)
    
    content = sys.argv[1]
    
    print(f"Posting to Nick's channels...")
    status, resp = create_post(NICK_API, NICK_CHANNELS, content)
    print(f"Status: {status}, Response: {resp}")
    
    print(f"Posting to Charlie's channels...")
    status, resp = create_post(CHARLIE_API, CHARLIE_CHANNELS, content)
    print(f"Status: {status}, Response: {resp}")
