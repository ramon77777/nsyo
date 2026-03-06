// app/projects/[slug]/page.tsx
import "server-only";
import Link from "next/link";
import { getProjectBySlug, getProjectGalleryMedia } from "@/lib/data/projects";
import ProjectMediaClient from "./project-media-client";

export const dynamic = "force-dynamic";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function SafeText({ children }: { children: React.ReactNode }) {
  return <span className="text-white/85">{children}</span>;
}

function getBackHref(from: string | undefined) {
  const v = String(from ?? "").trim().toLowerCase();

  if (v === "references") return "/references";

  // défaut : home section réalisations
  return "/#realisations";
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const backHref = getBackHref(sp?.from);

  const project = await getProjectBySlug(slug);

  // projet introuvable
  if (!project) {
    return (
      <main className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4 rounded-3xl border border-white/10 bg-white/3 p-8">
          <h1 className="text-xl font-semibold">Projet introuvable</h1>

          <p className="text-white/70">
            Aucun projet ne correspond au slug :
            <span className="font-mono text-white ml-2">{slug}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={backHref}
              className="inline-flex justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              ← Retour
            </Link>

            <Link
              href="/contact"
              className="inline-flex justify-center rounded-2xl bg-yellow-400 px-6 py-3 font-semibold text-black hover:opacity-95"
            >
              Demander un devis
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const gallery = await getProjectGalleryMedia(project.id);

  const images = gallery.filter((m) => m.kind === "image" && m.public_url);
  const videos = gallery.filter((m) => m.kind === "video" && m.public_url);

  const hero = project.cover_url ?? images[0]?.public_url ?? null;

  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white">
      {/* HERO */}
      <section className="relative">

        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/40 to-[#0b0f1a]" />

        {hero ? (
          <div className="h-80 md:h-110 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero}
              alt={project.title}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        ) : (
          <div className="h-65 md:h-85 w-full bg-white/5" />
        )}

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-6xl px-5 pb-7 space-y-3">

            {/* bouton retour */}
            <Link
              href={backHref}
              className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              ← Retour
            </Link>

            <p className="text-xs uppercase tracking-wider text-white/60">
              {project.category ?? "Projet"}
            </p>

            <h1 className="text-2xl md:text-4xl font-semibold leading-tight">
              {project.title}
            </h1>

            <div className="flex flex-wrap gap-2">
              {project.category && <Chip>{project.category}</Chip>}
              {project.location && <Chip>{project.location}</Chip>}
              {project.date && <Chip>{project.date}</Chip>}
            </div>

          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto w-full max-w-6xl px-5 py-10">

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-10">

          {/* Description */}
          <article className="rounded-3xl border border-white/10 bg-white/3 p-6 md:p-8">
            <h2 className="text-lg font-medium mb-3">À propos du projet</h2>

            <p className="text-white/80 leading-relaxed whitespace-pre-line">
              {project.description}
            </p>
          </article>

          {/* Sidebar */}
          <aside className="space-y-4">

            <div className="rounded-3xl border border-white/10 bg-white/3 p-6">
              <h3 className="text-sm font-medium text-white/90 mb-3">
                Informations
              </h3>

              <dl className="space-y-3 text-sm">

                <div className="flex items-start justify-between gap-4">
                  <dt className="text-white/60">Catégorie</dt>
                  <dd className="text-right">
                    <SafeText>{project.category ?? "—"}</SafeText>
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <dt className="text-white/60">Lieu</dt>
                  <dd className="text-right">
                    <SafeText>{project.location ?? "—"}</SafeText>
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <dt className="text-white/60">Date</dt>
                  <dd className="text-right">
                    <SafeText>{project.date ?? "—"}</SafeText>
                  </dd>
                </div>

              </dl>
            </div>

            <Link
              href="/contact"
              className="block rounded-3xl bg-yellow-400 px-6 py-4 text-center font-semibold text-black hover:opacity-95"
            >
              Demander un devis
            </Link>

          </aside>
        </div>

        {/* MEDIA */}
        <ProjectMediaClient images={images} videos={videos} />

      </section>
    </main>
  );
}