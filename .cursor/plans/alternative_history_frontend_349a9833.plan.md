---
name: Alternative History Frontend
overview: "Добавить фронтенд на shadcn/ui + Tailwind v4: страница ленты новостей с фильтрацией и навигацией по дням, страница отдельной статьи. Данные берутся через Server Components напрямую из БД (Drizzle), без промежуточных fetch-запросов к API."
todos:
  - id: shadcn-init
    content: "Инициализировать shadcn/ui (npx shadcn@latest init), установить компоненты: card, badge, button, separator, skeleton, select, scroll-area"
    status: completed
  - id: layout-header
    content: Обновить app/layout.tsx (metadata, шрифт), создать components/header.tsx с навигацией, обновить app/page.tsx → редирект на /news
    status: completed
  - id: news-feed-page
    content: "Создать app/news/page.tsx — Server Component: лента статей выбранного дня с фильтром по категории"
    status: completed
  - id: article-page
    content: "Создать app/news/[id]/page.tsx — Server Component: полная статья с метаданными, generateMetadata, навигация назад"
    status: completed
  - id: shared-components
    content: Создать components/news-card.tsx, components/timeline-nav.tsx, components/category-badge.tsx
    status: completed
isProject: false
---

# Frontend — Alternative History News

## Технологии

- **shadcn/ui** — полная поддержка Tailwind v4 + React 19, установка через `npx shadcn@latest init`
- **Server Components** — данные читаются напрямую через `lib/db` (Drizzle), без клиентских fetch
- **Tailwind v4** — уже установлен (`@import "tailwindcss"` в globals.css)

## Структура страниц

```
app/
  layout.tsx              # обновить: metadata, шапка с навигацией
  page.tsx                # редирект на /news
  news/
    page.tsx              # лента новостей (последний день)
    [id]/
      page.tsx            # страница отдельной статьи
components/
  ui/                     # shadcn-компоненты (auto-generated)
  news-card.tsx           # карточка статьи в ленте
  timeline-nav.tsx        # боковая панель с историей дней
  category-badge.tsx      # бейдж категории + важности
  header.tsx              # шапка сайта
```

## Маршруты и данные

### `app/news/page.tsx`

Принимает search params: `?date=2019-01-01&category=politics`

Server Component — запрашивает:
1. Все дни (`generationDays`) для `TimelineNav`
2. Статьи за выбранный день (или последний completed) из `newsArticles`

```typescript
const [days, articles] = await Promise.all([
  db.select().from(generationDays).orderBy(asc(generationDays.date)),
  db.select().from(newsArticles)
    .where(eq(newsArticles.dayId, dayId))
    .orderBy(desc(newsArticles.importance)),
]);
```

### `app/news/[id]/page.tsx`

Server Component — получает статью по `id`, плюс день для отображения даты.
Генерирует статические метаданные через `generateMetadata`.

## Компоненты

### `components/header.tsx`

Шапка с названием проекта, навигацией и кнопкой поиска (ссылка на поиск).

### `components/news-card.tsx`

Использует shadcn `Card`. Отображает:
- Заголовок, первые ~200 символов контента
- `CategoryBadge` (категория + регион)
- Индикатор важности (1–10 → цветовой акцент)
- Дата

### `components/timeline-nav.tsx`

Вертикальный список дней. Использует shadcn `Badge` для статуса дня (`completed` / `pending` / `failed`). Активный день выделен. Прокрутка через `ScrollArea`.

### `components/category-badge.tsx`

shadcn `Badge` с вариантами по категории:

```typescript
const categoryColors: Record<string, string> = {
  politics: "bg-red-100 text-red-800",
  business: "bg-blue-100 text-blue-800",
  technology: "bg-purple-100 text-purple-800",
  science: "bg-green-100 text-green-800",
  ...
};
```

## Визуальный дизайн

Концепция — **альтернативная газета**:
- Фон `stone-50`, карточки белые с тенью
- Заголовок сайта в стиле газетной шапки (serif-шрифт, крупный)
- Статус "ALTERNATIVE HISTORY" как плашка рядом с датой
- Страница статьи: широкий контент по центру, типографика как в NYT/Guardian

## Макет ленты (`/news`)

```
┌─────────────────────────────────────────────┐
│  ALTERNATIVE HISTORY  │  January 1, 2019    │
├──────────┬──────────────────────────────────┤
│ Timeline │  [Category filter]               │
│          │                                  │
│ Jan 1  ● │  ┌──────────┐ ┌──────────┐      │
│ Jan 2  ● │  │ Card     │ │ Card     │      │
│ Jan 3  ○ │  └──────────┘ └──────────┘      │
│          │  ┌──────────┐ ┌──────────┐      │
│          │  │ Card     │ │ Card     │      │
└──────────┴──────────────────────────────────┘
```

## shadcn-компоненты для установки

- `card` — карточки статей
- `badge` — категории, статус дней
- `button` — навигация, фильтры
- `separator` — разделители
- `skeleton` — loading states (Suspense)
- `select` — фильтр по категории
- `scroll-area` — прокрутка timeline

## Команды установки

```bash
# Инициализация shadcn (определит Tailwind v4 автоматически)
npx shadcn@latest init

# Установка компонентов
npx shadcn@latest add card badge button separator skeleton select scroll-area
```
