---
name: Alternative History Backend
overview: "Backend для Next.js приложения альтернативной истории мира: Claude API для генерации новостей, PostgreSQL + pgvector для хранения и семантического поиска, The Guardian API как источник реальных новостей, Drizzle ORM с нативной поддержкой pgvector."
todos:
  - id: setup-drizzle
    content: Установить зависимости (drizzle-orm, drizzle-kit, pg, @anthropic-ai/sdk, openai), создать drizzle.config.ts, описать схему в lib/db/schema.ts с моделями (worldContext, generationDays, newsArticles, realWorldNews) включая vector(1536) колонку и HNSW индекс, сгенерировать миграции + кастомная миграция для CREATE EXTENSION vector
    status: completed
  - id: setup-clients
    content: "Создать синглтоны: lib/db/index.ts (Drizzle + pg pool), lib/claude.ts (Anthropic SDK), lib/openai.ts (OpenAI для embeddings)"
    status: completed
  - id: news-source-service
    content: Реализовать lib/services/news-source.ts — клиент The Guardian API с кэшированием в realWorldNews
    status: completed
  - id: vector-service
    content: Реализовать lib/services/vector.ts — генерация embeddings через OpenAI, типобезопасный similarity search через Drizzle cosineDistance()
    status: completed
  - id: prompt-builder
    content: Реализовать lib/services/prompt-builder.ts — конструктор промпта с system/context/RAG/real-news секциями, structured output schema
    status: completed
  - id: generation-service
    content: Реализовать lib/services/generation.ts — полный pipeline генерации дня (fetch -> RAG -> prompt -> Claude -> parse -> embed -> store)
    status: completed
  - id: api-routes
    content: "Создать API routes: POST /api/generate, POST /api/generate/batch, GET /api/news, GET /api/news/search, GET /api/timeline, GET+POST /api/context"
    status: completed
  - id: env-setup
    content: Создать .env.example с описанием всех переменных (DATABASE_URL, ANTHROPIC_API_KEY, OPENAI_API_KEY, GUARDIAN_API_KEY)
    status: completed
isProject: false
---

# Backend альтернативной истории мира

## Выбор технологий

- **LLM**: Claude API (`@anthropic-ai/sdk`) — модель `claude-opus-4-6` с adaptive thinking. Anthropic SDK уже описан в скилле проекта, TypeScript-нативный. Для этой задачи (креативная генерация с учётом контекста) Opus 4.6 с 200K контекстом оптимален.
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dims) — Anthropic не имеет своего embedding API; OpenAI embeddings самые распространённые, дешёвые ($0.02/1M токенов) и хорошо поддерживаются.
- **Vector Search**: pgvector расширение для PostgreSQL — всё в одной БД, без дополнительного сервиса. Drizzle имеет нативную поддержку: тип `vector()`, функции `cosineDistance()`, индексы HNSW/IVFFlat — всё типобезопасно, без raw SQL.
- **News Source**: The Guardian Open Platform API — бесплатный, отличный исторический архив, поддержка фильтрации по дате.
- **ORM**: Drizzle ORM + `pg` драйвер. Нативная поддержка pgvector, типобезопасный query builder, лёгкий и быстрый.

## Архитектура

```mermaid
flowchart TD
    subgraph trigger [Trigger]
        API_Manual["POST /api/generate"]
        API_Batch["POST /api/generate/batch"]
    end

    subgraph pipeline [Generation Pipeline]
        FetchNews["1. Fetch real news\n(Guardian API)"]
        RAG["2. RAG: vector search\nрелевантных past events"]
        BuildPrompt["3. Build prompt:\ncontext + past events +\nreal news"]
        CallClaude["4. Claude API\n(Opus 4.6, streaming)"]
        ParseArticles["5. Parse generated\narticles"]
        Embed["6. Generate embeddings\n(OpenAI)"]
        Store["7. Store articles +\nvectors in PostgreSQL"]
    end

    subgraph storage [PostgreSQL + pgvector]
        WorldCtx["WorldContext"]
        GenDay["GenerationDay"]
        Articles["NewsArticle\n(+ vector embedding)"]
        RealNews["RealWorldNews\n(cache)"]
    end

    subgraph readAPI [Read API]
        GetNews["GET /api/news"]
        Search["GET /api/news/search"]
        Timeline["GET /api/timeline"]
    end

    API_Manual --> FetchNews
    API_Batch --> FetchNews
    FetchNews --> RAG
    RAG --> BuildPrompt
    BuildPrompt --> CallClaude
    CallClaude --> ParseArticles
    ParseArticles --> Embed
    Embed --> Store

    Store --> Articles
    Store --> GenDay
    FetchNews --> RealNews

    Articles --> GetNews
    Articles --> Search
    GenDay --> Timeline
    WorldCtx --> BuildPrompt
```

## Структура файлов

```
app/
  api/
    generate/
      route.ts          # POST — генерация одного дня
      batch/route.ts    # POST — пакетная генерация
    news/
      route.ts          # GET — список новостей
      search/route.ts   # GET — семантический поиск
    timeline/
      route.ts          # GET — прогресс генерации
    context/
      route.ts          # GET/POST — управление мировым контекстом
lib/
  db/
    index.ts            # Drizzle client (pg pool + drizzle instance)
    schema.ts           # Drizzle schema (все таблицы + vector колонки + индексы)
  services/
    generation.ts       # Orchestrator: pipeline генерации дня
    news-source.ts      # The Guardian API client
    vector.ts           # Embedding generation + similarity search
    prompt-builder.ts   # Конструктор промптов для Claude
  claude.ts             # Anthropic SDK client singleton
  openai.ts             # OpenAI client (только для embeddings)
drizzle/
  migrations/           # Сгенерированные миграции + кастомная для CREATE EXTENSION vector
drizzle.config.ts       # Конфигурация drizzle-kit
```

## Схема базы данных (Drizzle ORM)

`lib/db/schema.ts`:

```typescript
import { pgTable, text, integer, boolean, timestamp, index, serial } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const worldContext = pgTable('world_context', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  premise: text('premise').notNull(),       // "COVID-19 никогда не наступил"
  details: text('details').notNull(),       // Развёрнутое описание мира
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const generationDays = pgTable('generation_days', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: timestamp('date').unique().notNull(),   // 2019-01-01, 2019-01-02...
  status: text('status').notNull().default('pending'), // pending | generating | completed | failed
  realNewsCount: integer('real_news_count').default(0),
  genNewsCount: integer('gen_news_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const newsArticles = pgTable('news_articles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  dayId: text('day_id').notNull().references(() => generationDays.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(),     // politics, economics, tech, science...
  region: text('region'),                   // US, EU, Asia...
  importance: integer('importance').default(5), // 1-10
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('embeddingIndex').using('hnsw', table.embedding.op('vector_cosine_ops')),
]);

export const realWorldNews = pgTable('real_world_news', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  dayId: text('day_id').notNull().references(() => generationDays.id),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  source: text('source').notNull(),
  url: text('url'),
  category: text('category'),
  fetchedAt: timestamp('fetched_at').defaultNow(),
});

// Relations
export const generationDaysRelations = relations(generationDays, ({ many }) => ({
  articles: many(newsArticles),
  realNews: many(realWorldNews),
}));

export const newsArticlesRelations = relations(newsArticles, ({ one }) => ({
  day: one(generationDays, { fields: [newsArticles.dayId], references: [generationDays.id] }),
}));

export const realWorldNewsRelations = relations(realWorldNews, ({ one }) => ({
  day: one(generationDays, { fields: [realWorldNews.dayId], references: [generationDays.id] }),
}));
```

Единственный ручной шаг — кастомная миграция для расширения (одна строка):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Всё остальное (vector колонка, HNSW индекс) генерируется автоматически из схемы.

## Ключевые компоненты

### 1. `lib/services/news-source.ts` — The Guardian API

- Эндпоинт: `https://content.guardianapis.com/search?from-date=YYYY-MM-DD&to-date=YYYY-MM-DD&page-size=20&show-fields=headline,trailText,body`
- Фильтрация по секциям (world, politics, business, technology, science)
- Кэширование в таблицу `RealWorldNews` чтобы не перезапрашивать

### 2. `lib/services/vector.ts` — Embeddings + RAG

- `generateEmbedding(text: string): Promise<number[]>` — вызов OpenAI `text-embedding-3-small`
- `findRelevantArticles(query: string, limit: number, beforeDate?: Date)` — типобезопасный similarity search через Drizzle:

```typescript
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { newsArticles } from '@/lib/db/schema';

const similarity = sql<number>`1 - (${cosineDistance(newsArticles.embedding, queryEmbedding)})`;

const results = await db
  .select({
    id: newsArticles.id,
    title: newsArticles.title,
    content: newsArticles.content,
    category: newsArticles.category,
    similarity,
  })
  .from(newsArticles)
  .where(and(
    gt(similarity, 0.5),
    beforeDate ? lt(newsArticles.createdAt, beforeDate) : undefined,
  ))
  .orderBy(desc(similarity))
  .limit(limit);
```

### 3. `lib/services/prompt-builder.ts` — Конструктор промпта

Структура промпта для Claude:

- **System**: роль альтернативного историка, формат вывода (JSON с массивом статей)
- **World context**: начальная посылка из `WorldContext`
- **Relevant past events** (RAG, top-10-15): краткие саммари самых релевантных прошлых событий
- **Real news of the day**: заголовки и саммари реальных новостей дня
- **Instructions**: сгенерировать 5-8 альтернативных новостей, учитывая контекст

Выход Claude парсится как JSON (structured output через `output_config.format`).

### 4. `lib/services/generation.ts` — Pipeline

```typescript
async function generateDay(targetDate: Date): Promise<void> {
  // 1. Создать/обновить GenerationDay (status: generating)
  // 2. Загрузить реальные новости через news-source
  // 3. Построить embedding запрос из реальных новостей
  // 4. RAG: найти релевантные прошлые альтернативные события
  // 5. Построить промпт через prompt-builder
  // 6. Вызвать Claude API (streaming)
  // 7. Парсить результат, создать NewsArticle записи
  // 8. Сгенерировать embeddings для каждой новой статьи
  // 9. Сохранить embeddings через Drizzle update (нативная поддержка vector)
  // 10. Обновить GenerationDay (status: completed)
}
```

### 5. API Routes

- **POST `/api/generate`** — `{ date?: string }` — генерирует следующий день (или указанную дату)
- **POST `/api/generate/batch`** — `{ from: string, to: string }` — последовательная генерация диапазона дат
- **GET `/api/news?date=&category=&page=&limit=`** — пагинированный список новостей
- **GET `/api/news/search?q=&limit=`** — семантический поиск по альтернативным новостям
- **GET `/api/timeline`** — список всех сгенерированных дней с метаданными
- **GET/POST `/api/context`** — чтение/установка мирового контекста

## Зависимости для установки

```bash
pnpm add drizzle-orm pg @anthropic-ai/sdk openai dotenv
pnpm add -D drizzle-kit @types/pg
```

## Переменные окружения (`.env`)

```
DATABASE_URL=postgresql://user:password@localhost:5432/alternative_history
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GUARDIAN_API_KEY=...
```
