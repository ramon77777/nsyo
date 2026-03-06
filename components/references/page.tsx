import Container from "@/components/layout/Container";
import { getBusinessUnits, type BusinessUnit } from "@/lib/data/business";
import ProjectGrid from "@/components/home/ProjectGrid";
import { getReferencesProjects, type ReferencesQuery } from "@/lib/data/references";
import type { ProjectWithCover } from "@/lib/data/projects";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function asString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function cleanStr(v: string | undefined) {
  const s = (v ?? "").trim();
  return s.length ? s : undefined;
}

function toInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function uniqCategories(items: ProjectWithCover[]) {
  const set = new Set<string>();
  for (const p of items) {
    const c = (p.category ?? "").trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function buildHref(base: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.trim().length) usp.set(k, v.trim());
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function ReferencesPage({ searchParams }: PageProps) {
  const pole = cleanStr(asString(searchParams?.pole)); // business_unit slug
  const cat = cleanStr(asString(searchParams?.cat));
  const q = cleanStr(asString(searchParams?.q));
  const page = toInt(cleanStr(asString(searchParams?.page)), 1);

  const pageSize = 12;

  const query: ReferencesQuery = {
    pole,
    cat,
    q,
    page,
    pageSize,
  };

  const [businessUnits, result] = await Promise.all([
    getBusinessUnits(),
    getReferencesProjects(query),
  ]);

  const items = result.items;
  const total = result.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const categories = uniqCategories(items);

  // Helper: pole slug -> label
  const poleLabel =
    pole
      ? (businessUnits.find((b: BusinessUnit) => b.slug === pole)?.title ?? pole)
      : "Tous";

  const baseFilters = {
    pole,
    cat,
    q,
  };

  return (
    <section className="py-16">
      <Container>
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Références
            </h1>
            <p className="mt-2 text-slate-600">
              {total} projet{total > 1 ? "s" : ""} • Pôle:{" "}
              <span className="font-semibold text-slate-900">{poleLabel}</span>
              {cat ? (
                <>
                  {" "}
                  • Catégorie:{" "}
                  <span className="font-semibold text-slate-900">{cat}</span>
                </>
              ) : null}
              {q ? (
                <>
                  {" "}
                  • Recherche:{" "}
                  <span className="font-semibold text-slate-900">“{q}”</span>
                </>
              ) : null}
            </p>
          </div>

          <a
            href="/contact"
            className="inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Demander un devis
          </a>
        </div>

        {/* Search */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
          <form action="/references" method="get" className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* preserve current filters */}
            {pole ? <input type="hidden" name="pole" value={pole} /> : null}
            {cat ? <input type="hidden" name="cat" value={cat} /> : null}

            <div className="flex-1">
              <label className="text-sm font-semibold text-slate-900">Recherche</label>
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Rechercher un projet (titre, description)…"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="mt-6 md:mt-7 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Rechercher
              </button>

              <a
                href="/references"
                className="mt-6 md:mt-7 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Réinitialiser
              </a>
            </div>
          </form>
        </div>

        {/* Filtres (server-friendly) */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Pôle */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Pôle</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={buildHref("/references", { ...baseFilters, pole: undefined, page: "1" })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  !pole
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                Tous
              </a>

              {businessUnits.map((u: BusinessUnit) => (
                <a
                  key={u.id}
                  href={buildHref("/references", { ...baseFilters, pole: u.slug, page: "1" })}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    pole === u.slug
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {u.title}
                </a>
              ))}
            </div>
          </div>

          {/* Catégorie */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Catégorie</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={buildHref("/references", { ...baseFilters, cat: undefined, page: "1" })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  !cat
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                Toutes
              </a>

              {categories.map((c: string) => (
                <a
                  key={c}
                  href={buildHref("/references", { ...baseFilters, cat: c, page: "1" })}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    cat === c
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {c}
                </a>
              ))}
            </div>

            {!categories.length ? (
              <p className="mt-3 text-xs text-slate-500">
                Aucune catégorie disponible pour les filtres actuels.
              </p>
            ) : null}
          </div>
        </div>

        {/* Grid */}
        <div className="mt-10">
          <ProjectGrid
            title={undefined}
            subtitle={undefined}
            items={items.map((p: ProjectWithCover) => ({
              ...p,
              href: `/references/${p.slug}`,
            }))}
          />
        </div>

        {/* Empty state */}
        {!items.length ? (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
            Aucun projet ne correspond à vos filtres.
          </div>
        ) : null}

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <a
              href={buildHref("/references", { ...baseFilters, page: String(Math.max(1, page - 1)) })}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                page <= 1
                  ? "pointer-events-none border-slate-200 text-slate-400"
                  : "border-slate-200 text-slate-900 hover:bg-slate-50"
              }`}
              aria-disabled={page <= 1}
            >
              ← Précédent
            </a>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
              Page <span className="font-semibold text-slate-900">{page}</span> /{" "}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </div>

            <a
              href={buildHref("/references", { ...baseFilters, page: String(Math.min(totalPages, page + 1)) })}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                page >= totalPages
                  ? "pointer-events-none border-slate-200 text-slate-400"
                  : "border-slate-200 text-slate-900 hover:bg-slate-50"
              }`}
              aria-disabled={page >= totalPages}
            >
              Suivant →
            </a>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
