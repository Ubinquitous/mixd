import type { MixdParticipant, MixdTrack } from "@/lib/mixd-store";

export type MixdResultTrack = MixdTrack & {
  sharedBy: string[];
};

export type MixdResult = {
  status: "waiting" | "ready";
  compatibilityPercentage: number | null;
  participantCount: number;
  sharedTrackCount: number;
  sharedTracks: MixdResultTrack[];
  playlist: MixdResultTrack[];
};

function uniqueTracks(tracks: MixdTrack[]) {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    if (!track.id || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

function normalizeArtist(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function diceCoefficient(left: Set<string>, right: Set<string>) {
  if (left.size === 0 && right.size === 0) return 0;
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }
  return (2 * intersection) / (left.size + right.size);
}

function compatibilityForPair(left: MixdTrack[], right: MixdTrack[]) {
  const leftSongs = new Set(left.map((track) => track.id));
  const rightSongs = new Set(right.map((track) => track.id));
  const leftArtists = new Set(left.map((track) => normalizeArtist(track.artistName)).filter(Boolean));
  const rightArtists = new Set(right.map((track) => normalizeArtist(track.artistName)).filter(Boolean));
  return diceCoefficient(leftSongs, rightSongs) * 0.75 +
    diceCoefficient(leftArtists, rightArtists) * 0.25;
}

export function calculateMixdResult(participants: MixdParticipant[]): MixdResult {
  const listeners = participants
    .map((participant) => ({ ...participant, tracks: uniqueTracks(participant.tracks || []) }))
    .filter((participant) => participant.tracks.length > 0);

  if (listeners.length < 2) {
    return {
      status: "waiting",
      compatibilityPercentage: null,
      participantCount: participants.length,
      sharedTrackCount: 0,
      sharedTracks: [],
      playlist: []
    };
  }

  const pairScores: number[] = [];
  for (let left = 0; left < listeners.length; left += 1) {
    for (let right = left + 1; right < listeners.length; right += 1) {
      pairScores.push(compatibilityForPair(listeners[left].tracks, listeners[right].tracks));
    }
  }

  const aggregate = new Map<string, {
    track: MixdTrack;
    listeners: Map<string, { displayName: string; rankScore: number }>;
  }>();

  for (const participant of listeners) {
    participant.tracks.forEach((track, index) => {
      const rankScore = 1 - index / Math.max(participant.tracks.length, 1);
      const entry = aggregate.get(track.id) || {
        track,
        listeners: new Map<string, { displayName: string; rankScore: number }>()
      };
      entry.listeners.set(participant.participantId, { displayName: participant.displayName, rankScore });
      aggregate.set(track.id, entry);
    });
  }

  const rankedTracks = [...aggregate.values()]
    .map((entry) => {
      const listenerValues = [...entry.listeners.values()];
      const coverage = listenerValues.length / listeners.length;
      const recencyAffinity = listenerValues.reduce((sum, listener) => sum + listener.rankScore, 0) /
        listeners.length;
      return {
        ...entry.track,
        sharedBy: listenerValues.map((listener) => listener.displayName),
        score: coverage * 0.7 + recencyAffinity * 0.3
      };
    })
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));

  const sharedTracks = rankedTracks
    .filter((track) => track.sharedBy.length >= 2)
    .map(({ score: _score, ...track }) => track);
  const playlist = rankedTracks.slice(0, 50).map(({ score: _score, ...track }) => track);
  const compatibility = pairScores.reduce((sum, score) => sum + score, 0) / pairScores.length;

  return {
    status: "ready",
    compatibilityPercentage: Math.round(compatibility * 100),
    participantCount: participants.length,
    sharedTrackCount: sharedTracks.length,
    sharedTracks,
    playlist
  };
}
