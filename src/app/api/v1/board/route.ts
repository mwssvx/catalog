import { NextResponse } from "next/server";
import { isStudioAuthed, unauthorized } from "@/lib/auth";
import { getCatalog, saveBoard, undoLast } from "@/lib/catalog/store";
import type { BoardSnapshot } from "@/lib/catalog/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isStudioAuthed())) return unauthorized();
  const data = await getCatalog();
  return NextResponse.json({
    shop: data.shop,
    items: data.items,
    board: data.board,
    suggestions: data.suggestions,
    historyCount: data.history.length,
  });
}

export async function PUT(request: Request) {
  if (!(await isStudioAuthed())) return unauthorized();
  const body = (await request.json()) as { board?: BoardSnapshot };
  if (!body.board) {
    return NextResponse.json({ error: "Missing board" }, { status: 400 });
  }
  const board = await saveBoard(body.board);
  return NextResponse.json({ board });
}

export async function POST(request: Request) {
  if (!(await isStudioAuthed())) return unauthorized();
  const body = (await request.json()) as { action?: string };
  if (body.action === "undo") {
    const ok = await undoLast();
    const data = await getCatalog();
    return NextResponse.json({ ok, board: data.board, items: data.items });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
