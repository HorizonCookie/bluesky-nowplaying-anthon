import { BskyAgent } from '@atproto/api';
import fs from 'fs';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USER = process.env.LASTFM_USER;
const BSKY_HANDLE = process.env.BSKY_HANDLE;
const BSKY_PASSWORD = process.env.BSKY_PASSWORD;

const LAST_TRACK_FILE = 'lasttrack.txt';

async function getCurrentTrack() {
  const url =
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;

  const response = await fetch(url);
  const data = await response.json();

  const track = data.recenttracks.track[0];

  if (track['@attr'] && track['@attr'].nowplaying === 'true') {
    return {
      artist: track.artist['#text'],
      song: track.name
    };
  }

  return null;
}

function getLastPostedTrack() {
  if (fs.existsSync(LAST_TRACK_FILE)) {
    return fs.readFileSync(LAST_TRACK_FILE, 'utf8');
  }

  return '';
}

function saveLastPostedTrack(track) {
  fs.writeFileSync(LAST_TRACK_FILE, track);
}

async function postToBluesky(text) {
  const agent = new BskyAgent({
    service: 'https://bsky.social'
  });

  await agent.login({
    identifier: BSKY_HANDLE,
    password: BSKY_PASSWORD
  });

  await agent.post({
    text: text
  });
}

(async () => {
  try {
    const current = await getCurrentTrack();

    if (!current) {
      console.log('No song playing.');
      return;
    }

    const trackString = `${current.artist} - ${current.song}`;

    const lastTrack = getLastPostedTrack();

    if (trackString === lastTrack) {
      console.log('Duplicate track. Skipping.');
      return;
    }

    const postText =
`▶️ ${current.artist} - ${current.song}

#nowplaying`;

    await postToBluesky(postText);

    saveLastPostedTrack(trackString);

    console.log('Posted to Bluesky!');
  } catch (err) {
    console.error(err);
  }
})();
