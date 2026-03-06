// lib/data/videos.ts
import "server-only";
import { supabaseServerReadonly } from "@/lib/supabase/server";

export type VideoItem = {
  id: string;
  title: string;
  description: string | null;
  public_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

type SupabaseClient = Awaited<ReturnType<typeof supabaseServerReadonly>>;

type MediaRow = {
  id: string;
  kind: string;
  bucket: string | null;
  path: string | null;
  public_url: string | null;
  title: string;
  description: string | null;
  created_at: string;
  thumbnail?: { bucket: string | null; path: string | null; public_url: string | null } | null;
};

function isNonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function resolveUrl(
  supabase: SupabaseClient,
  bucket: string | null,
  path: string | null,
  publicUrl: string | null
): string | null {
  const b = isNonEmpty(bucket) ? bucket.trim() : null;
  const p = isNonEmpty(path) ? path.trim() : null;

  if (b && p && p !== "pending") {
    return supabase.storage.from(b).getPublicUrl(p).data.publicUrl ?? null;
  }
  return publicUrl ?? null;
}

async function fallbackLatestVideos(limit: number): Promise<VideoItem[]> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("media")
    .select("id,kind,bucket,path,public_url,title,description,created_at")
    .eq("kind", "video")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((m: any) => ({
    id: m.id,
    title: m.title,
    description: m.description ?? null,
    public_url: resolveUrl(supabase, m.bucket, m.path, m.public_url),
    thumbnail_url: null,
    created_at: m.created_at,
  }));
}

export async function getHomeVideos(limit = 6): Promise<VideoItem[]> {
  const supabase = await supabaseServerReadonly();

  const { data: page, error: pErr } = await supabase
    .from("pages")
    .select("id")
    .eq("slug", "home")
    .maybeSingle();

  if (pErr) throw new Error(pErr.message);
  if (!page) return fallbackLatestVideos(limit);

  const { data: links, error: lErr } = await supabase
    .from("page_media")
    .select(
      `
      section_key, order_index,
      media:media_id(
        id, kind, bucket, path, public_url, title, description, created_at,
        thumbnail:thumbnail_media_id(id, bucket, path, public_url)
      )
    `
    )
    .eq("page_id", (page as any).id)
    .eq("section_key", "home.videos")
    .order("order_index", { ascending: true })
    .limit(limit);

  if (lErr) throw new Error(lErr.message);
  if (!links || links.length === 0) return fallbackLatestVideos(limit);

  const out: VideoItem[] = [];

  for (const row of links as any[]) {
    const media = row.media as MediaRow | null;
    if (!media || media.kind !== "video") continue;

    const url = resolveUrl(supabase, media.bucket, media.path, media.public_url);
    if (!url) continue;

    const t = media.thumbnail ?? null;
    const thumbUrl = t ? resolveUrl(supabase, t.bucket, t.path, t.public_url) : null;

    out.push({
      id: media.id,
      title: media.title,
      description: media.description ?? null,
      public_url: url,
      thumbnail_url: thumbUrl,
      created_at: media.created_at,
    });
  }

  return out.length ? out : fallbackLatestVideos(limit);
}
