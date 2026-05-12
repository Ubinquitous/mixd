import { NextResponse } from "next/server";
import { createAppleDeveloperToken } from "@/lib/apple-music";

export async function GET() {
  try {
    const developerToken = createAppleDeveloperToken();

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
