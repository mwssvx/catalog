import { NextResponse } from "next/server";
import { isStudioAuthed, unauthorized } from "@/lib/auth";
import { createItem, listItems } from "@/lib/catalog/store";
import type { Category, ItemFilters, Status } from "@/lib/catalog/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters: ItemFilters = {
    status: (url.searchParams.get("status") as ItemFilters["status"]) || "all",
    category:
      (url.searchParams.get("category") as ItemFilters["category"]) || "all",
    size: url.searchParams.get("size") || "all",
    q: url.searchParams.get("q") || undefined,
    collection: url.searchParams.get("collection") || undefined,
    published:
      url.searchParams.get("published") === "false"
        ? undefined
        : url.searchParams.get("published") === "all"
          ? undefined
          : true,
  };
  const items = await listItems(filters);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  if (!(await isStudioAuthed())) return unauthorized();

  const body = (await request.json()) as {
    title?: string;
    notes?: string;
    price?: number | null;
    sizes?: string[];
    quantity?: number | null;
    material?: string | null;
    category?: Category | null;
    condition?: string | null;
    status?: Status;
    photos?: string[];
    published?: boolean;
  };

  const item = await createItem({
    title: body.title,
    notes: body.notes,
    price: body.price,
    sizes: body.sizes,
    quantity: body.quantity,
    material: body.material,
    category: body.category,
    condition: body.condition as never,
    status: body.status,
    photos: body.photos,
    published: body.published,
  });

  return NextResponse.json({ item }, { status: 201 });
}
