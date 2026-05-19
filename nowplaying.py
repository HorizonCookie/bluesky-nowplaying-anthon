import os
import requests
from atproto import Client

BLUESKY_HANDLE = os.environ.get("BLUESKY_HANDLE")
BLUESKY_PASSWORD = os.environ.get("BLUESKY_PASSWORD")
LASTFM_USERNAME = os.environ.get("LASTFM_USERNAME")

def get_lastfm_now_playing():
    url = "https://audioscrobbler.com"
    params = {
        "method": "user.getrecenttracks",
        "user": LASTFM_USERNAME,
        "api_key": "53c5f8a23302220c8122fd43313d57b1",
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        print("DEBUG: Connected to Last.fm successfully.")
        
        if 'recenttracks' not in data or 'track' not in data['recenttracks']:
            print("DEBUG: Could not find tracks in Last.fm data. Check your username secret.")
            return None
            
        tracks = data['recenttracks']['track']
        
        # Safely grab the first track item whether Last.fm sends a list or a single item
        if isinstance(tracks, list):
            if len(tracks) == 0:
                print("DEBUG: Tracks list is empty.")
                return None
            track = tracks[0]
        else:
            track = tracks
            
        # Check if this specific track is playing right now
        if '@attr' in track and track['@attr'].get('nowplaying') == 'true':
            title = track['name']
            artist = track['artist']['#text']
            return f"▶ Listening to {artist} - {title}\n#nowplaying"
        else:
            print("DEBUG: Last.fm shows you are NOT listening to any music right now.")
            
    except Exception as e:
        print(f"DEBUG Error analyzing Last.fm response: {e}")
    return None

def get_last_bluesky_post(client):
    try:
        profile_feed = client.get_author_feed(actor=BLUESKY_HANDLE, limit=5)
        for feed_view in profile_feed.feed:
            post = feed_view.post
            if "#nowplaying" in post.record.text:
                return post.record.text
    except Exception as e:
        print(f"DEBUG Error fetching Bluesky history: {e}")
    return None

def main():
    current_track_text = get_lastfm_now_playing()
    if not current_track_text:
        print("Bot is stopping because no active track was found.")
        return

    print(f"DEBUG: Active track found! Prepared text:\n{current_track_text}")
    client = Client()
    client.login(BLUESKY_HANDLE, BLUESKY_PASSWORD)
    print("DEBUG: Logged into Bluesky successfully.")

    last_posted_text = get_last_bluesky_post(client)
    if current_track_text == last_posted_text:
        print(f"Skipping post. This exact track was already posted last time.")
        return

    try:
        client.send_post(text=current_track_text)
        print(f"SUCCESS: Posted to Bluesky!")
    except Exception as e:
        print(f"DEBUG Error posting to Bluesky: {e}")

if __name__ == "__main__":
    main()
