// app/admin/videos/actions.ts
"use server";

import "server-only";
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
const fail = <T = never,>(message: string): ActionResult<T> => ({
  ok: false,
  message,
});

const VIDEO_BUCKET = "videos";
const THUMB_BUCKET = "images";

const VIDEO_PREFIX = "videos";
const THUMB_PREFIX = "thumbnails";

const HOME_SECTION_KEY = "home.videos";

function cleanText(v: unknown): string {
  return String(v ?? "").trim();
}

function toInt(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function sanitizeFilename(name: string) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isFile(v: unknown): v is File {
  return typeof File !== "undefined" && v instanceof File;
}

async function getHomePageId(): Promise<string | null> {
  const supabase = await supabaseServerReadonly();
  const { data, error } = await supabase
    .from("pages")
    .select("id")
    .eq("slug", "home")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as any)?.id ?? null;
}

export type MediaRow = {
  id: string;
  kind: string;
  bucket: string | null;
  path: string | null;
  public_url: string | null;
  title: string;
  description: string | null;
  created_at: string;
  thumbnail_media_id: string | null;
};

export async function listHomeVideosAdminAction(): Promise<
  ActionResult<
    Array<{
      media: MediaRow;
      order_index: number;
      section_key: string;
    }>
  >
> {
  try {
    await requireAdminNoRedirect();

    const supabase = await supabaseServerAction();
    const homeId = await getHomePageId();
    if (!homeId) return ok([]);

    const { data, error } = await supabase
      .from("page_media")
      .select(
        `
        order_index,
        section_key,
        media:media_id(
          id,kind,bucket,path,public_url,title,description,created_at,thumbnail_media_id
        )
      `
      )
      .eq("page_id", homeId)
      .eq("section_key", HOME_SECTION_KEY)
      .order("order_index", { ascending: true });

    if (error) return fail(error.message);

    const rows = (data ?? []).map((r: any) => ({
      order_index: r.order_index ?? 0,
      section_key: r.section_key ?? HOME_SECTION_KEY,
      media: r.media as MediaRow,
    }));

    return ok(rows);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur listHomeVideosAdminAction");
  }
}

export async function uploadHomeVideoAction(
  formData: FormData
): Promise<ActionResult<{ mediaId: string }>> {
  try {
    await requireAdminNoRedirect();

    const supabase = await supabaseServerAction();

    const title = cleanText(formData.get("title"));
    const description = cleanText(formData.get("description")) || null;
    const orderIndex = toInt(formData.get("order_index"), -1);

    const videoFile = formData.get("video_file");
    const thumbFile = formData.get("thumbnail_file");

    if (!title) return fail("Le titre est obligatoire.");
    if (!isFile(videoFile) || videoFile.size === 0) {
      return fail("Fichier vidéo manquant.");
    }
    if (!String(videoFile.type || "").startsWith("video/")) {
      return fail("Le fichier vidéo doit être de type video/*.");
    }

    const safeVideoName =
      sanitizeFilename(videoFile.name || "video.mp4") || "video.mp4";
    const videoPath = `${VIDEO_PREFIX}/${Date.now()}-${safeVideoName}`;

    const { error: upErr } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(videoPath, videoFile, {
        contentType: videoFile.type || "video/mp4",
        upsert: false,
        cacheControl: "3600",
      });

    if (upErr) return fail(upErr.message);

    let thumbMediaId: string | null = null;

    if (isFile(thumbFile) && thumbFile.size > 0) {
      if (!String(thumbFile.type || "").startsWith("image/")) {
        return fail("La miniature doit être une image.");
      }

      const safeThumbName =
        sanitizeFilename(thumbFile.name || "thumb.jpg") || "thumb.jpg";
      const thumbPath = `${THUMB_PREFIX}/${Date.now()}-${safeThumbName}`;

      const { error: tErr } = await supabase.storage
        .from(THUMB_BUCKET)
        .upload(thumbPath, thumbFile, {
          contentType: thumbFile.type || "image/jpeg",
          upsert: false,
          cacheControl: "3600",
        });

      if (tErr) return fail(tErr.message);

      const { data: thumbRow, error: thumbInsertErr } = await supabase
        .from("media")
        .insert({
          kind: "image",
          bucket: THUMB_BUCKET,
          path: thumbPath,
          public_url: null,
          title: `${title} (thumbnail)`,
          description: null,
        })
        .select("id")
        .single();

      if (thumbInsertErr) return fail(thumbInsertErr.message);
      thumbMediaId = thumbRow.id as string;
    }

    const { data: mediaRow, error: mErr } = await supabase
      .from("media")
      .insert({
        kind: "video",
        bucket: VIDEO_BUCKET,
        path: videoPath,
        public_url: null,
        title,
        description,
        thumbnail_media_id: thumbMediaId,
      })
      .select("id")
      .single();

    if (mErr) return fail(mErr.message);

    const mediaId = mediaRow.id as string;

    const homeId = await getHomePageId();
    if (homeId) {
      let finalOrder = orderIndex;

      if (finalOrder < 0) {
        const { data: maxRow, error: maxErr } = await supabase
          .from("page_media")
          .select("order_index")
          .eq("page_id", homeId)
          .eq("section_key", HOME_SECTION_KEY)
          .order("order_index", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (maxErr) return fail(maxErr.message);

        finalOrder =
          (maxRow as any)?.order_index != null
            ? Number((maxRow as any).order_index) + 1
            : 0;
      }

      const { error: linkErr } = await supabase.from("page_media").insert({
        page_id: homeId,
        media_id: mediaId,
        section_key: HOME_SECTION_KEY,
        order_index: finalOrder,
      });

      if (linkErr) return fail(linkErr.message);
    }

    revalidatePath("/");
    revalidatePath("/admin/videos");
    revalidatePath("/admin/videos/new");

    return ok({ mediaId });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur uploadHomeVideoAction");
  }
}

export async function updateHomeVideoMetaAction(
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await requireAdminNoRedirect();

    const supabase = await supabaseServerAction();
    const mediaId = cleanText(formData.get("media_id"));
    const title = cleanText(formData.get("title"));
    const description = cleanText(formData.get("description")) || null;

    if (!mediaId) return fail("media_id manquant.");
    if (!title) return fail("Le titre est obligatoire.");

    const { error } = await supabase
      .from("media")
      .update({ title, description })
      .eq("id", mediaId);

    if (error) return fail(error.message);

    revalidatePath("/");
    revalidatePath("/admin/videos");
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur updateHomeVideoMetaAction");
  }
}

export async function updateHomeVideoOrderAction(
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await requireAdminNoRedirect();

    const supabase = await supabaseServerAction();
    const mediaId = cleanText(formData.get("media_id"));
    const orderIndex = toInt(formData.get("order_index"), 0);

    const homeId = await getHomePageId();
    if (!homeId) return fail("Page home introuvable.");
    if (!mediaId) return fail("media_id manquant.");

    const { error } = await supabase
      .from("page_media")
      .update({ order_index: orderIndex })
      .eq("page_id", homeId)
      .eq("section_key", HOME_SECTION_KEY)
      .eq("media_id", mediaId);

    if (error) return fail(error.message);

    revalidatePath("/");
    revalidatePath("/admin/videos");
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur updateHomeVideoOrderAction");
  }
}

export async function setFeaturedHomeVideoAction(
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await requireAdminNoRedirect();

    const supabase = await supabaseServerAction();
    const mediaId = cleanText(formData.get("media_id"));

    const homeId = await getHomePageId();
    if (!homeId) return fail("Page home introuvable.");
    if (!mediaId) return fail("media_id manquant.");

    const { data, error } = await supabase
      .from("page_media")
      .select("media_id,order_index")
      .eq("page_id", homeId)
      .eq("section_key", HOME_SECTION_KEY)
      .order("order_index", { ascending: true });

    if (error) return fail(error.message);

    const rows = (data ?? []) as Array<{
      media_id: string;
      order_index: number;
    }>;

    const chosen = rows.find((r) => r.media_id === mediaId);
    if (!chosen) return fail("Cette vidéo n'est pas liée à home.videos.");

    const reordered = [
      mediaId,
      ...rows.map((r) => r.media_id).filter((id) => id !== mediaId),
    ];

    for (let i = 0; i < reordered.length; i++) {
      const id = reordered[i];
      const { error: uErr } = await supabase
        .from("page_media")
        .update({ order_index: i })
        .eq("page_id", homeId)
        .eq("section_key", HOME_SECTION_KEY)
        .eq("media_id", id);

      if (uErr) return fail(uErr.message);
    }

    revalidatePath("/");
    revalidatePath("/admin/videos");
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur setFeaturedHomeVideoAction");
  }
}

export async function deleteHomeVideoAction(
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await requireAdminNoRedirect();

    const supabase = await supabaseServerAction();
    const mediaId = cleanText(formData.get("media_id"));

    if (!mediaId) return fail("media_id manquant.");

    const homeId = await getHomePageId();
    if (!homeId) return fail("Page home introuvable.");

    const { data: media, error: mErr } = await supabase
      .from("media")
      .select("id,bucket,path,thumbnail_media_id")
      .eq("id", mediaId)
      .maybeSingle();

    if (mErr) return fail(mErr.message);

    const { error: unlinkErr } = await supabase
      .from("page_media")
      .delete()
      .eq("page_id", homeId)
      .eq("section_key", HOME_SECTION_KEY)
      .eq("media_id", mediaId);

    if (unlinkErr) return fail(unlinkErr.message);

    const { error: delErr } = await supabase
      .from("media")
      .delete()
      .eq("id", mediaId);

    if (delErr) return fail(delErr.message);

    if ((media as any)?.bucket && (media as any)?.path) {
      await supabase.storage
        .from((media as any).bucket)
        .remove([(media as any).path]);
    }

    const thumbId = (media as any)?.thumbnail_media_id as string | null;
    if (thumbId) {
      const { data: thumb, error: tReadErr } = await supabase
        .from("media")
        .select("id,bucket,path")
        .eq("id", thumbId)
        .maybeSingle();

      if (!tReadErr && thumb) {
        await supabase.from("media").delete().eq("id", thumbId);
        if ((thumb as any).bucket && (thumb as any).path) {
          await supabase.storage
            .from((thumb as any).bucket)
            .remove([(thumb as any).path]);
        }
      }
    }

    revalidatePath("/");
    revalidatePath("/admin/videos");
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur deleteHomeVideoAction");
  }
}