import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles, generationDays } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const dateParam = searchParams.get("date");
  const category = searchParams.get("category");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (dateParam) {
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: `Invalid date: "${dateParam}"` },
        { status: 400 },
      );
    }
    // Join to filter by day date
    const [day] = await db
      .select({ id: generationDays.id })
      .from(generationDays)
      .where(eq(generationDays.date, date))
      .limit(1);

    if (!day) {
      return NextResponse.json({ articles: [], total: 0, page, limit });
    }

    conditions.push(eq(newsArticles.dayId, day.id));
  }

  if (category) {
    conditions.push(eq(newsArticles.category, category));
  }

  const articles = await db
    .select({
      id: newsArticles.id,
      dayId: newsArticles.dayId,
      title: newsArticles.title,
      content: newsArticles.content,
      category: newsArticles.category,
      region: newsArticles.region,
      importance: newsArticles.importance,
      createdAt: newsArticles.createdAt,
    })
    .from(newsArticles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(newsArticles.importance), desc(newsArticles.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ articles, page, limit });
}
