import { NextResponse } from "next/server";
import { isStudioAuthed, unauthorized } from "@/lib/auth";
import { deleteItem, getItem, updateItem } from "@/lib/catalog/store";
import type { ItemInput } from "@/lib/catalog/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const item = await getItem(id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isStudioAuthed())) return unauthorized();
  const { id } = await context.params;
  const body = (await request.json()) as ItemInput;
  const item = await updateItem(id, body);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isStudioAuthed())) return unauthorized();
  const { id } = await context.params;
  const ok = await deleteItem(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
