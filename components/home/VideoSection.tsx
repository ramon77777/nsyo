"use client";

import Container from "@/components/layout/Container";
import { useEffect, useMemo, useRef, useState } from "react";

type VideoItem = {
  id: string;
  title: string;
  description?: string | null;
  public_url?: string | null;
  thumbnail_url?: string | null;
};

function XIcon(props: React.SVGProps<SVGSVGElement>) {
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

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" />
    </svg>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function VideoSection({
  items,
  title = "Vidéos",
  subtitle = "Plongez au cœur de nos chantiers et interventions.",
}: {
  items: VideoItem[];
  title?: string;
  subtitle?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const safeItems = useMemo(
    () => (items ?? []).filter((v) => Boolean(v.public_url)),
    [items]
  );

  const active = useMemo(
    () => safeItems.find((v) => v.id === openId) ?? null,
    [safeItems, openId]
  );

  // UX: lock scroll + ESC to close + focus management
  useEffect(() => {
    if (!openId) return;

    setVideoError(null);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKeyDown);

    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(t);
    };
  }, [openId]);

  if (!safeItems.length) return null;

  return (
    <section className="py-16 bg-slate-50">
      <Container>
        {/* Header */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-2 text-slate-600">{subtitle}</p>
          </div>

          <a
            href="/contact"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Demander un devis <span aria-hidden>→</span>
          </a>
        </div>

        {/* Toutes les cards ont la même taille */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {safeItems.slice(0, 6).map((v, idx) => {
            const isFeatured = idx === 0;

            return (
              <article
                key={v.id}
                className={cn(
                  "group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm",
                  "transition hover:-translate-y-1 hover:shadow-lg"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(v.id)}
                  className="relative block w-full text-left"
                  aria-label={`Lire la vidéo: ${v.title}`}
                >
                  <div className="relative aspect-video bg-slate-900">
                    {v.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail_url}
                        alt={v.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />

                    <div className="absolute inset-0 grid place-items-center">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-slate-950 shadow-lg ring-1 ring-black/10 transition duration-200 group-hover:scale-105">
                        <PlayIcon className="h-6 w-6 translate-x-px" />
                      </div>
                    </div>

                    <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {isFeatured ? "À la une" : "Vidéo"}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="text-sm font-semibold text-white line-clamp-1">
                        {v.title}
                      </div>
                      {v.description ? (
                        <div className="mt-1 text-xs text-white/80 line-clamp-2">
                          {v.description}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>

                {/* Partie texte : hauteur stabilisée */}
                <div className="p-5">
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {v.title}
                  </h3>

                  {/* ✅ min-h-[40px] -> min-h-10 */}
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2 min-h-10">
                    {v.description?.trim()
                      ? v.description
                      : "Découvrir cette intervention en vidéo."}
                  </p>

                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-slate-900">
                    Lire{" "}
                    <span className="ml-1 transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* CTA Mobile */}
        <div className="mt-6 sm:hidden">
          <a
            href="/contact"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Demander un devis <span aria-hidden>→</span>
          </a>
        </div>
      </Container>

      {/* Modal */}
      {active ? (
        <div
          className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Lecture vidéo: ${active.title}`}
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
                  {active.description ? (
                    <div className="mt-1 text-xs text-white/70 line-clamp-1">
                      {active.description}
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
                {active.public_url ? (
                  <>
                    <video
                      key={active.id}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      crossOrigin="anonymous"
                      className="h-full w-full object-contain"
                      poster={active.thumbnail_url ?? undefined}
                      onError={() =>
                        setVideoError(
                          "Impossible de lire la vidéo. Vérifiez l’URL, le format MP4 et les permissions Storage."
                        )
                      }
                    >
                      <source src={active.public_url} type="video/mp4" />
                    </video>

                    {videoError ? (
                      <div className="absolute inset-0 grid place-items-center p-6 text-center">
                        <div className="max-w-md rounded-2xl bg-white/10 p-4 text-sm text-white ring-1 ring-white/10">
                          {videoError}
                          <div className="mt-3 break-all text-xs text-white/70">
                            {active.public_url}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
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