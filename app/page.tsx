// app/page.tsx
import "server-only";
import Link from "next/link";
import Container from "@/components/layout/Container";
import { getPageBySlug, getContentBlocksByPageId, blockMap } from "@/lib/data/content";
import { getBusinessUnits } from "@/lib/data/business";
import { getFeaturedProjects } from "@/lib/data/projects";
import { getHomeVideos } from "@/lib/data/videos";
import ProjectGrid from "@/components/home/ProjectGrid";
import VideoSection from "@/components/home/VideoSection";

function safeSlug(input: unknown) {
  const s = String(input ?? "").trim();
  return s ? encodeURIComponent(s) : "";
}

export default async function HomePage() {
  const page = await getPageBySlug("home");
  if (!page) return <div className="p-10">Page introuvable.</div>;

  const [blocks, businessUnits, projects, videos] = await Promise.all([
    getContentBlocksByPageId(page.id),
    getBusinessUnits(),
    getFeaturedProjects(6),
    getHomeVideos(6),
  ]);

  const b = blockMap(blocks);

  const title = b["home.hero.title"]?.value?.text ?? "NSYO";
  const subtitle = b["home.hero.subtitle"]?.value?.text ?? "";
  const aboutTitle = b["home.about.title"]?.value?.text ?? "Notre Entreprise";
  const aboutText = b["home.about.text"]?.value?.text ?? "";

  // ✅ Nombre dynamique de pôles (business_units)
  const businessUnitCount = Array.isArray(businessUnits) ? businessUnits.length : 0;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,white,transparent_55%)]" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <Container>
          <div className="relative py-20 md:py-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Ingénierie • Projets • Construction • Location
            </div>

            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">{title}</h1>

            <p className="mt-4 max-w-2xl text-white/80 text-base md:text-lg leading-relaxed">{subtitle}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#poles"
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:opacity-90"
              >
                Découvrir nos pôles
              </a>

              <Link
                href="/contact"
                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Demander un devis
              </Link>

              <a
                href="#realisations"
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Nos réalisations
              </a>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-2xl font-bold text-white">17+</div>
                <div className="mt-1 text-sm text-white/70">Années d’expérience</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-2xl font-bold text-white">{businessUnitCount}</div>
                <div className="mt-1 text-sm text-white/70">Pôles d’activités</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-2xl font-bold text-white">Qualité</div>
                <div className="mt-1 text-sm text-white/70">Exécution maîtrisée</div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ABOUT */}
      <section className="py-16">
        <Container>
          <div className="grid gap-10 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{aboutTitle}</h2>
              <p className="mt-4 text-slate-600 leading-relaxed">{aboutText}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/presentation"
                  className="inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  En savoir plus
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Parlons de votre projet
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.12),transparent_55%)]" />
              <div className="relative">
                <div className="text-sm font-semibold text-slate-900">Nos Pôles d’Activités</div>
                <p className="mt-2 text-sm text-slate-600">
                  Projets industriels • Construction urbaine • Location d’engins
                </p>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
                    <div className="text-sm font-bold text-slate-900">Approche</div>
                    <p className="mt-1 text-sm text-slate-600">
                      De l’étude à la livraison, avec une exécution maîtrisée.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
                    <div className="text-sm font-bold text-slate-900">Priorité</div>
                    <p className="mt-1 text-sm text-slate-600">Qualité, sécurité et respect des délais.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* BUSINESS UNITS */}
      <section id="poles" className="py-16 bg-slate-50">
        <Container>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Nos Pôles d’Activités</h2>
              <p className="mt-2 text-slate-600">Des solutions complètes, de la conception à la réalisation.</p>
            </div>

            <Link
              href="/nos-services"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Voir nos services <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {businessUnits.map((bu) => {
              const slug = safeSlug((bu as any).slug);
              const href = slug ? `/business-unit/${slug}` : "/references";

              return (
                <Link
                  key={bu.id}
                  href={href}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl" />

                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-bold text-slate-900">{bu.title}</div>
                      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{(bu as any).summary ?? ""}</p>
                    </div>

                    <span className="shrink-0 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                      Découvrir
                    </span>
                  </div>

                  <div className="mt-6 h-px w-full bg-slate-100" />

                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    Explorer
                    <span className="transition-transform group-hover:translate-x-1" aria-hidden>
                      →
                    </span>
                  </div>

                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-0 ring-amber-400/30 transition group-hover:ring-2" />
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* REALISATIONS */}
      <section id="realisations">
        <ProjectGrid items={projects} />
      </section>

      {/* VIDEOS */}
      <VideoSection items={videos} />

      {/* CTA */}
      <section className="py-16">
        <Container>
          <div className="rounded-3xl bg-slate-950 text-white p-10 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,white,transparent_60%)]" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Demandez un devis gratuitement</h3>
                <p className="mt-2 text-white/75 max-w-2xl">
                  Parlez-nous de votre besoin : nous vous orientons vers la meilleure solution et un planning
                  d’exécution réaliste.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:opacity-90"
                >
                  Contacter NSYO
                </Link>
                <a
                  href="#poles"
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Voir les pôles
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}