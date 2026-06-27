import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components / the browser.
 * Reads the public URL + anon key from environment variables.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
