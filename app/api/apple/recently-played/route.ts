import { NextRequest, NextResponse } from "next/server";
import { AppleMusicApiError, getRecentlyPlayedTracks } from "@/lib/apple-music";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userToken = request.headers.get("x-music-user-token")?.trim();

  if (!userToken) {
    return NextResponse.json(
      { error: "Missing Music User Token." },
      { status: 400 }
    );
  }

  try {
    const songs = await getRecentlyPlayedTracks(userToken, 100);
    return NextResponse.json({ songs });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch recently played tracks."
      },
      { status: error instanceof AppleMusicApiError && error.status < 500 ? 401 : 502 }
    );
  }
}
