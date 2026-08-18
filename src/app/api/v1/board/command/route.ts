import { NextResponse } from "next/server";
import {
  applyMaterial,
  applyPrice,
  applySizes,
  cardsFromMedia,
  createSection,
  publishProducts,
} from "@/lib/ai/actions";
import { isStudioAuthed, unauthorized } from "@/lib/auth";
import { mutateAsync } from "@/lib/catalog/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isStudioAuthed())) return unauthorized();
  const body = (await request.json()) as {
    command?: string;
    elementIds?: string[];
    productIds?: string[];
    title?: string;
    price?: number;
    sizes?: string[];
    material?: string;
    published?: boolean;
    requireComplete?: boolean;
  };

  const label = `Board: ${body.command ?? "edit"}`;
  const result = await mutateAsync((data) => {
    switch (body.command) {
      case "cards":
        return cardsFromMedia(data, body.elementIds ?? []);
      case "section":
        return createSection(data, body.title || "Раздел", body.elementIds ?? []);
      case "price":
        return applyPrice(data, body.productIds ?? [], Number(body.price));
      case "sizes":
        return applySizes(data, body.productIds ?? [], body.sizes ?? []);
      case "material":
        return applyMaterial(data, body.productIds ?? [], body.material ?? "");
      case "publish":
        return publishProducts(
          data,
          body.productIds ?? [],
          body.published !== false,
          Boolean(body.requireComplete),
        );
      case "delete": {
        const ids = new Set(body.productIds ?? []);
        const elementIds = new Set(body.elementIds ?? []);
        if (ids.size + elementIds.size > 8) {
          return { ok: false, summary: "confirm" };
        }
        data.items = data.items.filter((item) => !ids.has(item.id));
        data.board.elements = data.board.elements.filter(
          (element) =>
            !elementIds.has(element.id) &&
            !(element.productId && ids.has(element.productId)),
        );
        return { ok: true, summary: "Deleted." };
      }
      default:
        return { ok: false, summary: "Unknown command" };
    }
  }, label);

  const { getCatalog } = await import("@/lib/catalog/store");
  const catalog = await getCatalog();
  return NextResponse.json({
    ...result,
    board: catalog.board,
    items: catalog.items,
    suggestions: catalog.suggestions,
  });
}
