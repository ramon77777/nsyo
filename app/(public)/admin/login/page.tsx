// app/(public)/admin/login/page.tsx
"use client";

import Container from "@/components/layout/Container";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type AuthErrorCode =
  | "not_authenticated"
  | "forbidden"
  | "auth"
  | "auth_failed"
  | "missing_code"
  | "invalid_credentials"
  | string;

function errorMessage(code: AuthErrorCode) {
  if (!code) return null;

  if (code === "not_authenticated") {
    return "Tu n’es pas connecté (session absente).";
  }
  if (code === "forbidden") {
    return "Accès refusé. Ton compte n’est pas autorisé pour l’admin.";
  }
  if (code === "invalid_credentials") {
    return "Email ou mot de passe incorrect.";
  }
  if (code === "auth" || code === "auth_failed") {
    return "Erreur de connexion Supabase. Réessaie.";
  }
  if (code === "missing_code") {
    return "Lien invalide.";
  }
  return "Erreur de connexion. Réessaie.";
}

export default function LoginPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const authError = (searchParams.get("error") ?? "") as AuthErrorCode;
  const explain = errorMessage(authError);

  // ✅ Si déjà connecté => /admin
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;

      const ok = !error && !!data.session;
      setHasSession(ok);

      if (ok) {
        router.replace("/admin");
        router.refresh();
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabase, router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setErr("Entre un email valide.");
      return;
    }
    if (!password.trim()) {
      setErr("Entre ton mot de passe.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: clean,
        password,
      });

      if (error) {
        // Message user-friendly
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("invalid login credentials")) {
          throw new Error("Email ou mot de passe incorrect.");
        }
        throw error;
      }

      // Redirige dashboard
      router.replace("/admin");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Impossible de se connecter.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setErr(null);

    try {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Impossible de se déconnecter.");
    }
  }

  return (
    <section className="py-16">
      <Container>
        <div className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Admin
              </div>

              {/* Utile si cookies/session incohérents */}
              {hasSession ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="text-xs font-semibold text-slate-600 hover:underline"
                  title="Déconnexion (utile si cookies/session incohérents)"
                >
                  Se déconnecter
                </button>
              ) : null}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              Connexion
            </h1>
            <p className="mt-2 text-slate-600">
              Connecte-toi avec ton email et mot de passe admin.
            </p>

            {explain ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {explain}
              </div>
            ) : null}

            <form onSubmit={signIn} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-900">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="admin@exemple.com"
                  className={cn(
                    "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition",
                    "border-slate-200 focus:border-slate-900"
                  )}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900">
                  Mot de passe
                </label>
                <div className="mt-2 flex items-stretch gap-2">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-sm outline-none transition",
                      "border-slate-200 focus:border-slate-900"
                    )}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    title={showPwd ? "Masquer" : "Afficher"}
                  >
                    {showPwd ? "Masquer" : "Afficher"}
                  </button>
                </div>
              </div>

              {err ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {err}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition",
                  "bg-slate-950 hover:opacity-90",
                  loading && "opacity-60 cursor-not-allowed"
                )}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>

              <a
                href="/"
                className="block text-center text-sm font-semibold text-slate-700 hover:underline"
              >
                Retour au site
              </a>
            </form>

            
          </div>
        </div>
      </Container>
    </section>
  );
}