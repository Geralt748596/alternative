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

function randomEmbedding(): number[] {
  const vec = new Array(1536);
  for (let i = 0; i < 1536; i++) vec[i] = Math.random() * 2 - 1;
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / norm);
}

async function seed() {
  console.log("Seeding database...\n");

  // 1. World context
  const [ctx] = await db
    .insert(worldContext)
    .values({
      premise: "COVID-19 never happened",
      details: [
        "It is January 1, 2019. The SARS-CoV-2 virus never emerged.",
        "The world continues on its pre-pandemic trajectory:",
        "- Global economy grows steadily without lockdowns or supply chain disruptions",
        "- No mRNA vaccine revolution; biotech advances at normal pace",
        "- Remote work remains niche; office culture dominates",
        "- International travel and tourism continue uninterrupted",
        "- No massive fiscal stimulus packages or inflation spikes",
        "- WHO focuses on malaria, tuberculosis, and existing health crises",
        "- US-China trade tensions remain the dominant geopolitical story",
        "- Climate activism (Greta Thunberg) continues to build momentum",
        "- Brexit negotiations proceed as the main European concern",
      ].join("\n"),
      isActive: true,
    })
    .returning();
  console.log(`✓ WorldContext: "${ctx.premise}"`);

  // 2. Generation days (Jan 1-3, 2019)
  const days = await db
    .insert(generationDays)
    .values([
      {
        date: new Date("2019-01-01"),
        status: "completed" as const,
        realNewsCount: 5,
        genNewsCount: 3,
        completedAt: new Date(),
      },
      {
        date: new Date("2019-01-02"),
        status: "completed" as const,
        realNewsCount: 6,
        genNewsCount: 3,
        completedAt: new Date(),
      },
      {
        date: new Date("2019-01-03"),
        status: "pending" as const,
        realNewsCount: 0,
        genNewsCount: 0,
      },
    ])
    .returning();
  console.log(`✓ GenerationDays: ${days.map((d) => d.date.toISOString().slice(0, 10)).join(", ")}`);

  // 3. Real world news (cached from Guardian API)
  const realNews = await db
    .insert(realWorldNews)
    .values([
      {
        dayId: days[0].id,
        title: "New Year celebrations around the world",
        summary:
          "Millions gather in cities across the globe to ring in 2019 with fireworks displays and celebrations.",
        source: "The Guardian",
        url: "https://www.theguardian.com/world/2019/jan/01/new-year-celebrations",
        category: "world",
      },
      {
        dayId: days[0].id,
        title: "Brazil's Bolsonaro sworn in as president",
        summary:
          "Far-right leader Jair Bolsonaro takes office as Brazil's 38th president, promising economic reform and anti-corruption measures.",
        source: "The Guardian",
        url: "https://www.theguardian.com/world/2019/jan/01/bolsonaro-inauguration",
        category: "politics",
      },
      {
        dayId: days[0].id,
        title: "Apple warns of lower revenue amid China slowdown",
        summary:
          "Tim Cook issues rare revenue warning, citing weaker iPhone sales in China and economic deceleration.",
        source: "The Guardian",
        url: "https://www.theguardian.com/technology/2019/jan/01/apple-revenue-warning",
        category: "business",
      },
      {
        dayId: days[0].id,
        title: "US government shutdown enters day 11",
        summary:
          "The partial government shutdown over border wall funding continues with no resolution in sight.",
        source: "The Guardian",
        url: "https://www.theguardian.com/us-news/2019/jan/01/government-shutdown",
        category: "politics",
      },
      {
        dayId: days[0].id,
        title: "Elizabeth Warren launches presidential exploratory committee",
        summary:
          "Massachusetts senator becomes one of the first major Democrats to take steps toward a 2020 presidential bid.",
        source: "The Guardian",
        url: "https://www.theguardian.com/us-news/2019/jan/01/elizabeth-warren-2020",
        category: "politics",
      },
      {
        dayId: days[1].id,
        title: "China's Chang'e-4 makes historic landing on far side of the Moon",
        summary:
          "Chinese spacecraft becomes the first to land on the far side of the Moon, marking a major milestone in space exploration.",
        source: "The Guardian",
        url: "https://www.theguardian.com/science/2019/jan/02/chang-e-4-moon-landing",
        category: "science",
      },
      {
        dayId: days[1].id,
        title: "Democrats prepare to take control of the House",
        summary:
          "Nancy Pelosi set to become Speaker as Democrats take House majority, setting up confrontation with Trump.",
        source: "The Guardian",
        url: "https://www.theguardian.com/us-news/2019/jan/02/democrats-house",
        category: "politics",
      },
      {
        dayId: days[1].id,
        title: "Oil prices rise on hopes of OPEC production cuts",
        summary:
          "Crude oil rebounds after OPEC+ members begin implementing agreed production cuts to stabilize markets.",
        source: "The Guardian",
        url: "https://www.theguardian.com/business/2019/jan/02/oil-prices-opec",
        category: "business",
      },
    ])
    .returning();
  console.log(`✓ RealWorldNews: ${realNews.length} articles`);

  // 4. Generated alternative news articles (with dummy embeddings)
  const articles = await db
    .insert(newsArticles)
    .values([
      {
        dayId: days[0].id,
        title: "Global markets rally as 2019 opens with renewed trade optimism",
        content: [
          "Stock markets across the world opened 2019 on a high note as investors",
          "expressed cautious optimism about US-China trade negotiations. The S&P 500",
          "gained 1.2% in early trading, while the Shanghai Composite rose 0.8%.",
          "",
          "Analysts point to recent signals from both Washington and Beijing suggesting",
          "a willingness to reach a comprehensive trade deal in the first quarter.",
          '"The fundamentals remain strong," said Goldman Sachs chief economist Jan Hatzius.',
          '"Without external shocks, we expect steady growth through 2019."',
        ].join("\n"),
        category: "business",
        region: "global",
        importance: 7,
        embedding: randomEmbedding(),
      },
      {
        dayId: days[0].id,
        title: "Bolsonaro inauguration signals shift in South American politics",
        content: [
          "Jair Bolsonaro was sworn in as Brazil's president today, completing a",
          "dramatic rightward shift in Latin America's largest economy. In his inaugural",
          "address, Bolsonaro pledged to open Brazil's economy to foreign investment",
          "and crack down on corruption.",
          "",
          "In the alternative timeline, without pandemic disruptions, Bolsonaro's",
          "economic reforms proceed as planned, with privatization of state enterprises",
          "beginning in February 2019. Brazil's GDP growth is projected at 2.5% for the year.",
        ].join("\n"),
        category: "politics",
        region: "south-america",
        importance: 8,
        embedding: randomEmbedding(),
      },
      {
        dayId: days[0].id,
        title: "Apple's China warning rattles tech sector",
        content: [
          "Apple CEO Tim Cook's rare revenue warning sent ripples through the technology",
          "sector, highlighting the growing impact of the US-China trade war on American",
          "corporations. Apple shares fell 8% in after-hours trading.",
          "",
          "The warning underscores how the trade tensions — rather than any health crisis —",
          "remain the primary risk to global technology supply chains. Analysts expect",
          "Apple to accelerate its diversification efforts into India and Vietnam.",
        ].join("\n"),
        category: "technology",
        region: "US",
        importance: 7,
        embedding: randomEmbedding(),
      },
      {
        dayId: days[1].id,
        title: "Chang'e-4 Moon landing boosts China's space ambitions",
        content: [
          "China's Chang'e-4 spacecraft successfully landed on the far side of the Moon,",
          "a historic first that cements China's position as a leading space power. The",
          "lander touched down in the Von Kármán crater within the South Pole-Aitken basin.",
          "",
          "The achievement intensifies the new space race between the US, China, and private",
          "companies like SpaceX. NASA administrator Jim Bridenstine congratulated China",
          "while reaffirming the US commitment to return astronauts to the Moon by 2024.",
        ].join("\n"),
        category: "science",
        region: "Asia",
        importance: 9,
        embedding: randomEmbedding(),
      },
      {
        dayId: days[1].id,
        title: "Democrats take House with ambitious legislative agenda",
        content: [
          "Nancy Pelosi reclaimed the Speaker's gavel as Democrats took control of the",
          "House of Representatives, promising oversight of the Trump administration and",
          "a push for infrastructure spending, healthcare reform, and climate legislation.",
          "",
          "The new majority immediately faces the challenge of the ongoing government",
          "shutdown over border wall funding. Pelosi signaled no willingness to fund",
          "Trump's wall, setting the stage for a prolonged standoff.",
        ].join("\n"),
        category: "politics",
        region: "US",
        importance: 8,
        embedding: randomEmbedding(),
      },
      {
        dayId: days[1].id,
        title: "OPEC cuts lift oil above $50 as energy markets stabilize",
        content: [
          "Oil prices climbed above $50 per barrel as OPEC+ production cuts began to",
          "take effect. Brent crude rose 2.3% to $54.20, while WTI gained 1.8% to $47.50.",
          "",
          "Energy analysts project oil will trade in the $50-65 range through 2019,",
          "supported by OPEC discipline and steady global demand growth. The absence of",
          "any demand shocks means the energy sector enters 2019 on stable footing,",
          "with investment in new projects continuing at a moderate pace.",
        ].join("\n"),
        category: "business",
        region: "global",
        importance: 6,
        embedding: randomEmbedding(),
      },
    ])
    .returning();
  console.log(`✓ NewsArticles: ${articles.length} articles (with embeddings)`);

  console.log("\nSeed completed successfully!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
