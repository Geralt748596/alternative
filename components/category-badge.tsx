import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, string> = {
  politics:
    "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300",
  business:
    "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300",
  technology:
    "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300",
  science:
    "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300",
  environment:
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300",
  society:
    "bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300",
  world:
    "bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300",
};

const IMPORTANCE_LABEL: Record<number, { label: string; className: string }> = {
  10: { label: "Breaking", className: "bg-red-600 text-white hover:bg-red-600" },
  9: { label: "Top Story", className: "bg-red-500 text-white hover:bg-red-500" },
  8: { label: "Major", className: "bg-amber-500 text-white hover:bg-amber-500" },
};

interface CategoryBadgeProps {
  category: string;
  region?: string | null;
  importance?: number;
  className?: string;
}

export function CategoryBadge({
  category,
  region,
  importance,
  className,
}: CategoryBadgeProps) {
  const categoryStyle =
    CATEGORY_STYLES[category] ??
    "bg-stone-100 text-stone-700 hover:bg-stone-100";

  const importanceInfo =
    importance !== undefined ? IMPORTANCE_LABEL[importance] : undefined;

  return (
    <div className={cn("flex flex-wrap gap-1.5 items-center", className)}>
      {importanceInfo && (
        <Badge className={cn("text-xs font-semibold", importanceInfo.className)}>
          {importanceInfo.label}
        </Badge>
      )}
      <Badge className={cn("text-xs capitalize font-medium", categoryStyle)}>
        {category}
      </Badge>
      {region && (
        <Badge
          variant="outline"
          className="text-xs text-muted-foreground font-normal"
        >
          {region}
        </Badge>
      )}
    </div>
  );
}
