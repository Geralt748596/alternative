"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DayStatus = "pending" | "generating" | "completed" | "failed";

interface TimelineDay {
  id: string;
  date: Date;
  status: DayStatus;
  genNewsCount: number;
}

interface TimelineNavProps {
  days: TimelineDay[];
  activeDayId?: string;
}

const STATUS_BADGE: Record<
  DayStatus,
  { label: string; className: string }
> = {
  completed: {
    label: "✓",
    className: "bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5 py-0",
  },
  generating: {
    label: "…",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-1.5 py-0 animate-pulse",
  },
  pending: {
    label: "○",
    className: "bg-stone-100 text-stone-500 hover:bg-stone-100 text-[10px] px-1.5 py-0",
  },
  failed: {
    label: "✗",
    className: "bg-red-100 text-red-600 hover:bg-red-100 text-[10px] px-1.5 py-0",
  },
};

function formatTimelineDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TimelineNav({ days, activeDayId }: TimelineNavProps) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  if (days.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No days generated yet.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="flex flex-col gap-0.5 pr-2">
        {[...days].reverse().map((day) => {
          const isActive = day.id === activeDayId;
          const status = STATUS_BADGE[day.status];
          const href =
            day.status === "completed"
              ? `/news?date=${day.date instanceof Date ? day.date.toISOString().slice(0, 10) : day.date}${activeCategory ? `&category=${activeCategory}` : ""}`
              : "#";

          return (
            <Link
              key={day.id}
              href={href}
              aria-disabled={day.status !== "completed"}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : day.status === "completed"
                    ? "hover:bg-muted text-foreground"
                    : "text-muted-foreground cursor-default",
              )}
            >
              <span className="font-medium tabular-nums">
                {formatTimelineDate(day.date)}
              </span>
              <Badge className={status.className}>{status.label}</Badge>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
