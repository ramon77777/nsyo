"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BusinessUnit } from "@/lib/data/business";

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.trim()) sp.set(k, v.trim());
  }
  return sp.toString();
}

export default function ProjectFilters({
  businessUnits,
  categories,
}: {
  businessUnits: BusinessUnit[];
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const pole = search.get("pole") ?? "";
  const cat = search.get("cat") ?? "";
  const q = search.get("q") ?? "";

  const [term, setTerm] = useState(q);

  const sortedCats = useMemo(() => {
    const clean = categories.map((c) => c.trim()).filter(Boolean);
    return Array.from(new Set(clean)).sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const apply = (next: { pole?: string; cat?: string; q?: string }) => {
    const query = buildQuery({
      pole: next.pole ?? pole,
      cat: next.cat ?? cat,
      q: next.q ?? term,
      page: "1",
    });
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const clear = () => {
    setTerm("");
    router.push(pathname);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Recherche</label>
          <div className="mt-1 flex gap-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply({ q: term });
              }}
              placeholder="Ex: atelier, bâtiment, location..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
            <button
              type="button"
              onClick={() => apply({ q: term })}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Pôle</label>
          <select
            value={pole}
            onChange={(e) => apply({ pole: e.target.value || "" })}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.slug}>
                {bu.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Catégorie</label>
          <select
            value={cat}
            onChange={(e) => apply({ cat: e.target.value || "" })}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Toutes</option>
            {sortedCats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Astuce : utilise la recherche + filtre pôle pour aller vite.
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
