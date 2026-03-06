// app/admin/projects/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServerAction, supabaseServerReadonly } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; message: string };
function fail(message: string): ActionResult {
  return { ok: false, message };
}

function isNextInternalNavigationError(err: unknown): boolean {
  if (err == null) return false;

  if (typeof err === "string") {
    return /NEXT_(REDIRECT|NOT_FOUND)/.test(err);
  }

  if (typeof err === "object") {
    const anyErr = err as any;

    const digest = typeof anyErr?.digest === "string" ? anyErr.digest : "";
    if (/NEXT_(REDIRECT|NOT_FOUND)/.test(digest)) return true;

    const message = typeof anyErr?.message === "string" ? anyErr.message : "";
    if (/NEXT_(REDIRECT|NOT_FOUND)/.test(message)) return true;

    try {
      const s = String(anyErr);
      if (/NEXT_(REDIRECT|NOT_FOUND)/.test(s)) return true;
    } catch {}
  }

  try {
    return /NEXT_(REDIRECT|NOT_FOUND)/.test(String(err));
  } catch {
    return false;
  }
}

function toStr(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function toNullableStr(fd: FormData, key: string) {
  const s = toStr(fd, key);
  return s.length ? s : null;
}

function toBool(fd: FormData, key: string) {
  return fd.get(key) === "on";
}

// ✅ Date = TEXTE LIBRE (pas de validation Date)
function toNullableText(fd: FormData, key: string) {
  const s = toStr(fd, key);
  return s.length ? s : null;
}

function nowIso() {
  return new Date().toISOString();
}

function slugifyLocal(input: string) {
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

async function ensureUniqueSlug(baseSlug: string, excludeId?: string) {
  const supabase = await supabaseServerReadonly();

  const safeBase = baseSlug.trim() || "projet";
  let candidate = safeBase;
  let i = 0;

  while (i < 200) {
    let q = supabase.from("projects").select("id").eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);

    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);

    if (!data) return candidate;

    i += 1;
    candidate = `${safeBase}-${i}`;
  }

  return `${safeBase}-${Date.now()}`;
}

function revalidateAllProjectPaths(id?: string) {
  revalidatePath("/admin/projects");
  revalidatePath("/projects"); // ✅ utile si tu as une page liste côté client
  if (id) {
    revalidatePath(`/admin/projects/${id}`);
    revalidatePath(`/admin/projects/${id}/edit`);
    // page publique (slug) => revalidate globale projects
    revalidatePath(`/projects`);
  }
}

async function businessUnitExists(id: string): Promise<boolean> {
  const supabase = await supabaseServerReadonly();
  const { data, error } = await supabase
    .from("business_units")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return !!data;
}

export async function createProjectAction(fd: FormData): Promise<ActionResult> {
  try {
    const business_unit_id = toStr(fd, "business_unit_id");
    if (!business_unit_id) return fail("Le pôle (business unit) est obligatoire.");

    if (!(await businessUnitExists(business_unit_id))) {
      return fail("Pôle invalide (business unit introuvable).");
    }

    const title = toStr(fd, "title");
    if (!title) return fail("Le titre est obligatoire.");

    const description = toStr(fd, "description");
    if (!description) return fail("La description est obligatoire.");

    const location = toNullableStr(fd, "location");
    const date = toNullableText(fd, "date"); // ✅ TEXTE
    const is_featured = toBool(fd, "is_featured");
    const category = toNullableStr(fd, "category");

    const slugInput = toStr(fd, "slug") || title;
    const baseSlug = slugifyLocal(slugInput);
    const slug = await ensureUniqueSlug(baseSlug);

    const supabase = await supabaseServerAction();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        business_unit_id,
        title,
        slug,
        description,
        category,
        location,
        date,
        is_featured,
        updated_at: nowIso(),
      })
      .select("id,slug")
      .single();

    if (error) return fail(error.message);

    revalidateAllProjectPaths();

    const created = data as any;
    const id = created?.id as string | undefined;
    if (!id) redirect("/admin/projects?created=1");

    redirect(`/admin/projects/${id}?created=1`);
  } catch (e: any) {
    if (isNextInternalNavigationError(e)) throw e;
    return fail(e?.message ?? "Erreur serveur lors de la création.");
  }
}

export async function updateProjectAction(id: string, fd: FormData): Promise<ActionResult> {
  try {
    if (!id) return fail("ID manquant.");

    const business_unit_id = toStr(fd, "business_unit_id");
    if (!business_unit_id) return fail("Le pôle (business unit) est obligatoire.");

    if (!(await businessUnitExists(business_unit_id))) {
      return fail("Pôle invalide (business unit introuvable).");
    }

    const title = toStr(fd, "title");
    if (!title) return fail("Le titre est obligatoire.");

    const description = toStr(fd, "description");
    if (!description) return fail("La description est obligatoire.");

    const location = toNullableStr(fd, "location");
    const date = toNullableText(fd, "date"); // ✅ TEXTE
    const is_featured = toBool(fd, "is_featured");
    const category = toNullableStr(fd, "category");

    const slugInput = toStr(fd, "slug") || title;
    const baseSlug = slugifyLocal(slugInput);
    const slug = await ensureUniqueSlug(baseSlug, id);

    const supabase = await supabaseServerAction();

    const { error } = await supabase
      .from("projects")
      .update({
        business_unit_id,
        title,
        slug,
        description,
        category,
        location,
        date,
        is_featured,
        updated_at: nowIso(),
      })
      .eq("id", id);

    if (error) return fail(error.message);

    revalidateAllProjectPaths(id);
    redirect(`/admin/projects/${id}?updated=1`);
  } catch (e: any) {
    if (isNextInternalNavigationError(e)) throw e;
    return fail(e?.message ?? "Erreur serveur lors de la mise à jour.");
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  try {
    if (!id) return fail("ID manquant.");

    const supabase = await supabaseServerAction();
    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) return fail(error.message);

    revalidateAllProjectPaths();
    redirect("/admin/projects?deleted=1");
  } catch (e: any) {
    if (isNextInternalNavigationError(e)) throw e;
    return fail(e?.message ?? "Erreur serveur lors de la suppression.");
  }
}
