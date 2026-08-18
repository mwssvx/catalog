import { NextResponse } from "next/server";
import { parseNotes } from "@/lib/catalog/parse";

export async function POST(request: Request) {
  const body = (await request.json()) as { notes?: string };
  return NextResponse.json({ parsed: parseNotes(body.notes ?? "") });
}
