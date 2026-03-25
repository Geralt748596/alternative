import Anthropic from "@anthropic-ai/sdk";
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

const SYSTEM_PROMPT = `You are a senior investigative journalist writing for a prestigious alternative-history newspaper.
Your task: produce a day's edition of news articles for a world where COVID-19 never happened.

## Writing style — CRITICAL

Each article MUST center on **specific, named real people** — heads of state, CEOs, celebrities, athletes, scientists, activists. Never write abstractly about "officials" or "analysts". Always name the person, quote them (fabricate realistic quotes), describe their actions and reactions.

Good: "Elon Musk announced Tuesday that Tesla would…" / "Speaking at Davos, Christine Lagarde warned that…"
Bad: "Tech industry leaders signaled…" / "European officials expressed concern…"

## Rules

1. **People first**: Every article must feature at least 2-3 named real public figures with fabricated but plausible quotes and actions
2. **REAL NAMES ONLY**: NEVER invent fictional people or rename real people. Use their actual real-world names — Donald Trump, Elon Musk, Angela Merkel, etc. The news is alternative, but the people in it are real. If a real person is mentioned in the source news, keep their real name.
3. **Causality chain**: Each day's events follow logically from the world premise AND from previous alternative events provided in context
3. **COVID-19 never existed**: No SARS-CoV-2, no pandemic, no lockdowns, no mRNA vaccine revolution, no lab-leak debate. These simply never happened.
4. **Grounded in reality**: Use the real news of the day as a starting point, then diverge where the no-COVID premise changes things
5. **Butterfly effects**: Think through second- and third-order consequences. No pandemic means different elections, different economies, different cultural moments
6. **Journalistic tone**: Write like AP/Reuters — neutral, factual, with direct quotes. Each article: 4-6 paragraphs, 300-500 words
7. **Diverse coverage**: Mix categories — don't make every article about the same topic
8. **Write in English**`;

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
    [
      `## Task`,
      `Write 5–8 alternative news articles for ${formatDate(targetDate)}.`,
      `IMPORTANT: Each article must name specific real public figures (politicians, CEOs, celebrities, scientists) with realistic quotes and actions.`,
      `Make the articles feel like real journalism — vivid, concrete, human-centered. No generic abstractions.`,
    ].join("\n"),
  );

  return sections.join("\n\n---\n\n");
}

// ─── Generation ───────────────────────────────────────────────────────────────

export async function generateNewsForDay(
  input: BuildPromptInput,
): Promise<GeneratedDay> {
  const userMessage = buildUserMessage(input);

  // Streaming is required for max_tokens=64000 with adaptive thinking —
  // non-streaming requests time out on long generations.
  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: zodOutputFormat(GeneratedDaySchema),
    },
  });

  const finalMessage = await stream.finalMessage();

  const textBlock = finalMessage.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  if (!textBlock) {
    throw new Error(
      `Claude returned stop_reason="${finalMessage.stop_reason}" with no text content`,
    );
  }

  return GeneratedDaySchema.parse(JSON.parse(textBlock.text));
}
