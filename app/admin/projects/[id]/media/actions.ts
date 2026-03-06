// app/admin/projects/[id]/media/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAction } from "@/lib/supabase/server";

type UploadKind = "image" | "video";
type UploadBucket = "images" | "videos";
type SupabaseActionClient = Awaited<ReturnType<typeof supabaseServerAction>>;

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

function inferKindAndBucket(file: File): { kind: UploadKind; bucket: UploadBucket } {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return { kind: "image", bucket: "images" };
  if (mime.startsWith("video/")) return { kind: "video", bucket: "videos" };

  const name = (file.name || "").toLowerCase();
  if (/\.(png|jpg|jpeg|webp|gif|avif)$/.test(name)) return { kind: "image", bucket: "images" };
  if (/\.(mp4|mov|webm|mkv|avi)$/.test(name)) return { kind: "video", bucket: "videos" };

  throw new Error("Type de fichier non supporté (image ou vidéo uniquement).");
}

function safeText(v: unknown, fallback = ""): string {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v: unknown): boolean {
  return v === "1" || v === "true" || v === "on" || v === true;
}

function getPublicUrl(
  supabase: SupabaseActionClient,
  bucket: string,
  path: string,
  existing?: string | null
) {
  return existing ?? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function getFileExt(file: File) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return ext.replace(/[^a-z0-9]/g, "");
}

function buildStoragePath(projectId: string, file: File) {
  const ext = getFileExt(file);
  const suffix = ext ? `.${ext}` : "";
  return `projects/${projectId}/${crypto.randomUUID()}${suffix}`;
}

function assertFileSize(kind: UploadKind, size: number) {
  if (kind === "image" && size > MAX_IMAGE_BYTES) {
    throw new Error(`Image trop lourde. Max ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB.`);
  }
  if (kind === "video" && size > MAX_VIDEO_BYTES) {
    throw new Error(`Vidéo trop lourde. Max ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB.`);
  }
}

export async function uploadAndLinkMedia(projectId: string, formData: FormData) {
  const supabase = await supabaseServerAction();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Fichier manquant.");

  const { kind, bucket } = inferKindAndBucket(file);
  assertFileSize(kind, file.size ?? 0);

  const title = safeText(formData.get("title"), file.name || "Media");
  const description = safeText(formData.get("description")) || null;

  const orderIndex = toNumber(formData.get("order_index"), 0);
  const isCover = toBool(formData.get("is_cover"));

  const path = buildStoragePath(projectId, file);

  const up = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
    cacheControl: "3600",
  });

  if (up.error) throw new Error(up.error.message);

  const url = getPublicUrl(supabase, bucket, path, null);

  let mediaId: string | null = null;

  try {
    const { data: inserted, error: iErr } = await supabase
      .from("media")
      .insert({
        kind,
        bucket,
        path,
        public_url: url,
        title,
        description,
        mime_type: file.type || null,
        size_bytes: file.size ?? null,
      })
      .select("id")
      .single();

    if (iErr) throw new Error(iErr.message);

    mediaId = inserted.id as string;

    const { error: lErr } = await supabase.from("project_media").insert({
      project_id: projectId,
      media_id: mediaId,
      order_index: orderIndex,
      is_cover: isCover,
    });

    if (lErr) throw new Error(lErr.message);

    if (isCover) {
      const { error: cErr } = await supabase
        .from("project_media")
        .update({ is_cover: false })
        .eq("project_id", projectId)
        .neq("media_id", mediaId);

      if (cErr) throw new Error(cErr.message);
    }

    revalidatePath(`/admin/projects/${projectId}/media`);
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/references`);
    revalidatePath(`/`);
  } catch (err) {
    if (mediaId) await supabase.from("media").delete().eq("id", mediaId);
    await supabase.storage.from(bucket).remove([path]);
    throw err;
  }
}

export async function uploadProjectMedia(projectId: string, formData: FormData) {
  return uploadAndLinkMedia(projectId, formData);
}

export async function linkExistingMedia(projectId: string, formData: FormData) {
  const supabase = await supabaseServerAction();

  const mediaId = safeText(formData.get("media_id"));
  if (!mediaId) throw new Error("media_id manquant.");

  const orderIndex = toNumber(formData.get("order_index"), 0);
  const isCover = toBool(formData.get("is_cover"));

  const { error } = await supabase.from("project_media").upsert(
    { project_id: projectId, media_id: mediaId, order_index: orderIndex, is_cover: isCover },
    { onConflict: "project_id,media_id" }
  );

  if (error) throw new Error(error.message);

  if (isCover) {
    const { error: cErr } = await supabase
      .from("project_media")
      .update({ is_cover: false })
      .eq("project_id", projectId)
      .neq("media_id", mediaId);

    if (cErr) throw new Error(cErr.message);
  }

  revalidatePath(`/admin/projects/${projectId}/media`);
}

export async function setCover(projectId: string, mediaId: string) {
  const supabase = await supabaseServerAction();

  const { error: offErr } = await supabase
    .from("project_media")
    .update({ is_cover: false })
    .eq("project_id", projectId);

  if (offErr) throw new Error(offErr.message);

  const { error: onErr } = await supabase
    .from("project_media")
    .update({ is_cover: true })
    .eq("project_id", projectId)
    .eq("media_id", mediaId);

  if (onErr) throw new Error(onErr.message);

  revalidatePath(`/admin/projects/${projectId}/media`);
}

export async function saveOrder(projectId: string, formData: FormData) {
  const supabase = await supabaseServerAction();

  const updates: Array<{ project_id: string; media_id: string; order_index: number }> = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("order_")) continue;
    const mediaId = key.replace("order_", "").trim();
    if (!mediaId) continue;

    updates.push({
      project_id: projectId,
      media_id: mediaId,
      order_index: toNumber(value, 0),
    });
  }

  if (!updates.length) return;

  const { error } = await supabase.from("project_media").upsert(updates, {
    onConflict: "project_id,media_id",
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/projects/${projectId}/media`);
}

export async function unlinkMedia(projectId: string, mediaId: string) {
  const supabase = await supabaseServerAction();

  const { error } = await supabase
    .from("project_media")
    .delete()
    .eq("project_id", projectId)
    .eq("media_id", mediaId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/projects/${projectId}/media`);
}