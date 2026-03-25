import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generationDays, newsArticles, worldContext } from "@/lib/db/schema";
import { getRealNewsForDay } from "@/lib/services/news-source";
import { findSimilarArticles, generateEmbedding } from "@/lib/services/vector";
import { generateNewsForDay } from "@/lib/services/prompt-builder";
import { generateArticlePoster } from "@/lib/services/image-gen";

export type DayStatus = "pending" | "generating" | "completed" | "failed";

export interface GenerationResult {
  dayId: string;
  date: Date;
  articlesCreated: number;
}

/**
 * Returns the active world context. Throws if none is configured.
 */
async function getActiveContext() {
  const [ctx] = await db
    .select()
    .from(worldContext)
    .where(eq(worldContext.isActive, true))
    .limit(1);

  if (!ctx) {
    throw new Error(
      "No active world context found. Create one via POST /api/context first.",
    );
  }

  return ctx;
}

function getYesterday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/**
 * Resolves the next date to generate. Either the provided date,
 * or the day after the latest completed generation day, or yesterday.
 */
export async function resolveNextDate(requestedDate?: Date): Promise<Date> {
  if (requestedDate) return requestedDate;

  const [latestCompleted] = await db
    .select({ date: generationDays.date })
    .from(generationDays)
    .where(eq(generationDays.status, "completed"))
    .orderBy(generationDays.date)
    .limit(1);

  if (!latestCompleted) {
    return getYesterday();
  }

  const next = new Date(latestCompleted.date);
  next.setDate(next.getDate() + 1);
  return next;
}

/**
 * Core pipeline: generates alternative news for a single day.
 *
 * Steps:
 *  1. Get active world context
 *  2. Fetch (or retrieve cached) real-world news for the date
 *  3. Build RAG query from real news headlines
 *  4. Find semantically relevant past alternative events
 *  5. Call Claude to generate alternative articles
 *  6. Save articles to DB
 *  7. Generate and save embeddings for each article (parallel)
 *  8. Generate and save DALL-E 3 posters for each article (parallel, non-fatal)
 *  9. Mark day as completed
 */
export async function generateDay(targetDate: Date): Promise<GenerationResult> {
  const dateStr = targetDate.toISOString().slice(0, 10);

  // Upsert the generation day record, set to "generating"
  const existing = await db
    .select()
    .from(generationDays)
    .where(eq(generationDays.date, targetDate))
    .limit(1);

  let dayId: string;

  if (existing[0]) {
    if (existing[0].status === "completed") {
      throw new Error(`Day ${dateStr} is already completed.`);
    }
    if (existing[0].status === "generating") {
      throw new Error(`Day ${dateStr} is already being generated.`);
    }
    await db
      .update(generationDays)
      .set({ status: "generating" })
      .where(eq(generationDays.id, existing[0].id));
    dayId = existing[0].id;
  } else {
    const [newDay] = await db
      .insert(generationDays)
      .values({ date: targetDate, status: "generating" })
      .returning();
    dayId = newDay.id;
  }

  try {
    // Step 1: active context
    const ctx = await getActiveContext();

    // Step 2: real-world news
    const realNews = await getRealNewsForDay(targetDate);

    // Step 3-4: RAG — search past alternative events by real news headlines
    const ragQuery = realNews
      .slice(0, 5)
      .map((n) => n.title)
      .join(". ");

    const pastEvents = ragQuery
      ? await findSimilarArticles(ragQuery, {
          limit: 15,
          minSimilarity: 0.4,
          beforeDate: targetDate,
        })
      : [];

    // Step 5: generate via Claude
    const generated = await generateNewsForDay({
      targetDate,
      worldPremise: ctx.premise,
      worldDetails: ctx.details,
      realNews,
      pastEvents,
    });

    // Step 6: save articles
    const insertedArticles = await db
      .insert(newsArticles)
      .values(
        generated.articles.map((article) => ({
          dayId,
          title: article.title,
          content: article.content,
          category: article.category,
          region: article.region,
          importance: article.importance,
        })),
      )
      .returning();

    // Step 7+8: generate embeddings and posters in parallel per article.
    // Poster failures are non-fatal — imageUrl stays null for that article.
    await Promise.all(
      insertedArticles.map(async (article) => {
        const [embedding, imageUrl] = await Promise.all([
          generateEmbedding(`${article.title}\n\n${article.content}`),
          generateArticlePoster(
            article.id,
            article.title,
            article.category,
            article.content,
          ),
        ]);

        await db
          .update(newsArticles)
          .set({
            embedding,
            ...(imageUrl ? { imageUrl } : {}),
          })
          .where(eq(newsArticles.id, article.id));
      }),
    );

    // Step 9: mark completed
    await db
      .update(generationDays)
      .set({
        status: "completed",
        genNewsCount: insertedArticles.length,
        completedAt: new Date(),
      })
      .where(eq(generationDays.id, dayId));

    return { dayId, date: targetDate, articlesCreated: insertedArticles.length };
  } catch (error) {
    await db
      .update(generationDays)
      .set({ status: "failed" })
      .where(eq(generationDays.id, dayId));
    throw error;
  }
}

/**
 * Generates a sequential range of days [from, to], stopping on first failure.
 */
export async function generateRange(
  from: Date,
  to: Date,
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];
  const current = new Date(from);

  while (current <= to) {
    const result = await generateDay(new Date(current));
    results.push(result);
    current.setDate(current.getDate() + 1);
  }

  return results;
}
