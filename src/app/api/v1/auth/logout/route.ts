import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE } from "@/lib/auth";

export async function POST() {
  const jar = await cookies();
  jar.delete(STUDIO_COOKIE);
  return NextResponse.json({ ok: true });
}
