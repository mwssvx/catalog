import { NextResponse } from "next/server";
import { isStudioAuthed } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ ok: await isStudioAuthed() });
}
