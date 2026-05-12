import fs from "node:fs";
import jwt from "jsonwebtoken";

const APPLE_API_BASE = "https://api.music.apple.com/v1";

export type AppleMusicSong = {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    artwork?: {
      url?: string;
      width?: number;
      height?: number;
    };
    durationInMillis?: number;
  };
};

function readPrivateKey() {
  const inlineKey = process.env.APPLE_MUSIC_PRIVATE_KEY;
  if (inlineKey) {
    return inlineKey.replace(/\\n/g, "\n");
  }

  const keyPath = process.env.APPLE_MUSIC_PRIVATE_KEY_PATH;
  if (keyPath) {
    return fs.readFileSync(keyPath, "utf8");
  }

  throw new Error(
    "Missing APPLE_MUSIC_PRIVATE_KEY or APPLE_MUSIC_PRIVATE_KEY_PATH."
  );
}

export function getAppleMusicStorefront() {
  return process.env.APPLE_MUSIC_STOREFRONT || "kr";
}

export function createAppleDeveloperToken() {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;

  if (!teamId || !keyId) {
    throw new Error("Missing APPLE_MUSIC_TEAM_ID or APPLE_MUSIC_KEY_ID.");
  }

  return jwt.sign({}, readPrivateKey(), {
    algorithm: "ES256",
    issuer: teamId,
    expiresIn: "180d",
    header: {
      alg: "ES256",
      kid: keyId
    }
  });
}

export async function searchAppleCatalog(term: string, limit = 10) {
  const developerToken = createAppleDeveloperToken();
  const storefront = getAppleMusicStorefront();
  const params = new URLSearchParams({
    term,
    types: "songs",
    limit: String(limit)
  });

  const response = await fetch(
    `${APPLE_API_BASE}/catalog/${storefront}/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${developerToken}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Apple Music search failed: ${response.status} ${body}`);
  }

  return response.json();
}

async function fetchAppleMusicJson(
  path: string,
  options?: {
    userToken?: string;
  }
) {
  const developerToken = createAppleDeveloperToken();

  const response = await fetch(`${APPLE_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${developerToken}`,
      ...(options?.userToken
        ? {
            "Music-User-Token": options.userToken
          }
        : {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Apple Music request failed: ${response.status} ${body}`);
  }

  return response.json();
}

export async function getRecentlyPlayedTracks(
  userToken: string,
  targetCount = 100
) {
  const tracks: AppleMusicSong[] = [];
  let offset = 0;

  while (tracks.length < targetCount) {
    const limit = Math.min(30, targetCount - tracks.length);
    const params = new URLSearchParams({
      types: "songs",
      limit: String(limit),
      offset: String(offset)
    });

    const payload = await fetchAppleMusicJson(
      `/me/recent/played/tracks?${params.toString()}`,
      { userToken }
    );

    const pageItems = (payload?.data || []) as AppleMusicSong[];
    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break;
    }

    tracks.push(...pageItems);

    if (!payload?.next || pageItems.length < limit) {
      break;
    }

    offset += pageItems.length;
  }

  return tracks.slice(0, targetCount);
}
