import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryBadge } from "@/components/category-badge";
import { PosterImage } from "@/components/poster-image";
import { cn } from "@/lib/utils";
import { CardTitleWithTransition } from "./title-transition";

interface NewsCardProps {
  id: string;
  title: string;
  content: string;
  category: string;
  region: string | null;
  importance: number;
  imageUrl?: string | null;
  date?: Date;
  featured?: boolean;
}

export function NewsCard({
  id,
  title,
  content,
  category,
  region,
  importance,
  imageUrl,
  date,
  featured = false,
}: NewsCardProps) {
  const excerpt =
    content.length > 220 ? content.slice(0, 220).trimEnd() + "…" : content;

  const formattedDate = date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link href={`/news/${id}`} className="group block h-full" transitionTypes={["slide-in"]}>
      <Card
        className={cn(
          "h-full flex flex-col overflow-hidden transition-shadow hover:shadow-md cursor-pointer",
          featured && "ring-1 ring-amber-300",
          imageUrl ? "pt-0" : "pt-2",
        )}
      >
        {imageUrl && (
          <PosterImage
            articleId={id}
            src={imageUrl}
            alt={title}
            sizes={featured ? "100vw" : "(max-width: 640px) 100vw, 33vw"}
            className={cn(
              "relative w-full overflow-hidden shrink-0",
              featured ? "h-64 sm:h-80" : "h-44",
            )}
            imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
          >
            <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
          </PosterImage>
        )}

        <CardHeader className={cn(!imageUrl && "pt-4")}>
          <CategoryBadge
            category={category}
            region={region}
            importance={importance >= 8 ? importance : undefined}
          />
          
          <CardTitleWithTransition
            id={id}
            className={cn(
              "mt-2 leading-snug group-hover:text-primary/80 transition-colors",
              featured
                ? "font-heading text-xl font-bold"
                : "text-base font-semibold",
            )}
          >
            {title}
          </CardTitleWithTransition>
        </CardHeader>

        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {excerpt}
          </p>
        </CardContent>

        {formattedDate && (
          <CardFooter className="text-xs text-muted-foreground">
            {formattedDate}
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}
