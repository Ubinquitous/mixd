import { NextRequest, NextResponse } from "next/server";
import { searchAppleCatalog } from "@/lib/apple-music";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Missing required query parameter: q" },
      { status: 400 }
    );
  }

  try {
    const payload = await searchAppleCatalog(query, 10);
    const songs = payload?.results?.songs?.data || [];
    return NextResponse.json({ songs });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Apple Music search failed."
      },
      { status: 500 }
    );
  }
}
