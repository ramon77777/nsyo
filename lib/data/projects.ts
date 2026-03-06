// lib/data/projects.ts
import "server-only";
import { supabaseServerReadonly } from "@/lib/supabase/server";

export type Project = {
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
};

export type ProjectWithCover = Project & { cover_url: string | null };

export type MediaItem = {
  id: string;
  kind: "image" | "video";
  bucket: string;
  path: string;
  public_url: string | null;
  title: string;
  description: string | null;
  thumbnail_url?: string | null;
};

export type GalleryItem = {
  id: string;
  kind: "image" | "video";
  title: string;
  description: string | null;
  public_url: string | null;
  thumbnail_url: string | null;
};

type SupabaseClient = Awaited<ReturnType<typeof supabaseServerReadonly>>;

type MediaRow = {
  id: string;
  kind: "image" | "video" | string;
  bucket: string | null;
  path: string | null;
  public_url: string | null;
  title: string | null;
  description: string | null;
};

type LinkRow = {
  project_id: string;
  is_cover: boolean;
  order_index: number;
  media: MediaRow | null;
};

function isNonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

/**
 * URL publique :
 * - bucket/path => reconstruire via Storage (fiable si bucket public)
 * - sinon fallback sur public_url
 */
export function resolvePublicUrl(
  supabase: SupabaseClient,
  media: { bucket: string | null; path: string | null; public_url: string | null }
): string | null {
  const bucket = isNonEmpty(media.bucket) ? media.bucket.trim() : null;
  const path = isNonEmpty(media.path) ? media.path.trim() : null;

  if (bucket && path && path !== "pending") {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl ?? null;
  }
  return media.public_url ?? null;
}

async function attachCoversToProjects(
  supabase: SupabaseClient,
  projectList: Project[]
): Promise<ProjectWithCover[]> {
  if (!projectList.length) return [];

  const ids = projectList.map((p) => p.id);

  const { data: links, error } = await supabase
    .from("project_media")
    .select(
      "project_id,is_cover,order_index, media:media_id(id,kind,bucket,path,public_url,title,description)"
    )
    .in("project_id", ids)
    .order("is_cover", { ascending: false })
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);

  const coverByProject = new Map<string, string>();

  for (const row of (links ?? []) as unknown as LinkRow[]) {
    const m = row.media;
    if (!m || m.kind !== "image") continue;

    const url = resolvePublicUrl(supabase, {
      bucket: m.bucket,
      path: m.path,
      public_url: m.public_url,
    });
    if (!url) continue;

    // Priorité au cover, sinon première image
    if (row.is_cover || !coverByProject.has(row.project_id)) {
      coverByProject.set(row.project_id, url);
    }
  }

  return projectList.map((p) => ({
    ...p,
    cover_url: coverByProject.get(p.id) ?? null,
  }));
}

export async function getFeaturedProjects(limit = 6): Promise<ProjectWithCover[]> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,business_unit_id,title,slug,description,category,location,date,is_featured,created_at,updated_at"
    )
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return attachCoversToProjects(supabase, (data ?? []) as Project[]);
}

export async function getProjectsByBusinessUnit(
  businessUnitId: string,
  limit = 50
): Promise<ProjectWithCover[]> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,business_unit_id,title,slug,description,category,location,date,is_featured,created_at,updated_at"
    )
    .eq("business_unit_id", businessUnitId)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return attachCoversToProjects(supabase, (data ?? []) as Project[]);
}

export async function getProjectBySlug(slug: string): Promise<ProjectWithCover | null> {
  const supabase = await supabaseServerReadonly();
  const s = String(slug ?? "").trim();
  if (!s) return null;

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,business_unit_id,title,slug,description,category,location,date,is_featured,created_at,updated_at"
    )
    .eq("slug", s)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const withCover = await attachCoversToProjects(supabase, [data as Project]);
  return withCover[0] ?? null;
}

export async function getProjectGalleryMedia(
  projectId: string,
  opts?: { imagesLimit?: number; videosLimit?: number }
): Promise<GalleryItem[]> {
  const supabase = await supabaseServerReadonly();
  const imagesLimit = opts?.imagesLimit ?? 24;
  const videosLimit = opts?.videosLimit ?? 6;

  const { data, error } = await supabase
    .from("project_media")
    .select(
      "project_id,is_cover,order_index, media:media_id(id,kind,bucket,path,public_url,title,description)"
    )
    .eq("project_id", projectId)
    .order("is_cover", { ascending: false })
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);

  const images: GalleryItem[] = [];
  const videos: GalleryItem[] = [];
  const seen = new Set<string>();

  for (const row of (data ?? []) as unknown as LinkRow[]) {
    const m = row.media;
    if (!m) continue;
    if (seen.has(m.id)) continue;
    seen.add(m.id);

    const url = resolvePublicUrl(supabase, {
      bucket: m.bucket,
      path: m.path,
      public_url: m.public_url,
    });
    if (!url) continue;

    const kind: "image" | "video" = m.kind === "video" ? "video" : "image";

    const item: GalleryItem = {
      id: m.id,
      kind,
      title: (m.title ?? "").trim() || (kind === "video" ? "Vidéo" : "Image"),
      description: m.description ?? null,
      public_url: url,
      thumbnail_url: null,
    };

    if (kind === "image") {
      if (images.length < imagesLimit) images.push(item);
    } else {
      if (videos.length < videosLimit) videos.push(item);
    }

    if (images.length >= imagesLimit && videos.length >= videosLimit) break;
  }

  return [...images, ...videos];
}

export function groupProjectsByCategory(items: ProjectWithCover[]) {
  const groups: Record<string, ProjectWithCover[]> = {};

  for (const p of items) {
    const key = (p.category ?? "Autres").trim() || "Autres";
    (groups[key] ??= []).push(p);
  }

  return Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {} as Record<string, ProjectWithCover[]>);
}
