import fs from "node:fs";
import jwt from "jsonwebtoken";

const APPLE_API_BASE = "https://api.music.apple.com/v1";
const cachedDeveloperTokens = new Map<string, { value: string; expiresAt: number }>();

export type AppleMusicSong = {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    artwork?: { url?: string; width?: number; height?: number };
    durationInMillis?: number;
  };
};

export class AppleMusicApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AppleMusicApiError";
  }
}

function readPrivateKey() {
  const inlineKey = process.env.APPLE_MUSIC_PRIVATE_KEY;
  if (inlineKey) return inlineKey.replace(/\\n/g, "\n");
  const keyPath = process.env.APPLE_MUSIC_PRIVATE_KEY_PATH;
  if (keyPath) return fs.readFileSync(keyPath, "utf8");
  throw new Error("Missing APPLE_MUSIC_PRIVATE_KEY or APPLE_MUSIC_PRIVATE_KEY_PATH.");
}

export function getAppleMusicStorefront() {
  return process.env.APPLE_MUSIC_STOREFRONT || "kr";
}

export function createAppleDeveloperToken(origin?: string) {
  const cacheKey = origin || "server";
  const cachedDeveloperToken = cachedDeveloperTokens.get(cacheKey);
  if (cachedDeveloperToken && cachedDeveloperToken.expiresAt > Date.now() + 60_000) {
    return cachedDeveloperToken.value;
  }
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  if (!teamId || !keyId) throw new Error("Missing APPLE_MUSIC_TEAM_ID or APPLE_MUSIC_KEY_ID.");
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 179;
  const value = jwt.sign(origin ? { origin: [origin] } : {}, readPrivateKey(), {
    algorithm: "ES256",
    issuer: teamId,
    expiresIn: "179d",
    header: { alg: "ES256", kid: keyId }
  });
  cachedDeveloperTokens.set(cacheKey, { value, expiresAt });
  return value;
}

function appleApiUrl(pathOrUrl: string) {
  const url = new URL(pathOrUrl, `${APPLE_API_BASE}/`);
  if (url.origin !== "https://api.music.apple.com") {
    throw new Error("Invalid Apple Music pagination URL.");
  }
  return url;
}

async function fetchAppleMusicJson(
  pathOrUrl: string,
  options: { userToken?: string; method?: "GET" | "POST"; body?: unknown } = {}
) {
  const response = await fetch(appleApiUrl(pathOrUrl), {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${createAppleDeveloperToken()}`,
      ...(options.userToken ? { "Music-User-Token": options.userToken } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload?.errors?.[0]?.detail || payload?.errors?.[0]?.title || "";
    } catch {}
    const message = detail.toLowerCase().includes("invalid authentication")
      ? "Apple Music 권한이 유효하지 않습니다. 로그인 화면에서 Apple Music 연결을 다시 시도해 주세요."
      : detail || (response.status === 401 || response.status === 403
        ? "Apple Music 인증이 만료되었거나 권한이 없습니다."
        : "Apple Music 요청에 실패했습니다.");
    throw new AppleMusicApiError(
      message,
      response.status
    );
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function searchAppleCatalog(term: string, limit = 10) {
  const params = new URLSearchParams({ term, types: "songs", limit: String(limit) });
  return fetchAppleMusicJson(`/v1/catalog/${getAppleMusicStorefront()}/search?${params}`);
}

export async function validateMusicUserToken(userToken: string) {
  await fetchAppleMusicJson("/v1/me/storefront", { userToken });
}

export async function getRecentlyPlayedTracks(userToken: string, targetCount = 100) {
  const tracks: AppleMusicSong[] = [];
  let nextPath: string | null = `/v1/me/recent/played/tracks?limit=${Math.min(30, targetCount)}`;
  let pages = 0;
  while (nextPath && tracks.length < targetCount && pages < 20) {
    const payload = await fetchAppleMusicJson(nextPath, { userToken });
    const pageItems = Array.isArray(payload?.data) ? payload.data as AppleMusicSong[] : [];
    tracks.push(...pageItems);
    nextPath = typeof payload?.next === "string" ? payload.next : null;
    pages += 1;
  }
  return tracks.slice(0, targetCount);
}

export async function createAppleLibraryPlaylist(input: {
  userToken: string;
  name: string;
  description: string;
  trackIds: string[];
}) {
  const payload = await fetchAppleMusicJson("/v1/me/library/playlists", {
    userToken: input.userToken,
    method: "POST",
    body: {
      attributes: { name: input.name, description: input.description },
      relationships: {
        tracks: { data: input.trackIds.map((id) => ({ id, type: "songs" })) }
      }
    }
  });
  return payload?.data?.[0] || null;
}
