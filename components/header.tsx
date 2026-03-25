import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

async function CurrentDate() {
  // connection() defers this component to request time (non-deterministic new Date())
  await connection();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return <span>{today}</span>;
}

export function Header() {
  return (
    <header className="bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
          <Suspense fallback={<span className="invisible">placeholder</span>}>
            <CurrentDate />
          </Suspense>
          <span className="tracking-widest font-semibold text-amber-700 uppercase">
            Alternative History Edition
          </span>
        </div>

        <Separator />

        {/* Masthead */}
        <div className="py-5 text-center">
          <Link href="/news">
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-none">
              The Alternative Times
            </h1>
          </Link>
          <p className="mt-1 text-xs text-muted-foreground tracking-widest uppercase">
            AI-Generated · Alternative History · Since 2019
          </p>
        </div>

        <Separator />

        {/* Nav */}
        <nav className="flex gap-6 py-2 text-sm font-medium">
          <Link
            href="/news"
            className="hover:text-foreground text-muted-foreground transition-colors"
          >
            Latest
          </Link>
          <Link
            href="/news?category=politics"
            className="hover:text-foreground text-muted-foreground transition-colors"
          >
            Politics
          </Link>
          <Link
            href="/news?category=business"
            className="hover:text-foreground text-muted-foreground transition-colors"
          >
            Business
          </Link>
          <Link
            href="/news?category=technology"
            className="hover:text-foreground text-muted-foreground transition-colors"
          >
            Technology
          </Link>
          <Link
            href="/news?category=science"
            className="hover:text-foreground text-muted-foreground transition-colors"
          >
            Science
          </Link>
          <Link
            href="/news?category=world"
            className="hover:text-foreground text-muted-foreground transition-colors"
          >
            World
          </Link>
        </nav>
      </div>
    </header>
  );
}
