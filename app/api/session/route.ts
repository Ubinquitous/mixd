import { NextRequest, NextResponse } from "next/server";
import { clearSession, getSession, setSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ session });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const participantId = body?.participantId?.trim();
  const displayName = body?.displayName?.trim();

  if (!participantId || !displayName) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  await setSession({ participantId, displayName });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
