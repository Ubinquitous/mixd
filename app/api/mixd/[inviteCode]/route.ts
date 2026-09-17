import { NextResponse } from "next/server";
import { getMixdByInviteCode, toMixdView } from "@/lib/mixd-store";
import { getSession } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await context.params;
  const [mixd, session] = await Promise.all([getMixdByInviteCode(inviteCode), getSession()]);
  if (!mixd) return NextResponse.json({ error: "믹스를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ mixd: toMixdView(mixd, session?.participantId) });
}
