// app/admin/projects/_components/ProjectsFiltersClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type BusinessUnitMini = { id: string; title: string };

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Props = {
  businessUnits: BusinessUnitMini[];
  categories: string[];

  initialQ: string | null;
  initialBu: string | null;
  initialFeatured: "1" | "0" | null;
  initialCat: string | null;

  resultsCount: number;
  debounceMs?: number;
};

export default function ProjectsFiltersClient({
  businessUnits,
  categories,
  initialQ,
  initialBu,
  initialFeatured,
  initialCat,
  resultsCount,
  debounceMs = 350,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(initialQ ?? "");
  const [bu, setBu] = useState(initialBu ?? "");
  const [featured, setFeatured] = useState(initialFeatured ?? "");
  const [cat, setCat] = useState(initialCat ?? "");

  // Keep local state in sync if user navigates back/forward or links change params
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setBu(sp.get("bu") ?? "");
    setFeatured(sp.get("featured") ?? "");
    setCat(sp.get("cat") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const buildQueryString = useMemo(() => {
    return (next: { q?: string; bu?: string; featured?: string; cat?: string }) => {
      const usp = new URLSearchParams();

      const qv = (next.q ?? "").trim();
      const buv = (next.bu ?? "").trim();
      const fv = (next.featured ?? "").trim();
      const cv = (next.cat ?? "").trim();

      if (qv) usp.set("q", qv);
      if (buv) usp.set("bu", buv);
      if (fv) usp.set("featured", fv);
      if (cv) usp.set("cat", cv);

      const s = usp.toString();
      return s ? `?${s}` : "";
    };
  }, []);

  function apply(next: { q?: string; bu?: string; featured?: string; cat?: string }) {
    const qs = buildQueryString(next);
    startTransition(() => {
      // replace => pas de spam dans l'historique pendant la saisie
      router.replace(`${pathname}${qs}`);
    });
  }

  // Debounce for q typing
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      apply({ q, bu, featured, cat });
    }, debounceMs);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Immediate apply for selects (no debounce)
  useEffect(() => {
    apply({ q, bu, featured, cat });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bu, featured, cat]);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <form
        className="grid gap-3 md:grid-cols-12"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q, bu, featured, cat });
        }}
      >
        <div className="md:col-span-5">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-900">Recherche</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Titre, slug, lieu, catégorie…"
              className={cn(
                "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm",
                isPending && "opacity-80"
              )}
            />
            <div className="text-xs text-slate-500">
              Filtrage automatique pendant la saisie.
            </div>
          </label>
        </div>

        <div className="md:col-span-3">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-900">Pôle</span>
            <select
              value={bu}
              onChange={(e) => setBu(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Tous</option>
              {businessUnits.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-900">Featured</span>
            <select
              value={featured}
              onChange={(e) => setFeatured(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Tous</option>
              <option value="1">Oui</option>
              <option value="0">Non</option>
            </select>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-900">Catégorie</span>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="md:col-span-12 flex flex-wrap items-center gap-2 pt-2">
          <button
            type="submit"
            className={cn(
              "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90",
              isPending && "opacity-70 cursor-wait"
            )}
          >
            {isPending ? "Filtrage..." : "Filtrer"}
          </button>

          <Link
            href="/admin/projects"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Réinitialiser
          </Link>

          <div className="ml-auto text-sm text-slate-600">
            {resultsCount} résultat{resultsCount > 1 ? "s" : ""}
          </div>
        </div>
      </form>
    </div>
  );
}
