import Container from "@/components/layout/Container";
import { notFound } from "next/navigation";
import {
  getProjectBySlug,
  getProjectGalleryMedia,
  type ProjectWithCover,
  type GalleryItem,
} from "@/lib/data/projects";
import GalleryMedia from "@/components/business/GalleryMedia";

type PageProps = {
  params: { slug: string };
};

function formatDate(date: string | null) {
  if (!date) return null;
  // Supabase renvoie souvent YYYY-MM-DD
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "long" });
}

export default async function ReferenceDetailPage({ params }: PageProps) {
  const project = await getProjectBySlug(params.slug);
  if (!project) return notFound();

  const gallery = await getProjectGalleryMedia(project.id, { imagesLimit: 60, videosLimit: 12 });
  const hasGallery = gallery.length > 0;

  const dateLabel = formatDate(project.date);
  const categoryLabel = (project.category ?? "").trim() || "Projet";
  const locationLabel = (project.location ?? "").trim() || null;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,white,transparent_55%)]" />
        <Container>
          <div className="relative py-16 md:py-20">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
                <span className="mr-2 h-2 w-2 rounded-full bg-amber-400" />
                Référence
              </span>

              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
                {categoryLabel}
              </span>

              {dateLabel ? (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
                  {dateLabel}
                </span>
              ) : null}

              {locationLabel ? (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
                  {locationLabel}
                </span>
              ) : null}
            </div>

            <h1 className="mt-6 text-3xl md:text-5xl font-bold tracking-tight">
              {project.title}
            </h1>

            <p className="mt-4 max-w-3xl text-white/80 leading-relaxed">
              {project.description?.trim()
                ? project.description
                : "Projet réalisé par NSYO – ingénierie & exécution."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {hasGallery ? (
                <a
                  href="#galerie"
                  className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:opacity-90"
                >
                  Voir la galerie
                </a>
              ) : null}

              <a
                href="/contact"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Demander un devis
              </a>

              <a
                href="/references"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                ← Retour aux références
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* COVER (optionnel) */}
      {project.cover_url ? (
        <section className="py-10 bg-white">
          <Container>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.cover_url}
                alt={project.title}
                className="w-full max-h-130 object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </Container>
        </section>
      ) : null}

      {/* GALERIE */}
      {hasGallery ? (
        <section id="galerie" className="py-16 bg-slate-50">
          <Container>
            <GalleryMedia
              title="Galerie du projet"
              subtitle="Photos et vidéos liées à cette réalisation."
              items={gallery}
            />
          </Container>
        </section>
      ) : (
        <section className="py-16 bg-slate-50">
          <Container>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
              Aucun média n’a encore été ajouté pour ce projet.
            </div>
          </Container>
        </section>
      )}

      {/* CTA */}
      <section className="py-16">
        <Container>
          <div className="rounded-3xl bg-slate-950 text-white p-10 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,white,transparent_60%)]" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold">Un projet similaire ?</h3>
                <p className="mt-2 text-white/75 max-w-2xl">
                  Décrivez votre besoin et recevez une estimation + un planning réaliste.
                </p>
              </div>
              <a
                href="/contact"
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:opacity-90"
              >
                Contacter NSYO
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
