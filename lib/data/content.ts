import { supabaseServer } from "@/lib/supabase/server";
import type { ContentBlock, Page } from "@/lib/supabase/types";

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("pages")
    .select("id,slug,title,is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Page | null;
}

export async function getContentBlocksByPageId(pageId: string): Promise<ContentBlock[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("content_blocks")
    .select("key,type,value,order_index")
    .eq("page_id", pageId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContentBlock[];
}

export function blockMap(blocks: ContentBlock[]) {
  const m: Record<string, ContentBlock> = {};
  blocks.forEach((b) => (m[b.key] = b));
  return m;
}
