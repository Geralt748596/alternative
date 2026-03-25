import { Suspense } from "react";
import { NewsCard } from "@/components/news-card";
import { TimelineNav } from "@/components/timeline-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  getAllDays,
  getLatestCompletedDay,
  getDayByDate,
  getArticlesForDay,
} from "@/lib/data/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Latest News — The Alternative Times",
};

interface NewsPageProps {
  searchParams: Promise<{ date?: string; category?: string }>;
}

const CATEGORIES = [
  "politics",
  "business",
  "technology",
  "science",
  "environment",
  "society",
  "world",
] as const;

// Static shell — passes searchParams into the Suspense boundary.
export default function NewsPage({ searchParams }: NewsPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex gap-8">
        {/* Sidebar skeleton is static; real sidebar streams in with the content */}
        <aside className="hidden lg:block w-52 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Timeline
          </p>
          <Suspense fallback={<TimelineNavSkeleton />}>
            <NewsContent searchParams={searchParams} />
          </Suspense>
        </aside>

        {/* Main content streams inside the same Suspense boundary */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<NewsContentSkeleton />}>
            <NewsMainContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// ─── Dynamic content components ───────────────────────────────────────────────
// Both await searchParams inside a Suspense boundary.

async function NewsContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; category?: string }>;
}) {
  const { date: dateParam } = await searchParams;

  const [allDays, activeDay] = await Promise.all([
    getAllDays(),
    dateParam ? getDayByDate(dateParam) : getLatestCompletedDay(),
  ]);

  return (
    <TimelineNav
      days={allDays.map((d) => ({ ...d, date: new Date(d.date) }))}
      activeDayId={activeDay?.id}
    />
  );
}

async function NewsMainContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; category?: string }>;
}) {
  const { date: dateParam, category } = await searchParams;

  const activeDay = await (dateParam
    ? getDayByDate(dateParam)
    : getLatestCompletedDay());

  const articles = activeDay
    ? await getArticlesForDay(activeDay.id, category)
    : [];

  const activeDateLabel = activeDay?.date
    ? new Date(activeDay.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const [featured, ...rest] = articles;

  return (
    <>
      {/* Date header + category filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          {activeDateLabel ? (
            <>
              <Badge
                variant="outline"
                className="text-amber-700 border-amber-300 bg-amber-50 mb-1"
              >
                Alternative History
              </Badge>
              <h2 className="font-heading text-2xl font-bold leading-tight">
                {activeDateLabel}
              </h2>
            </>
          ) : (
            <h2 className="font-heading text-2xl font-bold text-muted-foreground">
              No generated days yet
            </h2>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <CategoryFilterLink href="/news" active={!category} label="All" />
          {CATEGORIES.map((cat) => (
            <CategoryFilterLink
              key={cat}
              href={`/news${activeDay?.date ? `?date=${new Date(activeDay.date).toISOString().slice(0, 10)}&category=${cat}` : `?category=${cat}`}`}
              active={category === cat}
              label={cat}
            />
          ))}
        </div>
      </div>

      <Separator className="mb-6" />

      {articles.length === 0 ? (
        <EmptyState hasDay={!!activeDay} />
      ) : (
        <div className="space-y-6">
          {featured && (
            <NewsCard
              {...featured}
              date={new Date(activeDay!.date)}
              featured
            />
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {rest.map((article) => (
                <NewsCard
                  key={article.id}
                  {...article}
                  date={new Date(activeDay!.date)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Static sub-components ────────────────────────────────────────────────────

function CategoryFilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </a>
  );
}

function EmptyState({ hasDay }: { hasDay: boolean }) {
  return (
    <div className="text-center py-24 text-muted-foreground">
      <p className="text-4xl mb-4">📰</p>
      {hasDay ? (
        <>
          <p className="font-medium">No articles found for this filter.</p>
          <p className="text-sm mt-1">Try removing the category filter.</p>
        </>
      ) : (
        <>
          <p className="font-medium">No news generated yet.</p>
          <p className="text-sm mt-1">
            Use{" "}
            <code className="bg-muted px-1 rounded text-xs">
              POST /api/context
            </code>{" "}
            then{" "}
            <code className="bg-muted px-1 rounded text-xs">
              POST /api/generate
            </code>{" "}
            to create your first alternative day.
          </p>
        </>
      )}
    </div>
  );
}

function TimelineNavSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-md" />
      ))}
    </div>
  );
}

function NewsContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-56 w-full rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
