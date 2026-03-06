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

function toNum(fd: FormData, key: string, fallback = 0) {
  const s = toStr(fd, key);
  if (!s) return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
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

function revalidateBU() {
  revalidatePath("/admin/business-units");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/references");
}

function friendlyPostgresError(e: any): string {
  const code = String(e?.code ?? "");
  const msg = String(e?.message ?? "").trim();
  const details = String(e?.details ?? "").trim();

  if (code === "23505" || msg.toLowerCase().includes("duplicate key")) {
    return "Une valeur unique existe déjà (par exemple le slug).";
  }

  if (code === "23503" || msg.toLowerCase().includes("foreign key")) {
    return (
      "Suppression impossible car d’autres éléments dépendent encore de ce pôle. " +
      "Vérifie les relations de base de données encore actives."
    );
  }

  if (code === "42501") {
    return "Accès refusé par Supabase/RLS.";
  }

  if (msg) return details ? `${msg} — ${details}` : msg;
  return "Erreur serveur.";
}

async function ensureUniqueBusinessUnitSlug(
  baseSlug: string,
  excludeId?: string
) {
  const supabase = await supabaseServerReadonly();

  const normalizedBase = slugify(baseSlug || "pole") || "pole";
  let candidate = normalizedBase;

  for (let i = 0; i < 200; i++) {
    let query = supabase
      .from("business_units")
      .select("id")
      .eq("slug", candidate);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }

    candidate = `${normalizedBase}-${i + 1}`;
  }

  return `${normalizedBase}-${Date.now()}`;
}

export async function createBusinessUnitAction(
  fd: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminNoRedirect();

    const title = toStr(fd, "title");
    if (!title) {
      return fail("Le titre est obligatoire.");
    }

    const summary = toStr(fd, "summary") || null;
    const order_index = toNum(fd, "order_index", 0);

    const rawSlug = toStr(fd, "slug") || title;
    const normalizedSlug = slugify(rawSlug) || slugify(title) || "pole";
    const slug = await ensureUniqueBusinessUnitSlug(normalizedSlug);

    const supabase = await supabaseServerAction();

    const { data, error } = await supabase
      .from("business_units")
      .insert({
        name: title,
        title: title,
        slug,
        summary,
        order_index,
      })
      .select("id")
      .single();

    if (error) {
      return fail(friendlyPostgresError(error));
    }

    revalidateBU();
    return ok({ id: String((data as any).id) });
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

    if (!id) {
      return fail("ID manquant.");
    }

    const title = toStr(fd, "title");
    if (!title) {
      return fail("Le titre est obligatoire.");
    }

    const summary = toStr(fd, "summary") || null;
    const order_index = toNum(fd, "order_index", 0);

    const rawSlug = toStr(fd, "slug") || title;
    const normalizedSlug = slugify(rawSlug) || slugify(title) || "pole";
    const slug = await ensureUniqueBusinessUnitSlug(normalizedSlug, id);

    const supabase = await supabaseServerAction();

    const { error } = await supabase
      .from("business_units")
      .update({
        name: title,
        title: title,
        slug,
        summary,
        order_index,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return fail(friendlyPostgresError(error));
    }

    revalidateBU();
    return ok({ id });
  } catch (e: any) {
    return fail(friendlyPostgresError(e));
  }
}

export async function deleteBusinessUnitAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminNoRedirect();

    if (!id) {
      return fail("ID manquant.");
    }

    const supabase = await supabaseServerAction();

    const { error } = await supabase
      .from("business_units")
      .delete()
      .eq("id", id);

    if (error) {
      return fail(friendlyPostgresError(error));
    }

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

    const orderedIds = Array.isArray(args.orderedIds)
      ? args.orderedIds.filter(Boolean)
      : [];

    if (!orderedIds.length) {
      return fail("Aucun élément à réordonner.");
    }

    const supabase = await supabaseServerAction();

    const updates = orderedIds.map((id, idx) => ({
      id,
      order_index: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("business_units")
      .upsert(updates, { onConflict: "id" });

    if (error) {
      return fail(friendlyPostgresError(error));
    }

    revalidateBU();
    return ok({ count: updates.length });
  } catch (e: any) {
    return fail(friendlyPostgresError(e));
  }
}