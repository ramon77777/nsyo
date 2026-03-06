// app/admin/business-units/[id]/sections/_components/MediaPickerModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { searchImageMediaAction, uploadImageMediaAction, type MediaPick } from "../actions";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function MediaPickerModal({
  open,
  onClose,
  onPick,
  businessUnitSlug,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (m: MediaPick) => void;
  businessUnitSlug: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MediaPick[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const canLoadMore = nextOffset != null;

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const title = useMemo(() => (q ? `Résultats pour “${q}”` : "Images"), [q]);

  async function loadFirstPage(query: string) {
    const res = await searchImageMediaAction({ q: query, offset: 0, limit: 24 });
    if (!res.ok) return;
    setItems(res.data.items);
    setNextOffset(res.data.nextOffset);
  }

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      void loadFirstPage("");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function runSearch(nextQ: string) {
    startTransition(() => {
      void loadFirstPage(nextQ);
    });
  }

  function loadMore() {
    if (nextOffset == null) return;
    startTransition(() => {
      (async () => {
        const res = await searchImageMediaAction({ q, offset: nextOffset, limit: 24 });
        if (!res.ok) return;
        setItems((prev) => [...prev, ...res.data.items]);
        setNextOffset(res.data.nextOffset);
      })();
    });
  }

  function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      alert("Le fichier doit être une image.");
      return;
    }

    startTransition(() => {
      (async () => {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("businessUnitSlug", businessUnitSlug);

        const res = await uploadImageMediaAction(fd);
        if (!res.ok) {
          alert(res.message);
          return;
        }

        setItems((prev) => [res.data, ...prev]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      })();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-80">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="absolute inset-x-0 bottom-0 top-10 md:inset-10 md:top-16">
        <div className="h-full w-full rounded-3xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 md:p-5 border-b border-slate-200 flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">Choisir une image</div>
              <div className="text-xs text-slate-600">{title}</div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch(q);
                }}
                placeholder="Rechercher (titre ou path)…"
                className="w-50 md:w-80 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => runSearch(q)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold bg-slate-950 text-white hover:opacity-90",
                  isPending && "opacity-60"
                )}
                disabled={isPending}
              >
                Rechercher
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>
          </div>

          <div className="p-4 md:p-5 border-b border-slate-200">
            <div
              className={cn(
                "rounded-2xl border-2 border-dashed p-5 transition",
                dragOver ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50"
              )}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
                handleUpload(e.dataTransfer.files);
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Importer une image</div>
                  <div className="text-xs text-slate-600">
                    Glisse-dépose un fichier ici, ou clique sur “Choisir un fichier”. (PNG / JPG / WEBP)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold bg-amber-400 text-slate-950 hover:opacity-90",
                      isPending && "opacity-60"
                    )}
                    disabled={isPending}
                  >
                    Choisir un fichier
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 md:p-5">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
                Aucune image trouvée. Tu peux importer une image juste au-dessus 👆
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onPick(m)}
                    className="group text-left rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition"
                    title={m.title}
                  >
                    <div className="relative h-36 bg-slate-100">
                      <img
                        src={m.url}
                        alt={m.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20" />
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-semibold text-slate-900 line-clamp-1">{m.title}</div>
                      <div className="mt-1 text-xs text-slate-600 line-clamp-2">{m.description ?? m.path}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {canLoadMore ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  className={cn(
                    "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100",
                    isPending && "opacity-60"
                  )}
                  disabled={isPending}
                >
                  Charger plus
                </button>
              </div>
            ) : null}
          </div>

          <div className="p-4 border-t border-slate-200 text-xs text-slate-600">
            Astuce: les fichiers sont rangés automatiquement dans{" "}
            <span className="font-mono">business-units/{businessUnitSlug}/...</span>
          </div>
        </div>
      </div>
    </div>
  );
}