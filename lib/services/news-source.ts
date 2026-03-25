import { db } from "@/lib/db";
import { generationDays, realWorldNews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

if (!process.env.GUARDIAN_API_KEY) {
  throw new Error("GUARDIAN_API_KEY is not set");
}

const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
const GUARDIAN_BASE_URL = "https://content.guardianapis.com";

const GUARDIAN_SECTIONS = [
  "world",
  "politics",
  "business",
  "technology",
  "science",
  "environment",
  "society",
] as const;

type GuardianSection = (typeof GUARDIAN_SECTIONS)[number];

interface GuardianFields {
  headline?: string;
  trailText?: string;
  bodyText?: string;
  sectionName?: string;
}

interface GuardianResult {
  id: string;
  webTitle: string;
  webUrl: string;
  sectionId: string;
  fields?: GuardianFields;
}

interface GuardianResponse {
  response: {
    status: string;
    results: GuardianResult[];
  };
}

export interface RealNewsItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchFromGuardian(date: Date): Promise<RealNewsItem[]> {
  const dateStr = formatDate(date);

  const params = new URLSearchParams({
    "from-date": dateStr,
    "to-date": dateStr,
    "page-size": "20",
    "show-fields": "headline,trailText,bodyText",
    section: GUARDIAN_SECTIONS.join("|"),
    "order-by": "relevance",
    "api-key": GUARDIAN_API_KEY,
  });

  const res = await fetch(`${GUARDIAN_BASE_URL}/search?${params}`);

  if (!res.ok) {
    throw new Error(
      `Guardian API error: ${res.status} ${res.statusText} for date ${dateStr}`,
    );
  }

  const data: GuardianResponse = await res.json();

  if (data.response.status !== "ok") {
    throw new Error(`Guardian API returned status: ${data.response.status}`);
  }

  return data.response.results.map((item) => ({
    title: item.fields?.headline ?? item.webTitle,
    summary: item.fields?.trailText ?? item.webTitle,
    source: "The Guardian",
    url: item.webUrl,
    category: item.sectionId as GuardianSection,
  }));
}

/**
 * Returns real-world news for the given date.
 * On first call — fetches from Guardian API and caches in DB.
 * On subsequent calls — returns cached records.
 */
export async function getRealNewsForDay(date: Date): Promise<RealNewsItem[]> {
  const dateStr = formatDate(date);

  // Find the generation day record
  const [day] = await db
    .select()
    .from(generationDays)
    .where(eq(generationDays.date, date))
    .limit(1);

  // If the day exists and already has cached real news — return from DB
  if (day && day.realNewsCount > 0) {
    const cached = await db
      .select()
      .from(realWorldNews)
      .where(eq(realWorldNews.dayId, day.id));

    if (cached.length > 0) {
      return cached.map((row) => ({
        title: row.title,
        summary: row.summary,
        source: row.source,
        url: row.url ?? "",
        category: row.category ?? "world",
      }));
    }
  }

  // Fetch from Guardian API
  const items = await fetchFromGuardian(date);

  if (items.length === 0) {
    console.warn(`No news found for ${dateStr} in Guardian API`);
    return [];
  }

  // Upsert the generation day if it doesn't exist yet
  let dayId: string;
  if (!day) {
    const [newDay] = await db
      .insert(generationDays)
      .values({ date, status: "pending" })
      .onConflictDoNothing()
      .returning();

    if (!newDay) {
      // Row was inserted by a concurrent request — fetch it
      const [existing] = await db
        .select()
        .from(generationDays)
        .where(eq(generationDays.date, date))
        .limit(1);
      dayId = existing.id;
    } else {
      dayId = newDay.id;
    }
  } else {
    dayId = day.id;
  }

  // Cache news in DB
  await db.insert(realWorldNews).values(
    items.map((item) => ({
      dayId,
      title: item.title,
      summary: item.summary,
      source: item.source,
      url: item.url,
      category: item.category,
    })),
  );

  // Update real news count on the day
  await db
    .update(generationDays)
    .set({ realNewsCount: items.length })
    .where(eq(generationDays.id, dayId));

  return items;
}

/**
 * Returns a compact text summary of real news for use in prompts.
 */
export function formatNewsForPrompt(items: RealNewsItem[]): string {
  return items
    .map(
      (item, i) =>
        `${i + 1}. [${item.category.toUpperCase()}] ${item.title}\n   ${item.summary}`,
    )
    .join("\n\n");
}
