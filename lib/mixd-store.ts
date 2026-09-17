import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { calculateMixdResult, type MixdResult } from "@/lib/mixd-analysis";

const MIXD_FILE_PATH = path.join(process.cwd(), "data", "mixds.json");

export type MixdTrack = {
  id: string;
  type: "songs";
  name: string;
  artistName: string;
  albumName: string;
  artworkUrl: string;
  durationInMillis: number | null;
};

export type MixdTrackPreview = Pick<MixdTrack, "id" | "name" | "artistName" | "albumName" | "artworkUrl">;

export type MixdParticipant = {
  participantId: string;
  displayName: string;
  role: "owner" | "guest";
  joinedAt: string;
  syncedAt: string;
  trackCount: number;
  tracks: MixdTrack[];
};

export type MixdRecord = {
  id: string;
  inviteCode: string;
  name: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  previewTracks: MixdTrackPreview[];
  participantCount: number;
  participants: MixdParticipant[];
};

export type MixdView = Omit<MixdRecord, "participants"> & {
  participants: Array<Omit<MixdParticipant, "tracks" | "participantId">>;
  result: MixdResult | null;
};

let writeQueue: Promise<void> = Promise.resolve();

function normalizeTrack(track: Partial<MixdTrack>): MixdTrack | null {
  if (!track.id) return null;
  return {
    id: String(track.id),
    type: "songs",
    name: track.name || String(track.id),
    artistName: track.artistName || "Unknown artist",
    albumName: track.albumName || "Unknown album",
    artworkUrl: track.artworkUrl || "",
    durationInMillis: typeof track.durationInMillis === "number" ? track.durationInMillis : null
  };
}

function normalizeRecord(record: MixdRecord): MixdRecord {
  const participants = (record.participants || []).map((participant) => {
    const tracks = (participant.tracks || [])
      .map((track) => normalizeTrack(track))
      .filter((track): track is MixdTrack => track !== null);
    return {
      ...participant,
      syncedAt: participant.syncedAt || participant.joinedAt,
      trackCount: tracks.length || participant.trackCount || 0,
      tracks
    };
  });
  return {
    ...record,
    updatedAt: record.updatedAt || record.createdAt,
    participantCount: participants.length,
    participants
  };
}

async function readMixds() {
  try {
    const raw = await fs.readFile(MIXD_FILE_PATH, "utf8");
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error("Mixd data file must contain an array.");
    return (data as MixdRecord[]).map(normalizeRecord);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeMixds(mixds: MixdRecord[]) {
  await fs.mkdir(path.dirname(MIXD_FILE_PATH), { recursive: true });
  const temporaryPath = `${MIXD_FILE_PATH}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(mixds, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, MIXD_FILE_PATH);
}

async function withWriteLock<T>(operation: () => Promise<T>) {
  const previous = writeQueue;
  let release = () => {};
  writeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

function createId(bytes = 12) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function createPreviewTracks(tracks: MixdTrack[]): MixdTrackPreview[] {
  return tracks.slice(0, 4).map(({ id, name, artistName, albumName, artworkUrl }) => ({
    id, name, artistName, albumName, artworkUrl
  }));
}

export function toMixdView(record: MixdRecord, participantId?: string): MixdView {
  const isParticipant = Boolean(participantId && record.participants.some(
    (participant) => participant.participantId === participantId
  ));
  return {
    ...record,
    participants: record.participants.map(({
      tracks: _tracks,
      participantId: _participantId,
      ...participant
    }) => participant),
    result: isParticipant ? calculateMixdResult(record.participants) : null
  };
}

export async function listMixds(participantId?: string) {
  const mixds = await readMixds();
  return mixds
    .filter((mixd) => !participantId || mixd.participants.some(
      (participant) => participant.participantId === participantId
    ))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMixdByInviteCode(inviteCode: string) {
  const mixds = await readMixds();
  return mixds.find((mixd) => mixd.inviteCode === inviteCode) || null;
}

export async function createMixd(input: {
  name: string;
  ownerName: string;
  participantId: string;
  tracks: MixdTrack[];
}) {
  return withWriteLock(async () => {
    const mixds = await readMixds();
    const now = new Date().toISOString();
    let inviteCode = createId(9);
    while (mixds.some((mixd) => mixd.inviteCode === inviteCode)) inviteCode = createId(9);
    const record: MixdRecord = {
      id: createId(),
      inviteCode,
      name: input.name,
      ownerName: input.ownerName,
      createdAt: now,
      updatedAt: now,
      previewTracks: createPreviewTracks(input.tracks),
      participantCount: 1,
      participants: [{
        participantId: input.participantId,
        displayName: input.ownerName,
        role: "owner",
        joinedAt: now,
        syncedAt: now,
        trackCount: input.tracks.length,
        tracks: input.tracks
      }]
    };
    mixds.unshift(record);
    await writeMixds(mixds);
    return record;
  });
}

export async function joinMixd(input: {
  inviteCode: string;
  participantId: string;
  displayName: string;
  tracks: MixdTrack[];
}) {
  return withWriteLock(async () => {
    const mixds = await readMixds();
    const index = mixds.findIndex((mixd) => mixd.inviteCode === input.inviteCode);
    if (index === -1) return null;
    const record = mixds[index];
    const existing = record.participants.find(
      (participant) => participant.participantId === input.participantId
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.displayName = input.displayName;
      existing.syncedAt = now;
      existing.trackCount = input.tracks.length;
      existing.tracks = input.tracks;
      if (existing.role === "owner") record.ownerName = input.displayName;
    } else {
      record.participants.push({
        participantId: input.participantId,
        displayName: input.displayName,
        role: "guest",
        joinedAt: now,
        syncedAt: now,
        trackCount: input.tracks.length,
        tracks: input.tracks
      });
    }
    record.updatedAt = now;
    record.participantCount = record.participants.length;
    const playlist = calculateMixdResult(record.participants).playlist;
    if (playlist.length > 0) record.previewTracks = createPreviewTracks(playlist);
    mixds[index] = record;
    await writeMixds(mixds);
    return record;
  });
}
