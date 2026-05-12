import { NextRequest, NextResponse } from "next/server";
import { getRecentlyPlayedTracks } from "@/lib/apple-music";

export async function GET(request: NextRequest) {
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
      { status: 500 }
    );
  }
}
