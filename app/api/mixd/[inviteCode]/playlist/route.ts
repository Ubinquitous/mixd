import { NextRequest, NextResponse } from "next/server";
import { AppleMusicApiError, createAppleLibraryPlaylist } from "@/lib/apple-music";
import { calculateMixdResult } from "@/lib/mixd-analysis";
import { getMixdByInviteCode } from "@/lib/mixd-store";
import { getSession } from "@/lib/session";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await context.params;
  const [body, session, mixd] = await Promise.all([
    request.json().catch(() => null),
    getSession(),
    getMixdByInviteCode(inviteCode)
  ]);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!mixd) return NextResponse.json({ error: "믹스를 찾을 수 없습니다." }, { status: 404 });
  const isParticipant = mixd.participants.some(
    (participant) => participant.participantId === session.participantId
  );
  if (!isParticipant) return NextResponse.json({ error: "참여자만 저장할 수 있습니다." }, { status: 403 });
  const musicUserToken = typeof body?.musicUserToken === "string" ? body.musicUserToken.trim() : "";
  if (!musicUserToken) {
    return NextResponse.json({ error: "Apple Music 인증이 필요합니다." }, { status: 400 });
  }
  const result = calculateMixdResult(mixd.participants);
  if (result.status !== "ready" || result.playlist.length === 0) {
    return NextResponse.json({ error: "친구가 참여한 뒤 플레이리스트를 저장할 수 있습니다." }, { status: 409 });
  }

  try {
    const playlist = await createAppleLibraryPlaylist({
      userToken: musicUserToken,
      name: `mixd · ${mixd.name}`,
      description: `${mixd.participantCount}명의 최근 재생 취향으로 만든 Mixd 플레이리스트`,
      trackIds: result.playlist.map((track) => track.id)
    });
    return NextResponse.json({ playlist }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "플레이리스트 저장에 실패했습니다." },
      { status: error instanceof AppleMusicApiError && error.status < 500 ? 401 : 502 }
    );
  }
}
