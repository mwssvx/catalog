import { NextResponse } from "next/server";
import { getShop } from "@/lib/catalog/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const shop = await getShop();
  return NextResponse.json({ shop });
}
