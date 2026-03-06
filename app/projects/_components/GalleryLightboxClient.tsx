"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  kind: "image" | "video";
  title?: string | null;
  description?: string | null;
  public_url: string | null;
};

export default function GalleryLightboxClient({
  items,
  initialIndex = 0,
}: {
  items: Item[];
  initialIndex?: number;
}) {
  const validItems = useMemo(
    () => items.filter((x) => !!x.public_url),
    [items]
  );

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(() => {
    const i = Math.max(0, Math.min(initialIndex, validItems.length - 1));
    return Number.isFinite(i) ? i : 0;
  });

  const current = validItems[index];

  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + validItems.length) % validItems.length);
  }, [validItems.length]);
  const next = useCallback(() => {
    setIndex((i) => (i + 1) % validItems.length);
  }, [validItems.length]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };

    document.addEventListener("keydown", onKeyDown);
    // lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next]);

  if (!validItems.length) return null;

  return (
    <>
      {/* GRID - plus grand */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {validItems.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left"
          >
            {m.kind === "image" ? (
              <img
                src={m.public_url ?? ""}
                alt={m.title ?? "Image"}
                className="h-[240px] md:h-[320px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
            ) : (
              <div className="relative h-[240px] md:h-[320px] w-full">
                <video
                  className="h-full w-full object-cover"
                  preload="metadata"
                  muted
                >
                  <source src={m.public_url ?? ""} />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                <div className="absolute bottom-3 left-3 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90">
                  ▶ Vidéo
                </div>
              </div>
            )}

            {(m.title || m.description) && (
              <div className="p-4">
                {m.title && (
                  <div className="text-sm font-medium text-white/90">
                    {m.title}
                  </div>
                )}
                {m.description && (
                  <div className="mt-1 text-sm text-white/60 line-clamp-2">
                    {m.description}
                  </div>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* LIGHTBOX */}
      {open && current ? (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm"
          onMouseDown={(e) => {
            // fermer si clic sur le fond
            if (e.target === e.currentTarget) close();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative w-full max-w-5xl">
              {/* top bar */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white/90">
                    {current.title || (current.kind === "video" ? "Vidéo" : "Image")}
                  </div>
                  {current.description ? (
                    <div className="truncate text-sm text-white/60">
                      {current.description}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={close}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                >
                  Fermer ✕
                </button>
              </div>

              {/* media */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
                {current.kind === "image" ? (
                  <img
                    src={current.public_url ?? ""}
                    alt={current.title ?? "Image"}
                    className="max-h-[75vh] w-full object-contain"
                    loading="eager"
                  />
                ) : (
                  <video
                    controls
                    className="max-h-[75vh] w-full"
                    preload="metadata"
                  >
                    <source
                      src={current.public_url ?? ""}
                    />
                  </video>
                )}

                {/* nav buttons */}
                {validItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                      aria-label="Précédent"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                      aria-label="Suivant"
                    >
                      →
                    </button>
                  </>
                )}
              </div>

              {/* counter */}
              <div className="mt-3 text-center text-xs text-white/60">
                {index + 1} / {validItems.length} — (← → pour naviguer, Échap pour fermer)
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
