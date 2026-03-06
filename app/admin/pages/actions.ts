// app/admin/pages/actions.ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServerAction } from "@/lib/supabase/server";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function fail<T = never>(message: string): ActionResult<T> {
  return { ok: false, message };
}

function cleanText(v: unknown) {
  return String(v ?? "").trim();
}

function toBool(v: unknown): boolean {
  // checkbox => "on" quand coché
  return v === true || v === "true" || v === "on" || v === "1" || v === 1;
}

function toInt(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function safeJsonParse(input: string): { ok: true; value: any } | { ok: false; message: string } {
  try {
    const value = JSON.parse(input);
    return { ok: true, value };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "JSON invalide" };
  }
}

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  updated_at: string;
};

export type ContentBlockRow = {
  id: string;
  page_id: string;
  key: string;
  type: "text" | "richtext" | "list" | "json";
  value: any;
  order_index: number;
  updated_at: string;
};

export async function listPagesAction(): Promise<ActionResult<PageRow[]>> {
  try {
    const supabase = await supabaseServerAction();
    const { data, error } = await supabase
      .from("pages")
      .select("id,slug,title,is_published,updated_at")
      .order("updated_at", { ascending: false });

    if (error) return fail(error.message);
    return ok((data ?? []) as PageRow[]);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur listPagesAction");
  }
}

export async function getPageWithBlocksAction(
  pageId: string
): Promise<ActionResult<{ page: PageRow; blocks: ContentBlockRow[] }>> {
  try {
    const supabase = await supabaseServerAction();
    const id = cleanText(pageId);
    if (!id) return fail("pageId manquant.");

    const { data: page, error: pErr } = await supabase
      .from("pages")
      .select("id,slug,title,is_published,updated_at")
      .eq("id", id)
      .single();

    if (pErr) return fail(pErr.message);

    const { data: blocks, error: bErr } = await supabase
      .from("content_blocks")
      .select("id,page_id,key,type,value,order_index,updated_at")
      .eq("page_id", id)
      .order("order_index", { ascending: true });

    if (bErr) return fail(bErr.message);

    return ok({ page: page as PageRow, blocks: (blocks ?? []) as ContentBlockRow[] });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur getPageWithBlocksAction");
  }
}

export async function updatePageMetaAction(args: {
  pageId: string;
  title: string;
  slug: string;
  is_published: boolean;
}): Promise<ActionResult<null>> {
  try {
    const supabase = await supabaseServerAction();

    const pageId = cleanText(args.pageId);
    const title = cleanText(args.title);
    const slug = cleanText(args.slug);

    if (!pageId) return fail("pageId manquant.");
    if (!title) return fail("Le titre est obligatoire.");
    if (!slug) return fail("Le slug est obligatoire.");

    const { error } = await supabase
      .from("pages")
      .update({
        title,
        slug,
        is_published: !!args.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pageId);

    if (error) return fail(error.message);

    revalidatePath("/");
    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/pages/${pageId}`);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur updatePageMetaAction");
  }
}

/**
 * ✅ FIX IMPORTANT :
 * - Si blockId existe => UPDATE par id (modifie bien value)
 * - Sinon => UPSERT par (page_id,key) sans id
 */
export async function upsertContentBlockAction(args: {
  blockId?: string | null;
  pageId: string;
  key: string;
  type: "text" | "richtext" | "list" | "json";
  valueJson: string;
  order_index: number;
  slug?: string; // optionnel: pour revalidatePath(`/${slug}`)
}): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await supabaseServerAction();

    const pageId = cleanText(args.pageId);
    const key = cleanText(args.key);
    const blockId = cleanText(args.blockId);

    if (!pageId) return fail("pageId manquant.");
    if (!key) return fail("key manquante.");

    const parsed = safeJsonParse(args.valueJson || "{}");
    if (!parsed.ok) return fail(`Valeur JSON invalide: ${parsed.message}`);

    const common = {
      page_id: pageId,
      key,
      type: args.type,
      value: parsed.value ?? {},
      order_index: Number.isFinite(args.order_index) ? Math.floor(args.order_index) : 0,
      updated_at: new Date().toISOString(),
    };

    // ✅ UPDATE par id
    if (blockId) {
      const { data, error } = await supabase
        .from("content_blocks")
        .update(common)
        .eq("id", blockId)
        .select("id")
        .single();

      if (error) return fail(error.message);

      revalidatePath("/");
      revalidatePath(`/admin/pages/${pageId}`);
      if (args.slug) revalidatePath(`/${args.slug}`);
      return ok({ id: data.id as string });
    }

    // ✅ UPSERT par (page_id,key) (création ou update si key existe déjà)
    const { data, error } = await supabase
      .from("content_blocks")
      .upsert(common, { onConflict: "page_id,key" })
      .select("id")
      .single();

    if (error) return fail(error.message);

    revalidatePath("/");
    revalidatePath(`/admin/pages/${pageId}`);
    if (args.slug) revalidatePath(`/${args.slug}`);
    return ok({ id: data.id as string });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur upsertContentBlockAction");
  }
}

export async function deleteContentBlockAction(args: {
  blockId: string;
  pageId: string;
  slug?: string;
}): Promise<ActionResult<null>> {
  try {
    const supabase = await supabaseServerAction();

    const blockId = cleanText(args.blockId);
    const pageId = cleanText(args.pageId);

    if (!blockId) return fail("blockId manquant.");
    if (!pageId) return fail("pageId manquant.");

    const { error } = await supabase.from("content_blocks").delete().eq("id", blockId);
    if (error) return fail(error.message);

    revalidatePath("/");
    if (args.slug) revalidatePath(`/${args.slug}`);
    revalidatePath(`/admin/pages/${pageId}`);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur deleteContentBlockAction");
  }
}

/* -------------------------------------------------------------------------- */
/* ✅ Wrappers FormData pour <form action={...}>                               */
/* -------------------------------------------------------------------------- */

export async function updatePageAction(formData: FormData): Promise<ActionResult<null>> {
  const pageId = cleanText(formData.get("pageId"));
  const title = cleanText(formData.get("title"));
  const slug = cleanText(formData.get("slug"));
  const is_published = toBool(formData.get("is_published"));

  return updatePageMetaAction({ pageId, title, slug, is_published });
}

export async function upsertBlockAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const pageId = cleanText(formData.get("pageId"));
  const blockId = cleanText(formData.get("blockId")) || null;
  const key = cleanText(formData.get("key"));
  const type = (cleanText(formData.get("type")) as any) || "json";
  const valueJson = cleanText(formData.get("value")) || "{}";
  const order_index = toInt(formData.get("order_index"), 0);
  const slug = cleanText(formData.get("slug")) || undefined;

  return upsertContentBlockAction({ pageId, blockId, key, type, valueJson, order_index, slug });
}

export async function deleteBlockAction(formData: FormData): Promise<ActionResult<null>> {
  const pageId = cleanText(formData.get("pageId"));
  const blockId = cleanText(formData.get("blockId"));
  const slug = cleanText(formData.get("slug")) || undefined;

  return deleteContentBlockAction({ pageId, blockId, slug });
}