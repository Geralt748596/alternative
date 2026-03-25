import { and, cosineDistance, desc, gt, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsArticles } from "@/lib/db/schema";
import { openai, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "@/lib/openai";

export interface SimilarArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  region: string | null;
  importance: number;
  similarity: number;
}

/**
 * Converts text to a 1536-dim embedding vector using OpenAI.
 * Newlines are collapsed — they can degrade embedding quality.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replaceAll("\n", " ").trim();

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Stores an embedding for an existing news article.
 */
export async function saveEmbedding(
  articleId: string,
  embedding: number[],
): Promise<void> {
  await db
    .update(newsArticles)
    .set({ embedding })
    .where(sql`${newsArticles.id} = ${articleId}`);
}

interface FindSimilarOptions {
  limit?: number;
  minSimilarity?: number;
  /** Only return articles created before this date (for RAG: exclude future) */
  beforeDate?: Date;
}

/**
 * Finds semantically similar past articles using cosine distance.
 * Used in the RAG step before generating a new day's news.
 */
export async function findSimilarArticles(
  queryText: string,
  options: FindSimilarOptions = {},
): Promise<SimilarArticle[]> {
  const { limit = 15, minSimilarity = 0.4, beforeDate } = options;

  const queryEmbedding = await generateEmbedding(queryText);

  const similarity = sql<number>`1 - (${cosineDistance(newsArticles.embedding, queryEmbedding)})`;

  const conditions = [gt(similarity, minSimilarity)];
  if (beforeDate) {
    conditions.push(lt(newsArticles.createdAt, beforeDate));
  }

  const results = await db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      content: newsArticles.content,
      category: newsArticles.category,
      region: newsArticles.region,
      importance: newsArticles.importance,
      similarity,
    })
    .from(newsArticles)
    .where(and(...conditions))
    .orderBy(desc(similarity))
    .limit(limit);

  return results;
}

/**
 * Formats similar articles as compact context for Claude prompts.
 * Truncates content to keep prompt size manageable.
 */
export function formatSimilarArticlesForPrompt(
  articles: SimilarArticle[],
  maxContentLength = 300,
): string {
  if (articles.length === 0) return "No relevant past events found.";

  return articles
    .map((article, i) => {
      const truncated =
        article.content.length > maxContentLength
          ? article.content.slice(0, maxContentLength) + "…"
          : article.content;
      return [
        `${i + 1}. [${article.category.toUpperCase()}${article.region ? ` / ${article.region}` : ""}] ${article.title}`,
        `   ${truncated}`,
      ].join("\n");
    })
    .join("\n\n");
}
