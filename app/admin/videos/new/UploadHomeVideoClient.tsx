// app/admin/videos/new/UploadHomeVideoClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { createHomeVideoFromUploadedFilesAction } from "../actions";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sanitizeFilename(name: string) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStoragePath(prefix: string, file: File) {
  const safe = sanitizeFilename(file.name || "file");
  return `${prefix}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
}

export default function UploadHomeVideoClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderIndex, setOrderIndex] = useState("-1");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setProgressMsg(null);

    if (!title.trim()) {
      setErrorMsg("Le titre est obligatoire.");
      return;
    }

    if (!videoFile) {
      setErrorMsg("Fichier vidéo manquant.");
      return;
    }

    startTransition(() => {
      (async () => {
        try {
          setProgressMsg("Upload de la vidéo...");

          const videoPath = buildStoragePath("videos", videoFile);

          const { error: videoUploadErr } = await supabase.storage
            .from("videos")
            .upload(videoPath, videoFile, {
              contentType: videoFile.type || "video/mp4",
              upsert: false,
              cacheControl: "3600",
            });

          if (videoUploadErr) {
            throw new Error(videoUploadErr.message);
          }

          let thumbnailPath: string | null = null;

          if (thumbnailFile) {
            setProgressMsg("Upload de la miniature...");

            thumbnailPath = buildStoragePath("thumbnails", thumbnailFile);

            const { error: thumbUploadErr } = await supabase.storage
              .from("images")
              .upload(thumbnailPath, thumbnailFile, {
                contentType: thumbnailFile.type || "image/jpeg",
                upsert: false,
                cacheControl: "3600",
              });

            if (thumbUploadErr) {
              // rollback vidéo si la miniature échoue
              await supabase.storage.from("videos").remove([videoPath]);
              throw new Error(thumbUploadErr.message);
            }
          }

          setProgressMsg("Enregistrement en base...");

          const res = await createHomeVideoFromUploadedFilesAction({
            title: title.trim(),
            description: description.trim() || null,
            order_index: Number(orderIndex),
            videoPath,
            thumbnailPath,
            videoContentType: videoFile.type || "video/mp4",
            videoSizeBytes: videoFile.size ?? null,
            thumbnailContentType: thumbnailFile?.type || null,
            thumbnailSizeBytes: thumbnailFile?.size ?? null,
          });

          if (!res.ok) {
            // rollback storage si insert DB échoue
            await supabase.storage.from("videos").remove([videoPath]);
            if (thumbnailPath) {
              await supabase.storage.from("images").remove([thumbnailPath]);
            }
            throw new Error(res.message);
          }

          router.replace("/admin/videos?saved=1");
          router.refresh();
        } catch (e: any) {
          setErrorMsg(e?.message ?? "Erreur inconnue lors de l’upload.");
          setProgressMsg(null);
        }
      })();
    });
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="grid gap-4">
        {errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {errorMsg}
          </div>
        ) : null}

        {progressMsg ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {progressMsg}
          </div>
        ) : null}

        <div>
          <div className="text-xs font-semibold text-slate-700">Titre</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="Ex: Vidéo chantier"
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-700">Description</div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="Ex: Présentation vidéo (chantier / atelier)"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-700">
              Fichier vidéo (MP4 recommandé)
            </div>
            <input
              type="file"
              accept="video/*"
              required
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700">
              Miniature (optionnel)
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:items-end">
          <div>
            <div className="text-xs font-semibold text-slate-700">order_index</div>
            <input
              value={orderIndex}
              onChange={(e) => setOrderIndex(e.target.value)}
              type="number"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
            />
            <div className="mt-1 text-xs text-slate-500">
              Mets <span className="font-mono">-1</span> pour ajouter automatiquement à la fin.
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "inline-flex items-center rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90",
                isPending && "cursor-not-allowed opacity-60"
              )}
            >
              {isPending ? "Upload en cours..." : "Uploader & Ajouter à la Home"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}