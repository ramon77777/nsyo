// app/business-unit/[slug]/page.tsx
import "server-only";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessUnitBySlug } from "@/lib/data/business";
import { getProjectsByBusinessUnit } from "@/lib/data/projects";
import LocationEnginsContent from "./_components/LocationEnginsContent";

export const dynamic = "force-dynamic";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80",
        className
      )}
    >
      {children}
    </span>
  );
}

export default async function BusinessUnitPage({
  params,
}: {
  // ✅ Next 16: params est une Promise
  params: Promise<{ slug: string }>;
}) {
  // ✅ obligatoire en Next 16 pour éviter "sync dynamic apis"
  const { slug } = await params;

  const rawSlug = decodeURIComponent(String(slug ?? "")).trim();
  if (!rawSlug) notFound();

  // ✅ on utilise la data layer (qui marche déjà sur la home)
  const businessUnit = await getBusinessUnitBySlug(rawSlug);
  if (!businessUnit) notFound();

  const isLocationEngins = businessUnit.slug === "location-engins";
  const projects = await getProjectsByBusinessUnit(businessUnit.id, 200);

  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white">
      {/* HERO */}
      <section className="border-b border-white/10 bg-linear-to-b from-white/6 to-transparent">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-14">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Chip>Pôle d’activité</Chip>
              <Chip className="hidden sm:inline-flex">{businessUnit.slug}</Chip>
            </div>

            <h1 className="text-2xl md:text-4xl font-semibold leading-tight">
              {businessUnit.title}
            </h1>

            {businessUnit.summary ? (
              <p className="max-w-3xl text-white/75 leading-relaxed whitespace-pre-line">
                {businessUnit.summary}
              </p>
            ) : isLocationEngins ? (
              <p className="max-w-3xl text-white/60">
                Levage • Terrassement • Transport • Manutention
              </p>
            ) : (
              <p className="max-w-3xl text-white/60">
                Aucune description pour ce pôle pour le moment.
              </p>
            )}

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/#poles"
                className="inline-flex rounded-2xl border border-white/10 bg-white/3 px-5 py-3 text-sm font-semibold hover:bg-white/6"
              >
                ← Retour
              </Link>

              <Link
                href="/contact"
                className="inline-flex rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black hover:opacity-95"
              >
                Demander un devis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENU */}
      <section className="mx-auto w-full max-w-6xl px-5 py-10">
        {isLocationEngins ? (
          <>
            <LocationEnginsContent businessUnitId={businessUnit.id} />

            <div className="mt-14">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Réalisations liées</h2>
                  <p className="text-sm text-white/60">
                    {projects.length
                      ? `${projects.length} projet(s) trouvé(s)`
                      : "Aucune réalisation rattachée pour l’instant"}
                  </p>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-white/10 bg-white/3 p-8 text-white/70">
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.slug}`}
                      className="group overflow-hidden rounded-3xl border border-white/10 bg-white/3 hover:bg-white/6 transition"
                    >
                      <div className="relative h-44 sm:h-48">
                        {p.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.cover_url}
                            alt={p.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-white/5" />
                        )}

                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent opacity-90" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="text-sm font-semibold leading-snug">{p.title}</div>
                        </div>
                      </div>

                      <div className="p-4">
                        <p className="text-sm text-white/70 line-clamp-3">{p.description}</p>
                        <div className="mt-4 text-sm font-semibold text-yellow-300">
                          Voir le projet →
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Projets du pôle</h2>
                <p className="text-sm text-white/60">
                  {projects.length
                    ? `${projects.length} projet(s) trouvé(s)`
                    : "Aucun projet rattaché pour l’instant"}
                </p>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-white/10 bg-white/3 p-8 text-white/70">
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-white/3 hover:bg-white/6 transition"
                  >
                    <div className="relative h-44 sm:h-48">
                      {p.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.cover_url}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-white/5" />
                      )}

                      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent opacity-90" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="text-sm font-semibold leading-snug">{p.title}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/75">
                          {p.location ? <Chip>{p.location}</Chip> : null}
                          {p.date ? <Chip>{p.date}</Chip> : null}
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <p className="text-sm text-white/70 line-clamp-3">{p.description}</p>
                      <div className="mt-4 text-sm font-semibold text-yellow-300">
                        Voir le projet →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}