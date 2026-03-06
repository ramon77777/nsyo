// app/admin/projects/_components/ProjectsClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProjectRow } from "../page";

function buTitle(p: ProjectRow) {
  const bu = p.business_units;
  if (!bu) return null;
  if (Array.isArray(bu)) return bu[0]?.title ?? null;
  return bu.title ?? null;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const CATEGORIES = [
  "Projets industriels",
  "Construction urbaine",
  "Location d’engins",
] as const;

export default function ProjectsClient({
  initialItems,
}: {
  initialItems: ProjectRow[];
}) {
  const items = useMemo(() => initialItems ?? [], [initialItems]);

  // ✅ filtres UI
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [bu, setBu] = useState<string>(""); // titre BU
  const [featOnly, setFeatOnly] = useState(false);

  // ✅ listes de filtres calculées
  const businessUnitTitles = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) {
      const t = (buTitle(p) ?? "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return items.filter((p) => {
      if (featOnly && !p.is_featured) return false;

      if (cat) {
        const pc = (p.category ?? "").trim();
        if (pc !== cat) return false;
      }

      if (bu) {
        const bt = (buTitle(p) ?? "").trim();
        if (bt !== bu) return false;
      }

      if (term) {
        const hay = [
          p.title,
          p.slug,
          p.description,
          p.location ?? "",
          p.category ?? "",
          buTitle(p) ?? "",
        ]
          .join(" ")
          .toLowerCase();

        if (!hay.includes(term)) return false;
      }

      return true;
    });
  }, [items, q, cat, bu, featOnly]);

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Barre outils */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (titre, slug, pôle, catégorie, lieu...)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={bu}
            onChange={(e) => setBu(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tous pôles</option>
            {businessUnitTitles.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={featOnly}
              onChange={(e) => setFeatOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="font-semibold text-slate-800">Featured</span>
          </label>

          <button
            type="button"
            onClick={() => {
              setQ("");
              setCat("");
              setBu("");
              setFeatOnly(false);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>

        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{filtered.length}</span>{" "}
          résultat(s)
        </div>
      </div>

      {/* Header tableau */}
      <div className="grid grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-600">
        <div className="col-span-4">Projet</div>
        <div className="col-span-3">Pôle</div>
        <div className="col-span-2">Catégorie</div>
        <div className="col-span-1 text-center">Feat</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-600">
          Aucun projet ne correspond aux filtres.
        </div>
      ) : (
        <ul className="divide-y divide-slate-200">
          {filtered.map((p) => {
            const buT = buTitle(p);
            const catT = (p.category ?? "").trim();

            return (
              <li key={p.id} className="grid grid-cols-12 gap-3 px-5 py-4">
                <div className="col-span-4">
                  <div className="font-semibold text-slate-900">{p.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono">
                      {p.slug}
                    </span>
                    {p.location ? <span>• {p.location}</span> : null}
                    {p.date ? <span>• {p.date}</span> : null}
                  </div>
                </div>

                <div className="col-span-3 text-sm text-slate-700">
                  {buT ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {buT}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>

                <div className="col-span-2 text-sm text-slate-700">
                  {catT ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        catT === "Projets industriels" && "bg-indigo-50 text-indigo-800",
                        catT === "Construction urbaine" && "bg-amber-50 text-amber-900",
                        catT === "Location d’engins" && "bg-emerald-50 text-emerald-800",
                        !CATEGORIES.includes(catT as any) && "bg-slate-100 text-slate-700"
                      )}
                    >
                      {catT}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <span
                    className={
                      p.is_featured
                        ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"
                        : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                    }
                  >
                    {p.is_featured ? "Oui" : "Non"}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="text-sm font-semibold text-slate-900 hover:underline"
                  >
                    Ouvrir
                  </Link>
                  <Link
                    href={`/admin/projects/${p.id}/edit`}
                    className="text-sm font-semibold text-slate-900 hover:underline"
                  >
                    Éditer
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        ⚠️ Les projets “featured” peuvent être affichés en priorité sur la home.
      </div>
    </div>
  );
}
