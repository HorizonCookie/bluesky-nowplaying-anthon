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

  console.log('Checking Last.fm...');

  const response = await fetch(url);
  const data = await response.json();

  if (!data.recenttracks || !data.recenttracks.track) {
    console.log('Last.fm API error.');
    return null;
  }

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

async function postToBluesky(postData) {
  console.log('Logging into Bluesky...');

  const agent = new BskyAgent({
    service: 'https://bsky.social'
  });

  await agent.login({
    identifier: BSKY_HANDLE,
    password: BSKY_PASSWORD
  });

  console.log('Posting to Bluesky...');

  await agent.post(postData);
}

(async () => {
  try {
    const current = await getCurrentTrack();

    if (!current) {
      console.log('No song playing or API issue.');
      return;
    }

    const trackString = `${current.artist} - ${current.song}`;

    const lastTrack = getLastPostedTrack();

    if (trackString === lastTrack) {
      console.log('Duplicate track. Skipping.');
      return;
    }

    const postText =
`► ${current.artist} - ${current.song}

#nowplaying`;

    const encoder = new TextEncoder();

    const beforeTag =
`► ${current.artist} - ${current.song}

`;

    const byteStart = encoder.encode(beforeTag).length;
    const byteEnd = byteStart + encoder.encode('#nowplaying').length;

    await postToBluesky({
      text: postText,
      facets: [
        {
          index: {
            byteStart,
            byteEnd
          },
          features: [
            {
              $type: 'app.bsky.richtext.facet#tag',
              tag: 'nowplaying'
            }
          ]
        }
      ]
    });

    saveLastPostedTrack(trackString);

    console.log('Posted to Bluesky!');
  } catch (err) {
    console.error('ERROR:', err);
  }
})();
