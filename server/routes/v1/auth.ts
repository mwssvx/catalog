import type { Hono } from "hono";
import { loginSchema } from "@/lib/catalog/schemas";
import { getViewer } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http/respond";
import { createClient } from "@/lib/supabase/server";

export function registerAuthRoutes(app: Hono) {
  app.post("/api/v1/auth/login", async (c) => {
    try {
      const body = loginSchema.parse(await readJson(c.req.raw));
      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (error) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (!profile || profile.role !== "owner") {
        await supabase.auth.signOut();
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      return Response.json({ ok: true });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.post("/api/v1/auth/logout", async (c) => {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
      return Response.json({ ok: true });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.get("/api/v1/auth/me", async (c) => {
    try {
      const viewer = await getViewer();
      return Response.json({
        ok: Boolean(viewer),
        email: viewer?.email ?? null,
      });
    } catch (error) {
      return jsonError(error);
    }
  });
}
