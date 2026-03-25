import { NextRequest, NextResponse } from "next/server";
import { generateDay, resolveNextDate } from "@/lib/services/generation";

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

  return NextResponse.json({ result }, { status: 201 });
}
