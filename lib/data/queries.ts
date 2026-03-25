import { asc, desc, eq, and } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { generationDays, newsArticles } from "@/lib/db/schema";

// ─── Cache tags ───────────────────────────────────────────────────────────────
// Tags are used to invalidate specific cache entries on-demand via revalidateTag().
// Called from API routes after mutations (e.g. POST /api/generate).

export const CACHE_TAGS = {
  days: "days",
  articles: "articles",
  articleById: (id: string) => `article-${id}`,
  articlesByDay: (dayId: string) => `day-articles-${dayId}`,
} as const;

// ─── Timeline / days ──────────────────────────────────────────────────────────

export async function getAllDays() {
  "use cache";
  cacheLife("seconds");
  cacheTag(CACHE_TAGS.days);

  return db
    .select({
      id: generationDays.id,
      date: generationDays.date,
      status: generationDays.status,
      genNewsCount: generationDays.genNewsCount,
    })
    .from(generationDays)
    .orderBy(asc(generationDays.date));
}

export async function getLatestCompletedDay() {
  "use cache";
  cacheLife("seconds");
  cacheTag(CACHE_TAGS.days);

  const [day] = await db
    .select()
    .from(generationDays)
    .where(eq(generationDays.status, "completed"))
    .orderBy(desc(generationDays.date))
    .limit(1);

  return day ?? null;
}

export async function getDayByDate(dateStr: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.days);

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const [day] = await db
    .select()
    .from(generationDays)
    .where(eq(generationDays.date, date))
    .limit(1);

  return day ?? null;
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export async function getArticlesForDay(
  dayId: string,
  category: string | undefined,
) {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.articles);
  cacheTag(CACHE_TAGS.articlesByDay(dayId));

  const conditions = category
    ? [eq(newsArticles.dayId, dayId), eq(newsArticles.category, category)]
    : [eq(newsArticles.dayId, dayId)];

  return db
    .select()
    .from(newsArticles)
    .where(and(...conditions))
    .orderBy(desc(newsArticles.importance));
}

export async function getArticleWithDay(articleId: string) {
  "use cache";
  cacheLife("max");
  cacheTag(CACHE_TAGS.articles);
  cacheTag(CACHE_TAGS.articleById(articleId));

  const [article] = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.id, articleId))
    .limit(1);

  if (!article) return null;

  const [day] = await db
    .select({ date: generationDays.date })
    .from(generationDays)
    .where(eq(generationDays.id, article.dayId))
    .limit(1);

  return { article, dayDate: day?.date ?? null };
}
