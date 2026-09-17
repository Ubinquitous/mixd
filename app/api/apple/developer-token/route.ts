import { NextRequest, NextResponse } from "next/server";
import { createAppleDeveloperToken } from "@/lib/apple-music";

export async function GET(request: NextRequest) {
  try {
    const configuredOrigins = (process.env.APPLE_MUSIC_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const requestOrigin = request.nextUrl.origin;
    const origin = configuredOrigins.length > 0
      ? (configuredOrigins.includes(requestOrigin) ? requestOrigin : undefined)
      : (new URL(requestOrigin).hostname === "localhost" || new URL(requestOrigin).hostname === "127.0.0.1"
        ? requestOrigin
        : undefined);
    const developerToken = createAppleDeveloperToken(origin);

    return NextResponse.json({
      developerToken,
      appName: process.env.NEXT_PUBLIC_APP_NAME || "Mixd MusicKit Demo"
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Apple Music developer token."
      },
      { status: 500 }
    );
  }
}
