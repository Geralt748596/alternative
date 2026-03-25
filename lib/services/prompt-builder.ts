import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, CLAUDE_MODEL, MAX_TOKENS } from "@/lib/claude";
import type { RealNewsItem } from "@/lib/services/news-source";
import type { SimilarArticle } from "@/lib/services/vector";
import {
  formatNewsForPrompt,
} from "@/lib/services/news-source";
import { formatSimilarArticlesForPrompt } from "@/lib/services/vector";

// ─── Output schema ────────────────────────────────────────────────────────────

export const GeneratedArticleSchema = z.object({
  title: z.string().describe("Headline of the alternative news article"),
  content: z
    .string()
    .describe("Full article body, 3-5 paragraphs, journalistic style"),
  category: z
    .enum([
      "politics",
      "business",
      "technology",
      "science",
      "society",
      "environment",
      "world",
    ])
    .describe("Primary news category"),
  region: z
    .string()
    .nullable()
    .describe(
      "Geographic region or country most relevant to this article (null if global)",
    ),
  importance: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe(
      "Editorial importance score: 10 = major world-changing event, 1 = minor local story",
    ),
});

export const GeneratedDaySchema = z.object({
  articles: z
    .array(GeneratedArticleSchema)
    .min(5)
    .max(8)
    .describe("5 to 8 alternative news articles for this day"),
});

export type GeneratedArticle = z.infer<typeof GeneratedArticleSchema>;
export type GeneratedDay = z.infer<typeof GeneratedDaySchema>;

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a meticulous alternative history journalist.
Your task is to write what the news would have looked like on a specific date, given an alternative world premise.

Rules:
- Write in a neutral, factual journalistic style (AP/Reuters)
- Respect the chain of causality: each day's events must follow logically from previous alternative events and the world premise
- Do NOT invent COVID-19, pandemic-related events, or any events explicitly excluded by the world premise
- Base the general political/economic backdrop on real-world events of that date, then diverge where the premise requires
- Keep articles plausible and internally consistent
- Write in English`;

// ─── Prompt builder ───────────────────────────────────────────────────────────

export interface BuildPromptInput {
  targetDate: Date;
  worldPremise: string;
  worldDetails: string;
  realNews: RealNewsItem[];
  pastEvents: SimilarArticle[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildUserMessage(input: BuildPromptInput): string {
  const { targetDate, worldPremise, worldDetails, realNews, pastEvents } =
    input;

  const sections: string[] = [];

  sections.push(`## Today's date\n${formatDate(targetDate)}`);

  sections.push(
    `## World premise\n${worldPremise}\n\n${worldDetails}`,
  );

  sections.push(
    pastEvents.length > 0
      ? `## Relevant past alternative events (for continuity)\n${formatSimilarArticlesForPrompt(pastEvents)}`
      : `## Relevant past alternative events\nThis is the first day — no past alternative events yet.`,
  );

  sections.push(
    realNews.length > 0
      ? `## Real-world news of this date (use as backdrop, then diverge per premise)\n${formatNewsForPrompt(realNews)}`
      : `## Real-world news\nNo real-world news available for this date.`,
  );

  sections.push(
    `## Task\nWrite 5–8 alternative news articles for ${formatDate(targetDate)}, consistent with all of the above.`,
  );

  return sections.join("\n\n---\n\n");
}

// ─── Generation ───────────────────────────────────────────────────────────────

export async function generateNewsForDay(
  input: BuildPromptInput,
): Promise<GeneratedDay> {
  const userMessage = buildUserMessage(input);

  const response = await anthropic.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: zodOutputFormat(GeneratedDaySchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error(
      `Claude returned stop_reason="${response.stop_reason}" with no parseable output`,
    );
  }

  return response.parsed_output;
}
