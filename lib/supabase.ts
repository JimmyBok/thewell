import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const BUCKET = process.env.SUPABASE_BUCKET ?? 'uploads';

let cached: SupabaseClient<Database> | null = null;

/**
 * Server-side Supabase client using the service_role key.
 *
 * This key bypasses row level security, so it must never be imported into a
 * client component — the `server-only` import above makes that a build error.
 */
export function supabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached;

  cached = createClient<Database>(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  return cached;
}
