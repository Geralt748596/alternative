import { NextRequest, NextResponse } from "next/server";
import { findSimilarArticles } from "@/lib/services/vector";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const q = searchParams.get("q");
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 },
    );
  }

  const articles = await findSimilarArticles(q.trim(), { limit, minSimilarity: 0.3 });

  return NextResponse.json({ articles, query: q, total: articles.length });
}
