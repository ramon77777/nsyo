// lib/supabase/server.ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * Server Components / loaders (READ-ONLY cookies).
 * IMPORTANT: ne JAMAIS écrire des cookies ici.
 */
export async function supabaseServerReadonly() {
  const cookieStore = await cookies();

  return createServerClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Interdit dans les Server Components -> NOOP
      },
    },
  });
}

/**
 * Server Actions / Route Handlers (cookies modifiables).
 */
export async function supabaseServerAction() {
  const cookieStore = await cookies();

  return createServerClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
