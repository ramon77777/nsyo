// app/admin/media/actions.ts
"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { supabaseServerAction } from "@/lib/supabase/server";

function sanitizeFilename(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export async function uploadImageAndCreateMediaAction(fd: FormData) {
  const file = fd.get("file");
  const title = String(fd.get("title") ?? "").trim() || "Image";
  const folder = String(fd.get("folder") ?? "").trim() || "business-units";

  if (!(file instanceof File)) {
    return { ok: false, message: "Fichier manquant." } as const;
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "Le fichier doit être une image." } as const;
  }

  const supabase = await supabaseServerAction();

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeName = sanitizeFilename(file.name.replace(/\.[^/.]+$/, ""));
  const path = `${folder}/${safeName}-${randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) return { ok: false, message: upErr.message } as const;

  const { data, error: insErr } = await supabase
    .from("media")
    .insert({
      kind: "image",
      bucket: "images",
      path,
      public_url: null,
      title,
      description: null,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select("id,bucket,path,title")
    .single();

  if (insErr) return { ok: false, message: insErr.message } as const;

  revalidatePath("/admin/media");
  revalidatePath("/admin/projects");

  return { ok: true, media: data } as const;
}

export async function deleteMediaAction(mediaId: string) {
  const id = String(mediaId ?? "").trim();
  if (!id) {
    throw new Error("media_id manquant.");
  }

  const supabase = await supabaseServerAction();

  const { data: media, error: readErr } = await supabase
    .from("media")
    .select("id,bucket,path,thumbnail_media_id")
    .eq("id", id)
    .maybeSingle();

  if (readErr) {
    throw new Error(readErr.message);
  }
  if (!media) {
    throw new Error("Média introuvable.");
  }

  const { error: unlinkErr } = await supabase.from("project_media").delete().eq("media_id", id);
  if (unlinkErr) {
    throw new Error(unlinkErr.message);
  }

  const thumbId = (media as any).thumbnail_media_id as string | null;

  const { error: deleteErr } = await supabase.from("media").delete().eq("id", id);
  if (deleteErr) {
    throw new Error(deleteErr.message);
  }

  if ((media as any).bucket && (media as any).path) {
    await supabase.storage.from((media as any).bucket).remove([(media as any).path]);
  }

  if (thumbId) {
    const { data: thumb } = await supabase
      .from("media")
      .select("id,bucket,path")
      .eq("id", thumbId)
      .maybeSingle();

    if (thumb) {
      await supabase.from("media").delete().eq("id", thumbId);
      if ((thumb as any).bucket && (thumb as any).path) {
        await supabase.storage.from((thumb as any).bucket).remove([(thumb as any).path]);
      }
    }
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin/projects");
  revalidatePath("/");
}