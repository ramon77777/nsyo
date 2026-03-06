// app/admin/business-units/[id]/sections/actions.ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type MediaPick = {
  id: string;
  title: string;
  description: string | null;
  bucket: string;
  path: string;
  url: string;
};

function envFirst(...names: string[]) {
  for (const name of names) {
    const v = process.env[name];
    if (v) return v;
  }
  throw new Error(`Missing env var: one of [${names.join(", ")}]`);
}

function envRequired(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function supabaseAdmin() {
  // ✅ ton projet utilise NEXT_PUBLIC_SUPABASE_URL dans .env.local
  const url = envFirst("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");

  // ✅ clé SERVER-ONLY obligatoire (à ajouter dans .env.local / prod)
  const serviceRole = envRequired("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function fail<T = never>(message: string): ActionResult<T> {
  return { ok: false, message };
}

function publicUrl(bucket: string, path: string) {
  const s = supabaseAdmin();
  const { data } = s.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl ?? "";
}

function safeSlug(input: string) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFormString(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/* -------------------- SECTIONS -------------------- */

export async function createSectionAction(args: {
  businessUnitId: string;
  title: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const s = supabaseAdmin();

    const { data: maxRow, error: maxErr } = await s
      .from("business_unit_sections")
      .select("order_index")
      .eq("business_unit_id", args.businessUnitId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) return fail(maxErr.message);

    const nextOrder = (maxRow?.order_index ?? 0) + 1;

    const { data, error } = await s
      .from("business_unit_sections")
      .insert({
        business_unit_id: args.businessUnitId,
        key: "nouvelle-section",
        title: args.title,
        intro_text: "",
        order_index: nextOrder,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    revalidatePath(`/admin/business-units/${args.businessUnitId}/sections`);
    return ok({ id: data.id as string });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur createSectionAction");
  }
}

export async function updateSectionAction(args: {
  sectionId: string;
  title: string;
  key: string;
  intro_text: string;
}): Promise<ActionResult<null>> {
  try {
    const s = supabaseAdmin();

    const { error } = await s
      .from("business_unit_sections")
      .update({
        title: args.title,
        key: args.key,
        intro_text: args.intro_text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.sectionId);

    if (error) return fail(error.message);

    revalidatePath(`/admin/business-units`);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur updateSectionAction");
  }
}

export async function deleteSectionAction(args: {
  sectionId: string;
  businessUnitId: string;
  businessUnitSlug: string;
}): Promise<ActionResult<null>> {
  try {
    const s = supabaseAdmin();

    const { error } = await s
      .from("business_unit_sections")
      .delete()
      .eq("id", args.sectionId);

    if (error) return fail(error.message);

    revalidatePath(`/admin/business-units/${args.businessUnitId}/sections`);
    revalidatePath(`/business-unit/${args.businessUnitSlug}`);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur deleteSectionAction");
  }
}

export async function reorderSectionsAction(args: {
  businessUnitId: string;
  businessUnitSlug: string;
  orderedSectionIds: string[];
}): Promise<ActionResult<null>> {
  try {
    const s = supabaseAdmin();

    const updates = args.orderedSectionIds.map((id, idx) => ({
      id,
      order_index: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await s.from("business_unit_sections").upsert(updates, {
      onConflict: "id",
    });

    if (error) return fail(error.message);

    revalidatePath(`/admin/business-units/${args.businessUnitId}/sections`);
    revalidatePath(`/business-unit/${args.businessUnitSlug}`);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur reorderSectionsAction");
  }
}

export async function setSectionImageAction(args: {
  sectionId: string;
  imageMediaId: string | null;
  businessUnitId: string;
  businessUnitSlug: string;
}): Promise<ActionResult<null>> {
  try {
    const s = supabaseAdmin();

    if (args.imageMediaId) {
      const { data: m, error: mErr } = await s
        .from("media")
        .select("id,kind")
        .eq("id", args.imageMediaId)
        .maybeSingle();

      if (mErr) return fail(mErr.message);
      if (!m) return fail("Média introuvable.");
      if (m.kind !== "image") return fail("Le média choisi n’est pas une image.");
    }

    const { error } = await s
      .from("business_unit_sections")
      .update({
        image_media_id: args.imageMediaId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.sectionId);

    if (error) return fail(error.message);

    revalidatePath(`/admin/business-units/${args.businessUnitId}/sections`);
    revalidatePath(`/business-unit/${args.businessUnitSlug}`);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur setSectionImageAction");
  }
}

/* -------------------- ITEMS -------------------- */

export async function createItemAction(args: {
  sectionId: string;
  designation: string;
  qty: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const s = supabaseAdmin();

    const { data: maxRow, error: maxErr } = await s
      .from("business_unit_section_items")
      .select("order_index")
      .eq("section_id", args.sectionId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) return fail(maxErr.message);

    const nextOrder = (maxRow?.order_index ?? 0) + 1;

    const { data, error } = await s
      .from("business_unit_section_items")
      .insert({
        section_id: args.sectionId,
        designation: args.designation,
        qty: args.qty,
        order_index: nextOrder,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    return ok({ id: data.id as string });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur createItemAction");
  }
}

export async function updateItemAction(args: {
  itemId: string;
  designation: string;
  qty: string;
}): Promise<ActionResult<null>> {
  try {
    const s = supabaseAdmin();

    const { error } = await s
      .from("business_unit_section_items")
      .update({
        designation: args.designation,
        qty: args.qty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.itemId);

    if (error) return fail(error.message);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur updateItemAction");
  }
}

export async function deleteItemAction(args: { itemId: string }): Promise<ActionResult<null>> {
  try {
    const s = supabaseAdmin();

    const { error } = await s
      .from("business_unit_section_items")
      .delete()
      .eq("id", args.itemId);

    if (error) return fail(error.message);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur deleteItemAction");
  }
}

export async function reorderItemsAction(args: {
  sectionId: string;
  orderedItemIds: string[];
}): Promise<ActionResult<null>> {
  try {
    const s = supabaseAdmin();

    const updates = args.orderedItemIds.map((id, idx) => ({
      id,
      order_index: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await s.from("business_unit_section_items").upsert(updates, {
      onConflict: "id",
    });

    if (error) return fail(error.message);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur reorderItemsAction");
  }
}

/* -------------------- MEDIA PICKER -------------------- */

export async function searchImageMediaAction(args: {
  q: string;
  offset: number;
  limit: number;
}): Promise<ActionResult<{ items: MediaPick[]; nextOffset: number | null }>> {
  try {
    const s = supabaseAdmin();

    const q = args.q.trim();
    let query = s
      .from("media")
      .select("id,kind,bucket,path,public_url,title,description", { count: "exact" })
      .eq("kind", "image")
      .order("created_at", { ascending: false })
      .range(args.offset, args.offset + args.limit - 1);

    if (q) {
      const qq = q.replace(/[%]/g, "\\%").replace(/[,]/g, " ");
      query = query.or(`title.ilike.%${qq}%,path.ilike.%${qq}%,description.ilike.%${qq}%`);
    }

    const { data, error, count } = await query;
    if (error) return fail(error.message);

    const items: MediaPick[] = (data ?? []).map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      bucket: m.bucket,
      path: m.path,
      url: m.public_url ?? publicUrl(m.bucket, m.path),
    }));

    const total = typeof count === "number" ? count : null;
    const nextOffset =
      total == null ? null : args.offset + args.limit < total ? args.offset + args.limit : null;

    return ok({ items, nextOffset });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur searchImageMediaAction");
  }
}

export async function uploadImageMediaAction(fd: FormData): Promise<ActionResult<MediaPick>> {
  try {
    const file = fd.get("file");
    const businessUnitSlug = safeSlug(getFormString(fd, "businessUnitSlug"));

    if (!(file instanceof File)) return fail("Fichier manquant.");
    if (!businessUnitSlug) return fail("businessUnitSlug manquant.");
    if (!file.type.startsWith("image/")) return fail("Le fichier doit être une image.");

    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) return fail("Image trop volumineuse (max 10 Mo).");

    const s = supabaseAdmin();
    const bucket = "images";

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const baseName = file.name.replace(/\.[^/.]+$/, "").slice(0, 60);
    const safeName = safeSlug(baseName) || "image";

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(
      2,
      "0"
    )}`;

    const random = crypto.randomUUID();
    const path = `business-units/${businessUnitSlug}/${stamp}-${random}-${safeName}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await s.storage.from(bucket).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });
    if (upErr) return fail(upErr.message);

    const url = publicUrl(bucket, path);

    const { data: row, error: dbErr } = await s
      .from("media")
      .insert({
        kind: "image",
        bucket,
        path,
        public_url: url || null,
        title: safeName,
        description: null,
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select("id, bucket, path, public_url, title, description")
      .single();

    if (dbErr) return fail(dbErr.message);

    return ok({
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      bucket: row.bucket as string,
      path: row.path as string,
      url: (row.public_url as string | null) ?? url,
    });
  } catch (e: any) {
    // message plus explicite si tu oublies la variable
    const msg = String(e?.message ?? "Erreur uploadImageMediaAction");
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return fail(
        "Variable manquante: SUPABASE_SERVICE_ROLE_KEY. Ajoute-la dans .env.local (server-only) et redémarre le serveur."
      );
    }
    return fail(msg);
  }
}