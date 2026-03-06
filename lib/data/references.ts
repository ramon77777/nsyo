import { supabaseServerReadonly } from "@/lib/supabase/server";
import type { Project, ProjectWithCover } from "@/lib/data/projects";

export type ReferencesQuery = {
  pole?: string; // business_unit slug
  cat?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

type ProjectRow = Project;

type SupabaseClientPromise = ReturnType<typeof supabaseServerReadonly>;
type SupabaseClient = Awaited<SupabaseClientPromise>;

function resolvePublicUrlLocal(
  supabase: SupabaseClient,
  media: { bucket: string; path: string; public_url: string | null }
) {
  return (
    media.public_url ??
    supabase.storage.from(media.bucket).getPublicUrl(media.path).data.publicUrl
  );
}

async function attachCovers(
  supabase: SupabaseClient,
  projects: ProjectRow[]
): Promise<ProjectWithCover[]> {
  if (!projects.length) return [];

  const ids = projects.map((p) => p.id);

  const { data: links, error } = await supabase
    .from("project_media")
    .select("project_id,is_cover,order_index, media:media_id(id,kind,bucket,path,public_url)")
    .in("project_id", ids)
    .order("is_cover", { ascending: false })
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);

  const coverByProject = new Map<string, string>();

  for (const row of links ?? []) {
    const r = row as unknown as {
      project_id: string;
      media:
        | { kind: string; bucket: string; path: string; public_url: string | null }
        | null;
    };

    if (!r.media || r.media.kind !== "image") continue;

    const url = resolvePublicUrlLocal(supabase, {
      bucket: r.media.bucket,
      path: r.media.path,
      public_url: r.media.public_url,
    });

    if (url && !coverByProject.has(r.project_id)) {
      coverByProject.set(r.project_id, url);
    }
  }

  return projects.map((p) => ({
    ...p,
    cover_url: coverByProject.get(p.id) ?? null,
  }));
}

export async function getReferencesProjects(query: ReferencesQuery) {
  const supabase = await supabaseServerReadonly();

  const pageSize = Math.min(Math.max(query.pageSize ?? 12, 6), 24);
  const page = Math.max(query.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let businessUnitId: string | null = null;

  if (query.pole?.trim()) {
    const { data: bu, error: buErr } = await supabase
      .from("business_units")
      .select("id")
      .eq("slug", query.pole.trim())
      .maybeSingle();

    if (buErr) throw new Error(buErr.message);
    businessUnitId = (bu?.id as string) ?? null;

    if (!businessUnitId) {
      return { items: [] as ProjectWithCover[], total: 0, page, pageSize };
    }
  }

  let q = supabase
    .from("projects")
    .select(
      "id,business_unit_id,title,slug,description,category,location,date,is_featured,created_at,updated_at",
      { count: "exact" }
    );

  if (businessUnitId) q = q.eq("business_unit_id", businessUnitId);
  if (query.cat?.trim()) q = q.eq("category", query.cat.trim());

  if (query.q?.trim()) {
    const term = query.q.trim();
    q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data, error, count } = await q
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const projects = (data ?? []) as ProjectRow[];
  const items = await attachCovers(supabase, projects);

  return {
    items,
    total: count ?? 0,
    page,
    pageSize,
  };
}
