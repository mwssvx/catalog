import { Hono } from "hono";
import { cors } from "hono/cors";
import { runWithContext } from "./context";
import { registerV1Routes } from "./routes/v1";

const isProd = process.env.NODE_ENV === "production";
const webOrigin = process.env.WEB_ORIGIN || "http://127.0.0.1:5173";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: isProd
        ? webOrigin
        : [webOrigin, "http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
    }),
  );

  if (isProd) {
    app.use("*", async (c, next) => {
      await next();
      c.header("X-Content-Type-Options", "nosniff");
      c.header("Referrer-Policy", "strict-origin-when-cross-origin");
      c.header(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "media-src 'self' data: blob: https:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self' https://wa.me https://api.whatsapp.com",
        ].join("; "),
      );
    });
  }

  app.use("*", async (c, next) => {
    await runWithContext(c, next);
  });

  registerV1Routes(app);

  app.get("/api/health", (c) => c.json({ ok: true }));

  return app;
}

export const app = createApp();
