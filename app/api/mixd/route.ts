import { NextRequest, NextResponse } from "next/server";
import { AppleMusicApiError, getRecentlyPlayedTracks } from "@/lib/apple-music";
import { createMixd, listMixds, toMixdView } from "@/lib/mixd-store";
import { toMixdTracks, validateMixdName } from "@/lib/mixd-utils";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const mixds = await listMixds(session.participantId);
  return NextResponse.json({ mixds: mixds.map((mixd) => toMixdView(mixd, session.participantId)) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const name = validateMixdName(body?.name);
  const musicUserToken = typeof body?.musicUserToken === "string" ? body.musicUserToken.trim() : "";

  if (!name || !musicUserToken) {
    return NextResponse.json(
      { error: "믹스 이름과 Apple Music 인증이 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const recentTracks = await getRecentlyPlayedTracks(musicUserToken, 100);
    const tracks = toMixdTracks(recentTracks);
    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "최근 재생곡을 찾지 못했습니다. Apple Music에서 음악을 들은 뒤 다시 시도해 주세요." },
        { status: 422 }
      );
    }
    const mixd = await createMixd({
      name,
      ownerName: session.displayName,
      participantId: session.participantId,
      tracks
    });

    return NextResponse.json({ mixd: toMixdView(mixd, session.participantId) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create mixd."
      },
      { status: error instanceof AppleMusicApiError && error.status < 500 ? 401 : 502 }
    );
  }
}
