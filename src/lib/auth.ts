import { cookies } from "next/headers";

export const STUDIO_COOKIE = "catalog_studio";

export function studioPassword(): string {
  return process.env.STUDIO_PASSWORD || "studio";
}

export async function isStudioAuthed(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(STUDIO_COOKIE)?.value === "1";
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
