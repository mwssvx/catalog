import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readCookies, writeCookies } from "../../../server/context";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export async function createClient(): Promise<SupabaseClient> {
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return readCookies();
      },
      setAll(cookiesToSet) {
        writeCookies(
          cookiesToSet.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            options: cookie.options as Parameters<typeof writeCookies>[0][number]["options"],
          })),
        );
      },
    },
  });
}
