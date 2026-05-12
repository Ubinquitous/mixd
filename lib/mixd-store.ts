import fs from "node:fs/promises";
import path from "node:path";

const MIXD_FILE_PATH = path.join(process.cwd(), "data", "mixds.json");

export type MixdTrackPreview = {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  artworkUrl: string;
};

export type MixdParticipant = {
  participantId: string;
  displayName: string;
  role: "owner" | "guest";
  joinedAt: string;
  trackCount: number;
};

export type MixdRecord = {
  id: string;
  inviteCode: string;
  name: string;
  ownerName: string;
  createdAt: string;
  previewTracks: MixdTrackPreview[];
  participantCount: number;
  participants: MixdParticipant[];
};

async function readMixds() {
  try {
    const raw = await fs.readFile(MIXD_FILE_PATH, "utf8");
    const data = JSON.parse(raw) as MixdRecord[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeMixds(mixds: MixdRecord[]) {
  await fs.writeFile(MIXD_FILE_PATH, `${JSON.stringify(mixds, null, 2)}\n`, "utf8");
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

export async function listMixds() {
  const mixds = await readMixds();
  return mixds.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMixdByInviteCode(inviteCode: string) {
  const mixds = await readMixds();
  return mixds.find((mixd) => mixd.inviteCode === inviteCode) || null;
}

export async function createMixd(input: {
  name: string;
  ownerName: string;
  participantId: string;
  previewTracks: MixdTrackPreview[];
  trackCount: number;
}) {
  const mixds = await readMixds();
  const inviteCode = createId();
  const record: MixdRecord = {
    id: createId(),
    inviteCode,
    name: input.name,
    ownerName: input.ownerName,
    createdAt: new Date().toISOString(),
    previewTracks: input.previewTracks,
    participantCount: 1,
    participants: [
      {
        participantId: input.participantId,
        displayName: input.ownerName,
        role: "owner",
        joinedAt: new Date().toISOString(),
        trackCount: input.trackCount
      }
    ]
  };

  mixds.unshift(record);
  await writeMixds(mixds);
  return record;
}

export async function joinMixd(input: {
  inviteCode: string;
  participantId: string;
  displayName: string;
  trackCount: number;
}) {
  const mixds = await readMixds();
  const index = mixds.findIndex((mixd) => mixd.inviteCode === input.inviteCode);

  if (index === -1) {
    return null;
  }

  const record = mixds[index];
  const existing = record.participants.find(
    (participant) => participant.participantId === input.participantId
  );

  if (!existing) {
    record.participants.push({
      participantId: input.participantId,
      displayName: input.displayName,
      role: "guest",
      joinedAt: new Date().toISOString(),
      trackCount: input.trackCount
    });
    record.participantCount = record.participants.length;
    mixds[index] = record;
    await writeMixds(mixds);
  }

  return record;
}
