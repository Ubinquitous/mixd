import type { MixdTrackPreview } from "@/lib/mixd-store";

type AppleSong = {
  id: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    artwork?: {
      url?: string;
    };
  };
};

export function toTrackPreviews(songs: AppleSong[]): MixdTrackPreview[] {
  return songs.slice(0, 4).map((song) => ({
    id: song.id,
    name: song.attributes?.name || song.id,
    artistName: song.attributes?.artistName || "Unknown artist",
    albumName: song.attributes?.albumName || "Unknown album",
    artworkUrl: (song.attributes?.artwork?.url || "")
      .replace("{w}", "400")
      .replace("{h}", "400")
  }));
}
