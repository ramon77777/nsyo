// app/admin/business-units/_components/BusinessUnitForm.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type Defaults = {
  title?: string;
  slug?: string;
  summary?: string | null;
  order_index?: number;
};

type ActionResult = { ok: true } | { ok: false; message: string };

// ✅ IMPORTANT: ne pas catcher les redirect Next
function isNextRedirectError(e: unknown) {
  const anyE = e as any;
  return typeof anyE?.digest === "string" && anyE.digest.startsWith("NEXT_REDIRECT");
}

export default function BusinessUnitForm({
  mode,
  defaults,
  submitAction,
}: {
  mode: "create" | "edit";
  defaults?: Defaults;
  submitAction: (fd: FormData) => Promise<ActionResult | void>;
}) {
  const sp = useSearchParams();
  const initialError = useMemo(() => sp.get("error"), [sp]);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    initialError ? decodeURIComponent(initialError) : null
  );

  const [title, setTitle] = useState(defaults?.title ?? "");
  const [slug, setSlug] = useState(defaults?.slug ?? "");
  const [summary, setSummary] = useState(defaults?.summary ?? "");
  const [order, setOrder] = useState<number>(defaults?.order_index ?? 0);

  // slug auto tant que l'utilisateur ne l'a pas modifié manuellement
  const [slugTouched, setSlugTouched] = useState<boolean>(
    !!(defaults?.slug ?? "").trim()
  );

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  return (
    <form
      action={(fd) => {
        setError(null);

        startTransition(async () => {
          try {
            const res = await submitAction(fd);

            // ✅ si l'action renvoie { ok:false }, on affiche
            if (res && typeof res === "object" && "ok" in res && res.ok === false) {
              setError(res.message);
              return;
            }

            // ✅ si redirect() a été appelé côté serveur,
            // Next va naviguer tout seul (NE PAS catcher)
          } catch (e: any) {
            if (isNextRedirectError(e)) throw e; // ✅ laisse Next naviguer
            setError(e?.message ?? "Erreur lors de l’enregistrement.");
          }
        });
      }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-busy={isPending}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {mode === "create" ? "Créer un pôle" : "Modifier le pôle"}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Titre + slug (auto), résumé, ordre d’affichage.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSlugTouched(false);
              setSlug(slugify(title));
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Reset slug
          </button>

          <button
            type="submit"
            disabled={isPending}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition",
              "bg-slate-950 hover:opacity-90",
              isPending && "opacity-60 cursor-not-allowed"
            )}
          >
            {isPending ? "Enregistrement..." : mode === "edit" ? "Mettre à jour" : "Enregistrer"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-900">Titre *</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: BTP • Construction"
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-900">
            Slug <span className="text-slate-500">({slugTouched ? "manuel" : "auto"})</span>
          </span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="btp-construction"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono"
          />
          <div className="text-xs text-slate-500">
            URL publique: <span className="font-mono">/poles/{slug || "..."}</span>
          </div>
        </label>

        <label className="grid gap-2 text-sm lg:col-span-2">
          <span className="font-semibold text-slate-900">Résumé</span>
          <textarea
            name="summary"
            value={summary ?? ""}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="Texte court visible sur la page du pôle…"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-900">Ordre</span>
          <input
            name="order_index"
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="text-xs text-slate-500">
            Plus petit = plus haut dans la liste.
          </div>
        </label>

        <div className="hidden lg:block" />
      </div>
    </form>
  );
}
