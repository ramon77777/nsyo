"use client";

import type { SVGProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export type GalleryItem = {
  id: string;
  kind: "image" | "video";
  title: string;
  description: string | null;
  public_url: string | null;
  thumbnail_url: string | null;
};

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" />
    </svg>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function GalleryMedia({
  items,
  title = "Galerie",
  subtitle = "Images & vidéos issues de nos projets sur cette activité.",
}: {
  items: GalleryItem[];
  title?: string;
  subtitle?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const active = useMemo(
    () => items.find((x) => x.id === openId) ?? null,
    [items, openId]
  );

  // UX: lock scroll + ESC + focus close
  useEffect(() => {
    if (!openId) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKeyDown);

    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(t);
    };
  }, [openId]);

  if (!items?.length) return null;

  return (
    <section className="py-16 bg-slate-50">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-2 text-slate-600">{subtitle}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => {
          const titleSafe = m.title?.trim() || "Média";
          const descSafe = m.description?.trim() || null;

          const thumb =
            m.thumbnail_url ?? (m.kind === "image" ? m.public_url : null);

          const canOpen = Boolean(m.public_url);

          return (
            <article
              key={m.id}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => canOpen && setOpenId(m.id)}
                className={cn(
                  "block w-full text-left",
                  !canOpen && "cursor-not-allowed opacity-70"
                )}
                aria-label={
                  canOpen ? `Ouvrir: ${titleSafe}` : `Média indisponible: ${titleSafe}`
                }
              >
                <div className="relative aspect-video bg-slate-900">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={titleSafe}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
                  )}

                  {/* overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent opacity-100" />

                  <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {m.kind === "video" ? "Vidéo" : "Image"}
                  </div>

                  {m.kind === "video" ? (
                    <div className="absolute inset-0 grid place-items-center">
                      <div
                        className={cn(
                          "grid h-14 w-14 place-items-center rounded-full",
                          "bg-white/95 text-slate-950 shadow-lg ring-1 ring-black/10",
                          "transition duration-200",
                          canOpen ? "group-hover:scale-105" : "opacity-60"
                        )}
                      >
                        <PlayIcon className="h-7 w-7 translate-x-px" />
                      </div>
                    </div>
                  ) : null}

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-sm font-semibold text-white line-clamp-1">
                      {titleSafe}
                    </div>
                    {descSafe ? (
                      <div className="mt-1 text-xs text-white/80 line-clamp-1">
                        {descSafe}
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>

              <div className="p-6">
                <div className="text-base font-bold text-slate-900 line-clamp-1">
                  {titleSafe}
                </div>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                  {descSafe ?? "Média issu d’un projet NSYO."}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal */}
      {active ? (
        <div
         className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={active.title || "Média"}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenId(null);
          }}
        >
          <div className="mx-auto flex h-full max-w-5xl items-center px-4">
            <div className="w-full overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white line-clamp-1">
                    {active.title}
                  </div>
                  {active.description?.trim() ? (
                    <div className="mt-1 text-xs text-white/70 line-clamp-1">
                      {active.description.trim()}
                    </div>
                  ) : null}
                </div>

                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
                  aria-label="Fermer"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="relative aspect-video bg-black">
                {active.kind === "image" ? (
                  active.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={active.public_url}
                      alt={active.title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full" />
                  )
                ) : active.public_url ? (
                  <video
                    key={active.id}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-contain"
                    poster={active.thumbnail_url ?? undefined}
                  >
                    <source src={active.public_url} type="video/mp4" />
                  </video>
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
