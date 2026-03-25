import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { worldContext } from "@/lib/db/schema";

export async function GET() {
  const ctx = await db
    .select()
    .from(worldContext)
    .where(eq(worldContext.isActive, true))
    .limit(1);

  if (!ctx[0]) {
    return NextResponse.json({ context: null }, { status: 200 });
  }

  return NextResponse.json({ context: ctx[0] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { premise, details } = body as { premise?: string; details?: string };

  if (!premise || !details) {
    return NextResponse.json(
      { error: "Both 'premise' and 'details' are required" },
      { status: 400 },
    );
  }

  // Deactivate all existing contexts
  await db
    .update(worldContext)
    .set({ isActive: false })
    .where(eq(worldContext.isActive, true));

  const [created] = await db
    .insert(worldContext)
    .values({ premise, details, isActive: true })
    .returning();

  return NextResponse.json({ context: created }, { status: 201 });
}
