import Container from "@/components/layout/Container";
import Link from "next/link";

type ProjectCard = {
  id: string;
  title: string;
  slug?: string; // ✅ optionnel mais recommandé
  category?: string | null;
  description?: string | null;
  cover_url?: string | null;

  // Si tu veux forcer un lien spécifique (ex: /projects/xxx)
  href?: string;
};

function safeCategoryLabel(category?: string | null) {
  const v = (category ?? "").trim();
  return v.length ? v : "Projet";
}

function safeDescription(
  description?: string | null,
  fallback = "Projet réalisé par NSYO – ingénierie & exécution."
) {
  const v = (description ?? "").trim();
  return v.length ? v : fallback;
}

function resolveHref(p: ProjectCard) {
  // Priorité : href explicite > slug > fallback
  if (p.href?.trim()) return p.href.trim();
  if (p.slug?.trim()) return `/projects/${p.slug.trim()}`;
  return "/references";
}

export default function ProjectGrid({
  title = "Réalisations",
  subtitle = "Quelques projets réalisés par nos équipes.",
  items,
}: {
  title?: string;
  subtitle?: string;
  items: ProjectCard[];
}) {
  if (!items?.length) return null;

  // Si title/subtitle sont undefined => on cache le header
  const showHeader = typeof title !== "undefined" || typeof subtitle !== "undefined";
  const t = title ?? "";
  const st = subtitle ?? "";

  return (
    <section className="py-16">
      <Container>
        {/* Header (optionnel) */}
        {showHeader ? (
          <div className="flex items-end justify-between gap-6">
            <div>
              {t ? (
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  {t}
                </h2>
              ) : null}
              {st ? <p className="mt-2 text-slate-600">{st}</p> : null}
            </div>

            <Link
              href="/references"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 hover:shadow"
            >
              Voir plus <span aria-hidden>→</span>
            </Link>
          </div>
        ) : null}

        {/* Grid */}
        <div className={showHeader ? "mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
          {items.map((p) => {
            const category = safeCategoryLabel(p.category);
            const description = safeDescription(p.description);
            const href = resolveHref(p);

            return (
              <article
                key={p.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {/* ✅ Card entière cliquable */}
                <Link href={href} className="block focus:outline-none">
                  {/* Media */}
                  <div className="relative aspect-16/10 bg-slate-100">
                    {p.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.cover_url}
                        alt={p.title}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#e2e8f0_0%,#f8fafc_35%,#e2e8f0_100%)]" />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent opacity-80" />

                    {/* Category badge */}
                    <div className="absolute left-4 top-4">
                      <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        {category}
                      </span>
                    </div>

                    {/* Accent line */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-amber-400/80 via-amber-200/60 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {p.title}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {description}
                    </p>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                        Détails
                        <span
                          className="transition-transform duration-200 group-hover:translate-x-1"
                          aria-hidden
                        >
                          →
                        </span>
                      </span>

                      <span className="text-xs text-slate-400">NSYO</span>
                    </div>
                  </div>

                  {/* Focus ring */}
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-0 ring-amber-400/40 transition group-hover:ring-2 group-focus-within:ring-2" />
                </Link>
              </article>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-10 sm:hidden">
          <Link
            href="/references"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            Voir plus <span aria-hidden>→</span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
