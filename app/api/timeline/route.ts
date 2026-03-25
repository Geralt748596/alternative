import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { generationDays } from "@/lib/db/schema";

export async function GET() {
  const days = await db
    .select({
      id: generationDays.id,
      date: generationDays.date,
      status: generationDays.status,
      realNewsCount: generationDays.realNewsCount,
      genNewsCount: generationDays.genNewsCount,
      createdAt: generationDays.createdAt,
      completedAt: generationDays.completedAt,
    })
    .from(generationDays)
    .orderBy(asc(generationDays.date));

  return NextResponse.json({ days, total: days.length });
}
