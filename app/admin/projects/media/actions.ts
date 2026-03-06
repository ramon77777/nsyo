// app/admin/projects/media/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAction, supabaseServerReadonly } from "@/lib/supabase/server";

/* ----------------------------------------
   Types (A++)
----------------------------------------- */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

const ok = <T = undefined>(data?: T): ActionResult<T> => ({ ok: true, ...(typeof data === "undefined" ? {} : { data }) });
const fail = <T = never>(message: string): ActionResult<T> => ({ ok: false, message });

/* ----------------------------------------
   Consts
----------------------------------------- */
const IMAGE_BUCKET = "images";
const VIDEO_BUCKET = "videos";
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB (aligné avec next.config.ts)

/* ----------------------------------------
   Utils
----------------------------------------- */
function isUuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type MediaKind = "image" | "video" | "audio" | "file";

function kindFromMime(mime: string | null | undefined): MediaKind {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  return "file";
}

function bucketForKind(kind: MediaKind) {
  return kind === "video" ? VIDEO_BUCKET : IMAGE_BUCKET;
}

function safeSlugPart(input: string) {
  return (input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function safeFileName(originalName: string) {
  const clean = safeSlugPart(originalName || "file");
  return clean.trim() ? clean : "file";
}

function revalidateProjectPaths(projectId: string) {
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/edit`);
  revalidatePath("/admin/media");
}

async function projectExists(projectId: string) {
  const supabase = await supabaseServerReadonly();
  const { data, error } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

async function nextOrderIndex(projectId: string) {
  const supabase = await supabaseServerReadonly();
  const { data, error } = await supabase
    .from("project_media")
    .select("order_index")
    .eq("project_id", projectId)
    .order("order_index", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const max = Number(data?.[0]?.order_index ?? 0);
  return Number.isFinite(max) ? max + 1 : 1;
}

/* ----------------------------------------
   Actions
----------------------------------------- */

export async function uploadProjectMediaAction(
  projectId: string,
  fd: FormData
): Promise<ActionResult<{ media_id: string }>> {
  try {
    if (!isUuid(projectId)) return fail("Project ID invalide.");
    if (!(await projectExists(projectId))) return fail("Projet introuvable.");

    const file = fd.get("file");
    if (!(file instanceof File)) return fail("Aucun fichier reçu (file manquant).");
    if (file.size <= 0) return fail("Fichier vide.");
    if (file.size > MAX_FILE_BYTES) return fail(`Fichier trop volumineux (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB).`);

    const titleRaw =
      (typeof fd.get("title") === "string" ? String(fd.get("title")) : "") || file.name || "media";
    const title = titleRaw.trim() || "media";

    const descRaw = typeof fd.get("description") === "string" ? String(fd.get("description")) : "";
    const description = descRaw.trim() ? descRaw.trim() : null;

    const mime_type = file.type || null;
    const kind = kindFromMime(mime_type);
    const bucket = bucketForKind(kind);

    const supabase = await supabaseServerAction();

    // 1) create media row (pending)
    const { data: inserted, error: insErr } = await supabase
      .from("media")
      .insert({
        kind,
        bucket,
        path: "pending",
        public_url: null,
        title,
        description,
        mime_type,
        size_bytes: file.size,
      })
      .select("id")
      .single();

    if (insErr) return fail(insErr.message);

    const mediaId = String((inserted as any)?.id ?? "");
    if (!isUuid(mediaId)) return fail("Impossible de créer le média (id invalide).");

    // 2) upload storage
    const filename = safeFileName(file.name || "file");
    const path = `projects/${projectId}/${mediaId}-${filename}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mime_type ?? undefined,
    });

    if (upErr) {
      await supabase.from("media").delete().eq("id", mediaId);
      return fail(upErr.message);
    }

    // 3) public url (bucket public)
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const public_url = pub?.publicUrl ?? null;

    // 4) update media row
    const { error: updErr } = await supabase.from("media").update({ path, public_url }).eq("id", mediaId);

    if (updErr) {
      await supabase.storage.from(bucket).remove([path]).catch(() => {});
      await supabase.from("media").delete().eq("id", mediaId);
      return fail(updErr.message);
    }

    // 5) link project_media
    const order_index = await nextOrderIndex(projectId);

    const { error: linkErr } = await supabase.from("project_media").insert({
      project_id: projectId,
      media_id: mediaId,
      order_index,
      is_cover: false,
    });

    if (linkErr) {
      await supabase.storage.from(bucket).remove([path]).catch(() => {});
      await supabase.from("media").delete().eq("id", mediaId);
      return fail(linkErr.message);
    }

    revalidateProjectPaths(projectId);
    return ok({ media_id: mediaId });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur serveur (upload).");
  }
}

export async function setProjectCoverAction(projectId: string, mediaId: string): Promise<ActionResult> {
  try {
    if (!isUuid(projectId)) return fail("Project ID invalide.");
    if (!isUuid(mediaId)) return fail("Media ID invalide.");

    const supabase = await supabaseServerAction();

    const { data: link, error: linkErr } = await supabase
      .from("project_media")
      .select("project_id,media_id")
      .eq("project_id", projectId)
      .eq("media_id", mediaId)
      .maybeSingle();

    if (linkErr) return fail(linkErr.message);
    if (!link) return fail("Ce média n’est pas lié à ce projet.");

    const { error: resetErr } = await supabase
      .from("project_media")
      .update({ is_cover: false })
      .eq("project_id", projectId);

    if (resetErr) return fail(resetErr.message);

    const { error: setErr } = await supabase
      .from("project_media")
      .update({ is_cover: true })
      .eq("project_id", projectId)
      .eq("media_id", mediaId);

    if (setErr) return fail(setErr.message);

    revalidateProjectPaths(projectId);
    return ok();
  } catch (e: any) {
    return fail(e?.message ?? "Erreur serveur (cover).");
  }
}

export async function reorderProjectMediaAction(
  projectId: string,
  items: Array<{ media_id: string; order_index: number }>
): Promise<ActionResult> {
  try {
    if (!isUuid(projectId)) return fail("Project ID invalide.");
    if (!Array.isArray(items) || items.length === 0) return fail("Liste vide.");

    for (const it of items) {
      if (!isUuid(it?.media_id)) return fail("media_id invalide.");
      if (!Number.isFinite(it?.order_index)) return fail("order_index invalide.");
    }

    const supabase = await supabaseServerAction();

    const results = await Promise.all(
      items.map((it) =>
        supabase
          .from("project_media")
          .update({ order_index: it.order_index })
          .eq("project_id", projectId)
          .eq("media_id", it.media_id)
      )
    );

    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) return fail(firstErr.message);

    revalidateProjectPaths(projectId);
    return ok();
  } catch (e: any) {
    return fail(e?.message ?? "Erreur serveur (reorder).");
  }
}

export async function deleteProjectMediaAction(projectId: string, mediaId: string): Promise<ActionResult> {
  try {
    if (!isUuid(projectId)) return fail("Project ID invalide.");
    if (!isUuid(mediaId)) return fail("Media ID invalide.");

    const supabase = await supabaseServerAction();

    const { data: media, error: mErr } = await supabase
      .from("media")
      .select("id,bucket,path")
      .eq("id", mediaId)
      .maybeSingle();

    if (mErr) return fail(mErr.message);

    const { error: delLinkErr } = await supabase
      .from("project_media")
      .delete()
      .eq("project_id", projectId)
      .eq("media_id", mediaId);

    if (delLinkErr) return fail(delLinkErr.message);

    // si pas de media row, terminé
    if (!media) {
      revalidateProjectPaths(projectId);
      return ok();
    }

    // encore utilisé ailleurs ?
    const { data: stillUsed, error: usedErr } = await supabase
      .from("project_media")
      .select("project_id")
      .eq("media_id", mediaId)
      .limit(1);

    if (usedErr) return fail(usedErr.message);

    const isUsedElsewhere = (stillUsed ?? []).length > 0;

    if (!isUsedElsewhere) {
      const bucket = String((media as any).bucket ?? "");
      const path = String((media as any).path ?? "");

      if (bucket && path && path !== "pending") {
        await supabase.storage.from(bucket).remove([path]).catch(() => {});
      }

      await supabase.from("media").delete().eq("id", mediaId);
    }

    revalidateProjectPaths(projectId);
    return ok();
  } catch (e: any) {
    return fail(e?.message ?? "Erreur serveur (delete media).");
  }
}
