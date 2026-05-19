const { BskyAgent } = require('@atproto/api');

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USER = process.env.LASTFM_USER;
const BSKY_HANDLE = process.env.BSKY_HANDLE;
const BSKY_PASSWORD = process.env.BSKY_PASSWORD;

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

    const postText = `Now playing: ${current.song} — ${current.artist}`;

    await postToBluesky(postText);

    console.log('Posted to Bluesky!');
  } catch (err) {
    console.error(err);
  }
})();
