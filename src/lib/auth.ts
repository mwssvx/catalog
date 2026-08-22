import { AuthError, ForbiddenError } from "@/lib/http/errors";
import type { Viewer } from "@/lib/catalog/access";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("shop_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "owner" || !profile.shop_id) return null;

  return {
    userId: user.id,
    shopId: profile.shop_id as string,
    email: user.email ?? "",
  };
}

export async function requireOwner(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AuthError();
  return viewer;
}

export async function requireOwnerOf(shopId: string): Promise<Viewer> {
  const viewer = await requireOwner();
  if (viewer.shopId !== shopId) throw new ForbiddenError();
  return viewer;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
