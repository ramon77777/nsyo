"use client";

import { useMemo, useState } from "react";

type GalleryItem = {
  id: string;
  kind: "image" | "video";
  title: string;
  description: string | null;
  public_url: string | null;
  thumbnail_url: string | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: GalleryItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const img = images[index];
  if (!img?.public_url) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-6xl">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {img.title || "Photo"}
              </div>
              {img.description ? (
                <div className="text-xs text-white/60 truncate">{img.description}</div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={onNext}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
              >
                Fermer
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            <img
              src={img.public_url}
              alt={img.title || "Photo"}
              className="w-full max-h-[75vh] object-contain"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectGalleryClient({ gallery }: { gallery: GalleryItem[] }) {
  const images = useMemo(
    () => gallery.filter((m) => m.kind === "image" && m.public_url),
    [gallery]
  );
  const videos = useMemo(
    () => gallery.filter((m) => m.kind === "video" && m.public_url),
    [gallery]
  );

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function close() {
    setOpenIndex(null);
  }

  function prev() {
    setOpenIndex((i) => {
      if (i == null) return i;
      return (i - 1 + images.length) % images.length;
    });
  }

  function next() {
    setOpenIndex((i) => {
      if (i == null) return i;
      return (i + 1) % images.length;
    });
  }

  if (images.length === 0 && videos.length === 0) return null;

  return (
    <div className="mt-12 space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Médias</h2>
        <p className="text-sm text-white/60">Photos et vidéos liées au projet</p>
      </div>

      {/* IMAGES (plus d'onglet) */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/85">Photos</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setOpenIndex(idx)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left",
                  "focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                )}
              >
                <img
                  src={m.public_url ?? ""}
                  alt={m.title || "Photo"}
                  className="h-56 sm:h-64 lg:h-72 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                {(m.title || m.description) && (
                  <div className="absolute bottom-3 left-3 right-3 text-xs text-white/90 opacity-0 group-hover:opacity-100 transition-opacity space-y-1">
                    {m.title ? <div className="font-medium">{m.title}</div> : null}
                    {m.description ? (
                      <div className="text-white/70 line-clamp-2">{m.description}</div>
                    ) : null}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* VIDEOS */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/85">Vidéos</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {videos.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="text-sm font-medium mb-3">{m.title || "Vidéo"}</div>
                <video controls className="w-full rounded-xl bg-black" preload="metadata">
                  <source src={m.public_url ?? ""} />
                </video>
                {m.description ? (
                  <p className="mt-3 text-sm text-white/60">{m.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {openIndex != null && images.length > 0 && (
        <Lightbox
          images={images}
          index={openIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  );
}
