// app/projects/page.tsx
import Link from "next/link";
import {
  getPublicProjects,
  PROJECT_CATEGORIES,
  type ProjectCategory,
  getBusinessUnitTitle,
} from "@/lib/data/public-projects";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function getSP(sp: SearchParams | undefined, key: string): string | null {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? null;
  return null;
}

function isAllowedCategory(v: string | null): v is ProjectCategory {
  return !!v && (PROJECT_CATEGORIES as readonly string[]).includes(v);
}

function clampInt(v: string | null, fallback: number, min: number, max: number) {
  const n = Number.parseInt(v ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function buildQS(params: Record<string, string | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = (v ?? "").toString().trim();
    if (val) sp.set(k, val);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function ProjectsPublicPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const sp = await Promise.resolve(searchParams);

  const q = getSP(sp, "q");
  const categoryRaw = getSP(sp, "category");
  const category = isAllowedCategory(categoryRaw) ? categoryRaw : null;

  const featured = getSP(sp, "featured") === "1";
  const pole = getSP(sp, "pole"); // slug business_unit (optionnel)
  const page = clampInt(getSP(sp, "page"), 1, 1, 999);

  const { items, total, pageSize } = await getPublicProjects({
    q,
    category,
    featured,
    pole,
    page,
    pageSize: 12,
  });

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const prev = page > 1 ? page - 1 : null;
  const next = page < pages ? page + 1 : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projets</h1>
          <p className="mt-1 text-sm text-slate-600">
            Découvrez nos réalisations. Filtrez par catégorie ou affichez les projets “featured”.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          ← Accueil
        </Link>
      </div>

      {/* Filtres */}
      <form
        className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-12"
        action="/projects"
      >
        <div className="md:col-span-5">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-900">Recherche</span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Titre, description…"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="md:col-span-4">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-900">Catégorie</span>
            <select
              name="category"
              defaultValue={category ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Toutes</option>
              {PROJECT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="flex h-full items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <input name="featured" type="checkbox" defaultChecked={featured} value="1" className="h-4 w-4" />
            <span className="font-semibold text-slate-900">Featured</span>
          </label>
        </div>

        <div className="md:col-span-1 flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            OK
          </button>
        </div>
      </form>

      <div className="mt-6 text-sm text-slate-600">
        {total} résultat{total > 1 ? "s" : ""}
        {category ? (
          <>
            {" "}
            • <b>{category}</b>
          </>
        ) : null}
        {featured ? (
          <>
            {" "}
            • <b>featured</b>
          </>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          Aucun projet trouvé.
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((p) => (
            <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{p.title}</div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    {p.category ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{p.category}</span>
                    ) : null}
                    {getBusinessUnitTitle(p) ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{getBusinessUnitTitle(p)}</span>
                    ) : null}
                    {p.location ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{p.location}</span>
                    ) : null}
                    {p.is_featured ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                        Featured
                      </span>
                    ) : null}
                  </div>
                </div>

                <Link
                  href={`/projects/${p.slug}`}
                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Voir →
                </Link>
              </div>

              <div className="mt-3 line-clamp-3 text-sm text-slate-700">{p.description}</div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Page <b>{page}</b> / {pages}
        </div>

        <div className="flex gap-2">
          <Link
            aria-disabled={!prev}
            className={[
              "rounded-xl border px-4 py-2 text-sm font-semibold",
              prev
                ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400",
            ].join(" ")}
            href={
              prev
                ? `/projects${buildQS({
                    q,
                    category,
                    featured: featured ? "1" : null,
                    pole,
                    page: String(prev),
                  })}`
                : "#"
            }
          >
            ← Précédent
          </Link>

          <Link
            aria-disabled={!next}
            className={[
              "rounded-xl border px-4 py-2 text-sm font-semibold",
              next
                ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400",
            ].join(" ")}
            href={
              next
                ? `/projects${buildQS({
                    q,
                    category,
                    featured: featured ? "1" : null,
                    pole,
                    page: String(next),
                  })}`
                : "#"
            }
          >
            Suivant →
          </Link>
        </div>
      </div>
    </div>
  );
}
