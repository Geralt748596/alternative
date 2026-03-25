import { NextResponse } from "next/server";
import { isNull, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { newsArticles } from "@/lib/db/schema";
import { generateArticlePoster } from "@/lib/services/image-gen";
import { CACHE_TAGS } from "@/lib/data/queries";

/**
 * POST /api/generate/posters
 *
 * Finds all articles without a poster (imageUrl IS NULL) and generates
 * DALL-E 3 posters for them sequentially. Returns a summary of results.
 */
export async function POST() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const missing = await db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      category: newsArticles.category,
      content: newsArticles.content,
    })
    .from(newsArticles)
    .where(isNull(newsArticles.imageUrl));

  if (missing.length === 0) {
    return NextResponse.json({ message: "All articles already have posters", generated: 0 });
  }

  let generated = 0;
  const errors: string[] = [];

  for (const article of missing) {
    const imageUrl = await generateArticlePoster(
      article.id,
      article.title,
      article.category,
      article.content,
    );

    if (imageUrl) {
      await db
        .update(newsArticles)
        .set({ imageUrl })
        .where(eq(newsArticles.id, article.id));
      generated++;
    } else {
      errors.push(article.id);
    }
  }

  revalidateTag(CACHE_TAGS.articles, 'max');

  return NextResponse.json({
    total: missing.length,
    generated,
    failed: errors.length,
    failedIds: errors.length > 0 ? errors : undefined,
  });
}
