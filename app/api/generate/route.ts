import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { generateDay, resolveNextDate } from "@/lib/services/generation";
import { CACHE_TAGS } from "@/lib/data/queries";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { date } = body as { date?: string };

  const targetDate = date ? new Date(date) : await resolveNextDate();

  if (isNaN(targetDate.getTime())) {
    return NextResponse.json(
      { error: `Invalid date: "${date}"` },
      { status: 400 },
    );
  }

  const result = await generateDay(targetDate);

  // Invalidate frontend cache so the new day appears immediately
  revalidateTag(CACHE_TAGS.days, 'max');
  revalidateTag(CACHE_TAGS.articles, 'max');

  return NextResponse.json({ result }, { status: 201 });
}
