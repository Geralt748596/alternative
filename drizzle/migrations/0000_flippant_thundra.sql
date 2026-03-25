CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "generation_days" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"real_news_count" integer DEFAULT 0 NOT NULL,
	"gen_news_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"day_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"region" text,
	"importance" integer DEFAULT 5 NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "real_world_news" (
	"id" text PRIMARY KEY NOT NULL,
	"day_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"source" text NOT NULL,
	"url" text,
	"category" text,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_context" (
	"id" text PRIMARY KEY NOT NULL,
	"premise" text NOT NULL,
	"details" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_day_id_generation_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."generation_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "real_world_news" ADD CONSTRAINT "real_world_news_day_id_generation_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."generation_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "date_unique_idx" ON "generation_days" USING btree ("date");--> statement-breakpoint
CREATE INDEX "embedding_idx" ON "news_articles" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "news_day_id_idx" ON "news_articles" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "news_category_idx" ON "news_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "real_news_day_id_idx" ON "real_world_news" USING btree ("day_id");