import { NextRequest, NextResponse } from "next/server";
import { clearSession, getSession, setSession } from "@/lib/session";
import { validateDisplayName } from "@/lib/mixd-utils";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ session });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const displayName = validateDisplayName(body?.displayName) || "사용자";
  const session = await setSession({ displayName });
  return NextResponse.json({ session }, { status: 201 });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
