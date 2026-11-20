import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// The browser's Supabase client (DN-13 §4.3), used for Auth only: the webapp's tables are closed to it (RLS with no policy
// and no grant), and every read goes through the API. @supabase/ssr keeps the session in cookies of the front's own domain
// and refreshes it on its own. Built lazily, so nothing connects until a page signs someone in, and only from the two
// public variables: the URL and the publishable key (sb_publishable_...). A server key never belongs here.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set. Copy .env.example to .env.local and " +
        "fill them in with the Supabase project's URL and publishable key.",
    );
  }
  client = createBrowserClient(url, publishableKey);
  return client;
}
