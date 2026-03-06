// lib/data/content.ts
import "server-only";
import { supabaseServerReadonly } from "@/lib/supabase/server";
import type { ContentBlock, Page } from "@/lib/supabase/types";

function cleanText(v: unknown): string {
  return String(v ?? "").trim();
}

function supaError(prefix: string, error: any): Error {
  const msg = error?.message ?? "Erreur inconnue Supabase";
  const hint = error?.hint ? `\nHint: ${error.hint}` : "";
  const details = error?.details ? `\nDetails: ${error.details}` : "";
  const code = error?.code ? `\nCode: ${error.code}` : "";
  return new Error(`${prefix}: ${msg}${code}${hint}${details}`);
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const supabase = await supabaseServerReadonly();
  const s = cleanText(slug);
  if (!s) return null;

  const { data, error } = await supabase
    .from("pages")
    .select("id,slug,title,is_published")
    .eq("slug", s)
    .maybeSingle();

  if (error) throw supaError("getPageBySlug", error);
  return (data ?? null) as Page | null;
}

export async function getContentBlocksByPageId(
  pageId: string
): Promise<ContentBlock[]> {
  const supabase = await supabaseServerReadonly();
  const id = cleanText(pageId);
  if (!id) return [];

  const { data, error } = await supabase
    .from("content_blocks")
    .select("key,type,value,order_index")
    .eq("page_id", id)
    .order("order_index", { ascending: true });

  if (error) throw supaError("getContentBlocksByPageId", error);
  return (data ?? []) as ContentBlock[];
}

export function blockMap(blocks: ContentBlock[]) {
  const m: Record<string, ContentBlock> = {};
  for (const b of blocks) m[b.key] = b;
  return m;
}
