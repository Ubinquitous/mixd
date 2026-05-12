import { NextRequest, NextResponse } from "next/server";
import { getRecentlyPlayedTracks } from "@/lib/apple-music";
import { joinMixd } from "@/lib/mixd-store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await context.params;
  const body = await request.json().catch(() => null);
  const musicUserToken = body?.musicUserToken?.trim();
  const participantId = body?.participantId?.trim();
  const displayName = body?.displayName?.trim() || "당신";

  if (!musicUserToken || !participantId) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  try {
    const recentTracks = await getRecentlyPlayedTracks(musicUserToken, 100);
    const mixd = await joinMixd({
      inviteCode,
      participantId,
      displayName,
      trackCount: recentTracks.length
    });

    if (!mixd) {
      return NextResponse.json({ error: "Mixd not found." }, { status: 404 });
    }

    return NextResponse.json({ mixd });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to join mixd."
      },
      { status: 500 }
    );
  }
}
