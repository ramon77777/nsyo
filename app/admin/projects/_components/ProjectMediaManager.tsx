// app/admin/projects/_components/ProjectMediaManager.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProjectMediaAction,
  reorderProjectMediaAction,
  setProjectCoverAction,
  uploadProjectMediaAction,
} from "../media/actions";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ProjectMediaItem = {
  media_id: string;
  order_index: number;
  is_cover: boolean;

  public_url: string | null;
  title: string;
  description: string | null;
  mime_type: string | null;
  kind: string; // image | video | audio | file
};

function sortItems(list: ProjectMediaItem[]) {
  const arr = [...(list ?? [])];
  arr.sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
    if (a.order_index !== b.order_index) return a.order_index - b.order_index;
    return a.media_id.localeCompare(b.media_id);
  });
  return arr;
}

function isVideo(it: ProjectMediaItem) {
  const mt = (it.mime_type ?? "").toLowerCase();
  return it.kind === "video" || mt.startsWith("video/");
}

export default function ProjectMediaManager({
  projectId,
  initialItems,
}: {
  projectId: string;
  initialItems: ProjectMediaItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Reset file input reliably
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Local items state (évite mutations)
  const [itemsState, setItemsState] = useState<ProjectMediaItem[]>(() =>
    sortItems(initialItems ?? [])
  );

  useEffect(() => {
    setItemsState(sortItems(initialItems ?? []));
  }, [initialItems]);

  const items = useMemo(() => sortItems(itemsState), [itemsState]);

  function resetUploadForm() {
    setFile(null);
    setTitle("");
    setDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function doUpload() {
    setError(null);
    if (!file) {
      setError("Sélectionne un fichier avant d’uploader.");
      return;
    }

    const fd = new FormData();
    fd.set("file", file);
    if (title.trim()) fd.set("title", title.trim());
    if (description.trim()) fd.set("description", description.trim());

    const res = await uploadProjectMediaAction(projectId, fd);
    if (!res.ok) {
      setError(res.message);
      return;
    }

    resetUploadForm();
    router.refresh();
  }

  async function doSetCover(mediaId: string) {
    setError(null);
    const res = await setProjectCoverAction(projectId, mediaId);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  async function doDelete(mediaId: string) {
    setError(null);
    const res = await deleteProjectMediaAction(projectId, mediaId);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  async function doMove(mediaId: string, direction: -1 | 1) {
    setError(null);

    const current = sortItems(itemsState);
    const idx = current.findIndex((x) => x.media_id === mediaId);
    if (idx < 0) return;

    const swapWith = idx + direction;
    if (swapWith < 0 || swapWith >= current.length) return;

    const next = current.map((x) => ({ ...x }));

    const a = next[idx];
    const b = next[swapWith];

    const tmp = a.order_index;
    a.order_index = b.order_index;
    b.order_index = tmp;

    // Optimistic UI
    setItemsState(next);

    const res = await reorderProjectMediaAction(projectId, [
      { media_id: a.media_id, order_index: a.order_index },
      { media_id: b.media_id, order_index: b.order_index },
    ]);

    if (!res.ok) {
      setError(res.message);
      // rollback => resync depuis serveur (initialItems après refresh)
      setItemsState(sortItems(initialItems ?? []));
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Médias du projet</div>
          <p className="mt-1 text-sm text-slate-600">
            Ajoute des images/vidéos. Choisis un cover et organise l’ordre.
          </p>
        </div>

        <div className="text-sm text-slate-600">
          {items.length} média{items.length > 1 ? "s" : ""}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {/* Upload */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-900">Fichier *</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="md:col-span-4">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-900">Titre</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Chantier - vue 1"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="md:col-span-4">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-900">Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionnel"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="md:col-span-12 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending || !file}
              onClick={() => startTransition(doUpload)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                "bg-slate-950 hover:opacity-90",
                (isPending || !file) && "opacity-60 cursor-not-allowed"
              )}
            >
              {isPending ? "Upload..." : "Ajouter"}
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={resetUploadForm}
              className={cn(
                "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50",
                isPending && "opacity-60 cursor-not-allowed"
              )}
            >
              Réinitialiser
            </button>

            {file ? (
              <div className="text-sm text-slate-600">
                Fichier : <span className="font-mono">{file.name}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Liste */}
      {items.length === 0 ? (
        <div className="mt-6 text-sm text-slate-600">Aucun média pour l’instant.</div>
      ) : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {items.map((it) => (
            <li key={it.media_id} className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="bg-slate-50">
                {it.public_url ? (
                  isVideo(it) ? (
                    <video
                      src={it.public_url}
                      className="h-44 w-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.public_url}
                      alt={it.title}
                      className="h-44 w-full object-cover"
                      loading="lazy"
                    />
                  )
                ) : (
                  <div className="flex h-44 items-center justify-center text-sm text-slate-500">
                    Pas d’aperçu
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{it.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {it.kind} {it.mime_type ? `• ${it.mime_type}` : ""}
                    </div>
                  </div>

                  {it.is_cover ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                      Cover
                    </span>
                  ) : null}
                </div>

                {it.description ? (
                  <div className="mt-2 text-sm text-slate-700">{it.description}</div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => doSetCover(it.media_id))}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-semibold",
                      it.is_cover
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                      isPending && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    Définir cover
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => doMove(it.media_id, -1))}
                    className={cn(
                      "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50",
                      isPending && "opacity-60 cursor-not-allowed"
                    )}
                    title="Monter"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => doMove(it.media_id, 1))}
                    className={cn(
                      "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50",
                      isPending && "opacity-60 cursor-not-allowed"
                    )}
                    title="Descendre"
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => doDelete(it.media_id))}
                    className={cn(
                      "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100",
                      isPending && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
