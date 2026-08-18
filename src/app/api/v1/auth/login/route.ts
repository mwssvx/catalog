import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STUDIO_COOKIE, studioPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  if ((body.password ?? "") !== studioPassword()) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(STUDIO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
