// lib/data/public-projects.ts
import { supabaseServerReadonly } from "@/lib/supabase/server";

export const PROJECT_CATEGORIES = ["Projets industriels", "Construction urbaine", "Location d’engins"] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export type PublicProject = {
  id: string;
  business_unit_id: string;
  title: string;
  slug: string;
  description: string;
  location: string | null;
  date: string | null;
  category: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  business_units?: { title: string; slug?: string } | { title: string; slug?: string }[] | null;
};

function buTitle(p: PublicProject) {
  const bu = p.business_units;
  if (!bu) return null;
  if (Array.isArray(bu)) return bu[0]?.title ?? null;
  return bu.title ?? null;
}

function isAllowedCategory(cat: unknown): cat is ProjectCategory {
  return typeof cat === "string" && (PROJECT_CATEGORIES as readonly string[]).includes(cat);
}

function escapeIlike(term: string) {
  // échappe % et _ (wildcards)
  return term.replace(/[%_]/g, (m) => `\\${m}`);
}

export type ProjectsQuery = {
  q?: string | null;
  category?: string | null;
  pole?: string | null; // business_unit slug
  featured?: boolean;
  page?: number;
  pageSize?: number;
};

export async function getPublicProjects(query: ProjectsQuery) {
  const supabase = await supabaseServerReadonly();

  const pageSize = Math.min(Math.max(query.pageSize ?? 12, 6), 24);
  const page = Math.max(query.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("projects")
    .select(
      `
      id,business_unit_id,title,slug,description,location,date,category,is_featured,created_at,updated_at,
      business_units:business_unit_id(title,slug)
    `,
      { count: "exact" }
    );

  const term = (query.q ?? "").trim();
  if (term) {
    const t = escapeIlike(term);
    q = q.or(`title.ilike.%${t}%,description.ilike.%${t}%`);
  }

  const cat = (query.category ?? "").trim();
  if (cat && isAllowedCategory(cat)) {
    q = q.eq("category", cat);
  }

  if (query.featured) {
    q = q.eq("is_featured", true);
  }

  const poleSlugRaw = (query.pole ?? "").trim();
  if (poleSlugRaw) {
    const candidates = Array.from(
      new Set([
        poleSlugRaw,
        poleSlugRaw.toLowerCase(),
        poleSlugRaw.replace(/_/g, "-").toLowerCase(),
        poleSlugRaw.replace(/-/g, "_").toLowerCase(),
      ])
    );

    const { data: buList, error: buErr } = await supabase
      .from("business_units")
      .select("id,slug")
      .in("slug", candidates)
      .limit(1);

    if (buErr) throw new Error(buErr.message);

    const businessUnitId = (buList ?? [])[0]?.id as string | undefined;
    if (!businessUnitId) {
      return { items: [] as PublicProject[], total: 0, page, pageSize };
    }

    q = q.eq("business_unit_id", businessUnitId);
  }

  const { data, error, count } = await q
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    items: (data ?? []) as unknown as PublicProject[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getPublicProjectBySlug(slug: string): Promise<PublicProject | null> {
  const supabase = await supabaseServerReadonly();

  const s = String(slug ?? "").trim();
  if (!s) return null;

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      id,business_unit_id,title,slug,description,location,date,category,is_featured,created_at,updated_at,
      business_units:business_unit_id(title,slug)
    `
    )
    .eq("slug", s)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as unknown as PublicProject | null;
}

export function getBusinessUnitTitle(p: PublicProject) {
  return buTitle(p);
}
