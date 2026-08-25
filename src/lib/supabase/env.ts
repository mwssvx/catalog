import { ConfigError } from "@/lib/http/errors";

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function supabaseUrl(): string {
  const value = firstEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  if (!value) {
    throw new ConfigError("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  }
  if (!/^https?:\/\/.+\.supabase\.co\/?$/i.test(value)) {
    throw new ConfigError(
      "SUPABASE_URL must be a full https://xxxx.supabase.co URL (not a truncated placeholder)",
    );
  }
  return value.replace(/\/$/, "");
}

export function supabaseAnonKey(): string {
  const value = firstEnv("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!value) {
    throw new ConfigError(
      "Missing SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }
  if (value.startsWith("sb_publishable_")) {
    throw new ConfigError(
      "SUPABASE_ANON_KEY must be the legacy anon JWT (eyJ...), not a publishable key (sb_publishable_...)",
    );
  }
  if (value.length < 100) {
    throw new ConfigError(
      "SUPABASE_ANON_KEY looks truncated — paste the full legacy anon JWT from Supabase",
    );
  }
  return value;
}

export function supabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) throw new ConfigError("Missing SUPABASE_SERVICE_ROLE_KEY");
  return value;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    firstEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") &&
      firstEnv("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

export function publicShopSlug(): string {
  return process.env.PUBLIC_SHOP_SLUG?.trim() || "dordoi";
}
