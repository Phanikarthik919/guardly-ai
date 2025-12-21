/**
 * Public frontend configuration.
 *
 * Vite env vars should normally provide these, but in some preview/build contexts
 * they can be missing, which breaks Supabase initialization and causes a blank screen.
 *
 * These values are PUBLIC (URL + publishable key). Do not put any private keys here.
 */

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

// Fallbacks keep the app functional even if import.meta.env is not populated.
// (These are public values; the service role key must never be used on the client.)
const FALLBACK_SUPABASE_URL = "https://lzygdoxveftgcjkipkqy.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6eWdkb3h2ZWZ0Z2Nqa2lwa3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTM3MjAsImV4cCI6MjA4MTc2OTcyMH0.arOtBGtW7cFb_BVz-0u0WYofoN3128tBR7GOce7jxSs";

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? FALLBACK_SUPABASE_URL).trim();
  const publishableKey = String(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? FALLBACK_SUPABASE_PUBLISHABLE_KEY
  ).trim();

  return { url, publishableKey };
}
