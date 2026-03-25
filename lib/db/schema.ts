import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const worldContext = pgTable("world_context", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  premise: text("premise").notNull(),
  details: text("details").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generationDays = pgTable(
  "generation_days",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    date: timestamp("date", { mode: "date" }).notNull(),
    status: text("status", {
      enum: ["pending", "generating", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    realNewsCount: integer("real_news_count").default(0).notNull(),
    genNewsCount: integer("gen_news_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [uniqueIndex("date_unique_idx").on(table.date)],
);

export const newsArticles = pgTable(
  "news_articles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    dayId: text("day_id")
      .notNull()
      .references(() => generationDays.id),
    title: text("title").notNull(),
    content: text("content").notNull(),
    category: text("category").notNull(),
    region: text("region"),
    importance: integer("importance").default(5).notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("news_day_id_idx").on(table.dayId),
    index("news_category_idx").on(table.category),
  ],
);

export const realWorldNews = pgTable(
  "real_world_news",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    dayId: text("day_id")
      .notNull()
      .references(() => generationDays.id),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    source: text("source").notNull(),
    url: text("url"),
    category: text("category"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [index("real_news_day_id_idx").on(table.dayId)],
);

// Relations

export const generationDaysRelations = relations(generationDays, ({ many }) => ({
  articles: many(newsArticles),
  realNews: many(realWorldNews),
}));

export const newsArticlesRelations = relations(newsArticles, ({ one }) => ({
  day: one(generationDays, {
    fields: [newsArticles.dayId],
    references: [generationDays.id],
  }),
}));

export const realWorldNewsRelations = relations(realWorldNews, ({ one }) => ({
  day: one(generationDays, {
    fields: [realWorldNews.dayId],
    references: [generationDays.id],
  }),
}));
