import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  worldContext,
  generationDays,
  newsArticles,
  realWorldNews,
} from "../lib/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function reset() {
  console.log("Resetting database...\n");

  const deletedArticles = await db.delete(newsArticles).returning({ id: newsArticles.id });
  console.log(`✓ Deleted ${deletedArticles.length} news articles`);

  const deletedRealNews = await db.delete(realWorldNews).returning({ id: realWorldNews.id });
  console.log(`✓ Deleted ${deletedRealNews.length} real world news`);

  const deletedDays = await db.delete(generationDays).returning({ id: generationDays.id });
  console.log(`✓ Deleted ${deletedDays.length} generation days`);

  const deletedCtx = await db.delete(worldContext).returning({ id: worldContext.id });
  console.log(`✓ Deleted ${deletedCtx.length} world context entries`);

  const startDate = yesterday();

  const [ctx] = await db
    .insert(worldContext)
    .values({
      premise: "COVID-19 never happened",
      details: [
        `Generation begins on ${startDate}. The SARS-CoV-2 virus never emerged.`,
        "The world continued on its pre-pandemic trajectory from 2019 onward:",
        "",
        "Key divergences:",
        "- No global lockdowns ever occurred; economies grew uninterrupted 2019–present",
        "- Remote work never became mainstream; open offices and business travel dominate",
        "- No mRNA vaccine revolution; Moderna remained a small biotech startup",
        "- International tourism and aviation never collapsed; airlines never needed bailouts",
        "- No massive fiscal stimulus (no PPP loans, no stimulus checks in the US)",
        "- Inflation stayed at 1.5–2.5% range; central banks never printed trillions",
        "- Supply chains were never disrupted; no chip shortage, no container crisis",
        "- No 'Great Resignation'; labor markets followed pre-2020 trends",
        "- Zoom, Teams remained niche; WeWork continued its original expansion",
        "- No lab-leak debate, no anti-vax movement surge, no mask mandates",
        "- TikTok grew more slowly without lockdown boredom driving adoption",
        "- 2020 Tokyo Olympics happened on schedule; no sports bubble era",
        "",
        "Political consequences:",
        "- Trump's presidency was evaluated on economy and trade, not pandemic response",
        "- Biden's 2020 campaign had a very different focus without pandemic messaging",
        "- EU never created the Recovery Fund; European integration followed a different path",
        "- China's international reputation was never damaged by virus origin debates",
        "",
        "Everything else happened as in real life unless directly caused by COVID-19.",
      ].join("\n"),
      isActive: true,
    })
    .returning();

  console.log(`\n✓ World context: "${ctx.premise}"`);
  console.log(`  Starting from: ${startDate}`);
  console.log("\nDatabase reset complete. Ready for generation.");
  console.log("\nNext steps:");
  console.log("  curl -X POST http://localhost:3000/api/generate");
  console.log("    (auto-starts from yesterday)");

  await pool.end();
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  pool.end();
  process.exit(1);
});
