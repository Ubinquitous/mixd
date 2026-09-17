import type { AppleMusicSong } from "@/lib/apple-music";
import type { MixdTrack } from "@/lib/mixd-store";

export function toMixdTracks(songs: AppleMusicSong[]): MixdTrack[] {
  const seen = new Set<string>();
  return songs.flatMap((song) => {
    if (!song.id || seen.has(song.id)) return [];
    seen.add(song.id);
    return [{
      id: song.id,
      type: "songs" as const,
      name: song.attributes?.name || song.id,
      artistName: song.attributes?.artistName || "Unknown artist",
      albumName: song.attributes?.albumName || "Unknown album",
      artworkUrl: (song.attributes?.artwork?.url || "")
        .replace("{w}", "400")
        .replace("{h}", "400"),
      durationInMillis: song.attributes?.durationInMillis ?? null
    }];
  });
}

export function validateDisplayName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  return name.length >= 1 && name.length <= 40 ? name : null;
}

export function validateMixdName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  return name.length >= 1 && name.length <= 80 ? name : null;
}
