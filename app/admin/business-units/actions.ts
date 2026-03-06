// app/admin/business-units/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import {
  supabaseServerAction,
  supabaseServerReadonly,
} from "@/lib/supabase/server";
import { requireAdminNoRedirect } from "@/lib/auth/requireAdmin";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = <T,>(message: string): ActionResult<T> => ({ ok: false, message });

function toStr(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function toNum(fd: FormData, key: string) {
  const s = toStr(fd, key);
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureUniqueBusinessUnitSlug(
  baseSlug: string,
  excludeId?: string
) {
  const supabase = await supabaseServerReadonly();
  const safeBase = (baseSlug || "pole").trim();

  let candidate = safeBase;
  for (let i = 0; i < 200; i++) {
    let q = supabase
      .from("business_units")
      .select("id")
      .eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);

    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;

    candidate = `${safeBase}-${i + 1}`;
  }
  return `${safeBase}-${Date.now()}`;
}

function revalidateBU() {
  revalidatePath("/admin/business-units");
  revalidatePath("/");
  revalidatePath("/references");
}

function friendlyPostgresError(e: any): string {
  // Supabase/PostgREST renvoie souvent { code, message, details, hint }
  const code = String(e?.code ?? "");
  const msg = String(e?.message ?? "");

  // 23503 = foreign_key_violation
  // Si ça arrive encore, c'est qu'il reste une FK sans CASCADE (souvent sur projects -> project_media, etc.)
  if (code === "23503" || msg.toLowerCase().includes("foreign key")) {
    return (
      "Suppression impossible car d’autres éléments dépendent encore de ce pôle (contrainte de clé étrangère). " +
      "Vérifie les tables liées (ex: medias liés aux projets, etc.) et mets aussi leurs FK en ON DELETE CASCADE."
    );
  }

  return msg || "Erreur serveur.";
}

export async function createBusinessUnitAction(
  fd: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminNoRedirect();

    const title = toStr(fd, "title");
    if (!title) return fail("Le titre est obligatoire.");

    const summary = toStr(fd, "summary") || null;
    const order_index = toNum(fd, "order_index");

    const rawSlug = toStr(fd, "slug") || title;
    const slug = await ensureUniqueBusinessUnitSlug(slugify(rawSlug));

    const supabase = await supabaseServerAction();
    const { data, error } = await supabase
      .from("business_units")
      .insert({ title, slug, summary, order_index })
      .select("id")
      .single();

    if (error) return fail(error.message);

    revalidateBU();
    return ok({ id: (data as any).id as string });
  } catch (e: any) {
    return fail(friendlyPostgresError(e));
  }
}

export async function updateBusinessUnitAction(
  id: string,
  fd: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminNoRedirect();
    if (!id) return fail("ID manquant.");

    const title = toStr(fd, "title");
    if (!title) return fail("Le titre est obligatoire.");

    const summary = toStr(fd, "summary") || null;
    const order_index = toNum(fd, "order_index");

    const rawSlug = toStr(fd, "slug") || title;
    const slug = await ensureUniqueBusinessUnitSlug(slugify(rawSlug), id);

    const supabase = await supabaseServerAction();
    const { error } = await supabase
      .from("business_units")
      .update({
        title,
        slug,
        summary,
        order_index,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return fail(error.message);

    revalidateBU();
    return ok({ id });
  } catch (e: any) {
    return fail(friendlyPostgresError(e));
  }
}

// ✅ CASCADE: on NE bloque PAS si des projets existent.
// On supprime le pôle, et Postgres supprimera automatiquement projects (ON DELETE CASCADE).
export async function deleteBusinessUnitAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminNoRedirect();
    if (!id) return fail("ID manquant.");

    const supabase = await supabaseServerAction();

    // Important: .delete().eq(...) suffit, le CASCADE est côté DB.
    const { error } = await supabase.from("business_units").delete().eq("id", id);

    if (error) return fail(friendlyPostgresError(error));

    revalidateBU();
    return ok({ id });
  } catch (e: any) {
    return fail(friendlyPostgresError(e));
  }
}

export async function reorderBusinessUnitsAction(args: {
  orderedIds: string[];
}): Promise<ActionResult<{ count: number }>> {
  try {
    await requireAdminNoRedirect();

    const supabase = await supabaseServerAction();
    const updates = args.orderedIds.map((id, idx) => ({
      id,
      order_index: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("business_units")
      .upsert(updates, { onConflict: "id" });

    if (error) return fail(error.message);

    revalidateBU();
    return ok({ count: updates.length });
  } catch (e: any) {
    return fail(friendlyPostgresError(e));
  }
}