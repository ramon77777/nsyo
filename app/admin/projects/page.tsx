// app/admin/projects/page.tsx
import Link from "next/link";
import { supabaseServerReadonly } from "@/lib/supabase/server";
import ProjectsFiltersClient from "./_components/ProjectsFiltersClient";

export const dynamic = "force-dynamic";

/** ✅ Types exportés (si ProjectsClient en a besoin plus tard) */
export type BusinessUnitMini = {
  id: string;
  title: string;
};

export type ProjectRow = {
  id: string;
  business_unit_id: string;
  title: string;
  slug: string;
  description: string;
  location: string | null;
  date: string | null; // YYYY-MM-DD
  category: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;

  // join robuste: objet OU tableau OU null
  business_units?: { title: string } | { title: string }[] | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function getSP(sp: SearchParams | undefined, key: string): string | null {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? null;
  return null;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const fmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
});
function formatUtc(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return fmt.format(d);
}

function buTitle(p: ProjectRow) {
  const bu = p.business_units;
  if (!bu) return null;
  if (Array.isArray(bu)) return bu[0]?.title ?? null;
  return bu.title ?? null;
}

async function getBusinessUnitsMini(): Promise<BusinessUnitMini[]> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("business_units")
    .select("id,title")
    .order("order_index", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw new Error(`Erreur Supabase (business_units mini): ${error.message}`);
  return (data ?? []) as BusinessUnitMini[];
}

function sanitizeForOrIlike(input: string) {
  // Supabase "or" expects a string like: col.ilike.%term%
  // We avoid commas (separator) and % wildcard injection (very basic guard)
  return input.replace(/%/g, "\\%").replace(/,/g, " ").trim();
}

async function getProjects(filters: {
  q?: string | null;
  bu?: string | null;
  featured?: "1" | "0" | null;
  cat?: string | null;
}): Promise<ProjectRow[]> {
  const supabase = await supabaseServerReadonly();

  let query = supabase
    .from("projects")
    .select(
      `
      id,business_unit_id,title,slug,description,location,date,category,is_featured,created_at,updated_at,
      business_units:business_unit_id(title)
    `
    )
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("title", { ascending: true })
    .limit(500);

  if (filters.bu) query = query.eq("business_unit_id", filters.bu);
  if (filters.featured === "1") query = query.eq("is_featured", true);
  if (filters.featured === "0") query = query.eq("is_featured", false);
  if (filters.cat) query = query.eq("category", filters.cat);

  if (filters.q) {
    const q = sanitizeForOrIlike(filters.q);
    if (q) {
      const pat = `%${q}%`;
      query = query.or(
        [
          `title.ilike.${pat}`,
          `slug.ilike.${pat}`,
          `location.ilike.${pat}`,
          `category.ilike.${pat}`,
        ].join(",")
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur Supabase (projects): ${error.message}`);

  return (data ?? []) as unknown as ProjectRow[];
}

export default async function AdminProjectsPage({
  searchParams,
}: {
  // ✅ Next 16: searchParams peut être une Promise
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const sp = await Promise.resolve(searchParams);

  const q = getSP(sp, "q");
  const bu = getSP(sp, "bu");
  const featured = (getSP(sp, "featured") as "1" | "0" | null) ?? null;
  const cat = getSP(sp, "cat");

  const [businessUnits, items] = await Promise.all([
    getBusinessUnitsMini(),
    getProjects({ q, bu, featured, cat }),
  ]);

  // ✅ catégories possibles = titres des business units (unique + tri)
  const categories = Array.from(
    new Set(businessUnits.map((b) => (b.title ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projets</h1>
          <p className="mt-1 text-sm text-slate-600">Gère les projets, catégories et mise en avant.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            ← Dashboard
          </Link>

          <Link
            href="/admin/projects/new"
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            + Nouveau projet
          </Link>
        </div>
      </div>

      {/* ✅ Filters (AUTO) */}
      <ProjectsFiltersClient
        businessUnits={businessUnits}
        categories={categories}
        initialQ={q}
        initialBu={bu}
        initialFeatured={featured}
        initialCat={cat}
        resultsCount={items.length}
        debounceMs={350}
      />

      {/* ✅ Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-600">
          <div className="col-span-4">Projet</div>
          <div className="col-span-3">Pôle</div>
          <div className="col-span-2">Catégorie</div>
          <div className="col-span-1 text-center">Feat</div>
          <div className="col-span-1">MAJ</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-600">
            Aucun projet trouvé. Ajuste les filtres ou clique sur <b>Nouveau projet</b>.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {items.map((p) => {
              const buName = buTitle(p);
              return (
                <li key={p.id} className="grid grid-cols-12 gap-3 px-5 py-4">
                  <div className="col-span-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-slate-900">{p.title}</div>
                      {p.is_featured ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                          Featured
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono">
                        {p.slug}
                      </span>
                      {p.date ? <span>Date : {p.date}</span> : null}
                      {p.location ? <span>Lieu : {p.location}</span> : null}
                    </div>
                  </div>

                  <div className="col-span-3 text-sm text-slate-700">
                    {buName ?? <span className="text-slate-400">—</span>}
                  </div>

                  <div className="col-span-2 text-sm text-slate-700">
                    {p.category ?? <span className="text-slate-400">—</span>}
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        p.is_featured ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {p.is_featured ? "Oui" : "Non"}
                    </span>
                  </div>

                  <div className="col-span-1 text-xs text-slate-600">{formatUtc(p.updated_at)}</div>

                  <div className="col-span-1 flex items-center justify-end gap-3">
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
    </div>
  );
}
