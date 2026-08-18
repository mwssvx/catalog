import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai/config";
import { runBoardAgent } from "@/lib/ai/agent";
import { isStudioAuthed, unauthorized } from "@/lib/auth";
import { mutateAsync } from "@/lib/catalog/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isStudioAuthed())) return unauthorized();
  return NextResponse.json({ configured: isAiConfigured() });
}

export async function POST(request: Request) {
  if (!(await isStudioAuthed())) return unauthorized();

  const body = (await request.json()) as {
    message?: string;
    selectedElementIds?: string[];
    locale?: string;
    confirmDelete?: boolean;
  };

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const destructive =
    /удал|өчүр|delete|remove all|стереть/i.test(message) &&
    /все|баары|all|100|много/i.test(message);
  if (destructive && !body.confirmDelete) {
    return NextResponse.json({
      needsConfirm: true,
      reply:
        body.locale === "ky"
          ? "Бул көп буюмду өчүрөт. Дагы бир жолу ырастаңыз."
          : "Это удалит много вещей. Подтвердите ещё раз.",
    });
  }

  try {
    const result = await mutateAsync(async (data) => {
      return runBoardAgent({
        data,
        message,
        selectedElementIds: body.selectedElementIds ?? [],
        locale: body.locale ?? "ru",
      });
    }, `AI: ${message.slice(0, 80)}`);

    const catalog = await (await import("@/lib/catalog/store")).getCatalog();
    return NextResponse.json({
      configured: isAiConfigured(),
      reply: result.reply,
      highlighted: result.highlighted,
      board: catalog.board,
      items: catalog.items,
      suggestions: catalog.suggestions,
    });
  } catch (error) {
    const text = error instanceof Error ? error.message : "AI failed";
    return NextResponse.json(
      {
        configured: isAiConfigured(),
        error: text,
        reply: text,
      },
      { status: 500 },
    );
  }
}
