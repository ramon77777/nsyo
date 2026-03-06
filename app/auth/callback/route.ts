import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";

  // pas de code => lien invalide / mauvais flow
  if (!code) {
    return NextResponse.redirect(
      new URL(`/admin/login?error=missing_code&next=${encodeURIComponent(next)}`, url.origin)
    );
  }

  // On prépare une réponse REDIRECT et on y écrira les cookies
  const response = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ on lit les cookies de la requête
        getAll() {
          return request.cookies.getAll();
        },
        // ✅ on écrit les cookies sur la réponse
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/login?error=auth_failed&next=${encodeURIComponent(next)}`, url.origin)
    );
  }

  return response;
}
