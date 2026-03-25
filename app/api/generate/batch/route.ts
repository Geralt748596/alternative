import { NextRequest, NextResponse } from "next/server";
import { generateRange } from "@/lib/services/generation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { from, to } = body as { from?: string; to?: string };

  if (!from || !to) {
    return NextResponse.json(
      { error: "Both 'from' and 'to' date strings are required" },
      { status: 400 },
    );
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use ISO 8601 (e.g. 2019-01-01)" },
      { status: 400 },
    );
  }

  if (fromDate > toDate) {
    return NextResponse.json(
      { error: "'from' must be before or equal to 'to'" },
      { status: 400 },
    );
  }

  const diffDays =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;

  if (diffDays > 30) {
    return NextResponse.json(
      { error: "Batch range cannot exceed 30 days" },
      { status: 400 },
    );
  }

  const results = await generateRange(fromDate, toDate);

  return NextResponse.json({ results, total: results.length }, { status: 201 });
}
