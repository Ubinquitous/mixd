import { NextRequest, NextResponse } from "next/server";
import { getRecentlyPlayedTracks } from "@/lib/apple-music";
import { createMixd, listMixds } from "@/lib/mixd-store";
import { toTrackPreviews } from "@/lib/mixd-utils";

export async function GET() {
  const mixds = await listMixds();
  return NextResponse.json({ mixds });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = body?.name?.trim();
  const ownerName = body?.ownerName?.trim();
  const musicUserToken = body?.musicUserToken?.trim();
  const participantId = body?.participantId?.trim();

  if (!name || !ownerName || !musicUserToken || !participantId) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  try {
    const recentTracks = await getRecentlyPlayedTracks(musicUserToken, 100);
    const mixd = await createMixd({
      name,
      ownerName,
      participantId,
      previewTracks: toTrackPreviews(recentTracks),
      trackCount: recentTracks.length
    });

    return NextResponse.json({ mixd });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create mixd."
      },
      { status: 500 }
    );
  }
}
