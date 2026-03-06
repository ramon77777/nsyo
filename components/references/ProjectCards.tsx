import type { ProjectWithCover } from "@/lib/data/projects";

type Props = {
  items: ProjectWithCover[];
};

export default function ProjectCards({ items }: Props) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <a
          key={p.id}
          href={`/projects/${p.slug}`}
          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="relative h-48 bg-slate-100">
            {p.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.cover_url}
                alt={p.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,#e2e8f0,#f8fafc)]" />
            )}

            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {p.category ? (
                <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                  {p.category}
                </span>
              ) : null}
              {p.is_featured ? (
                <span className="rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-slate-950">
                  À la une
                </span>
              ) : null}
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">
              {p.description?.trim() ? p.description : "Projet réalisé par NSYO."}
            </p>

            <div className="mt-5 inline-flex text-sm font-semibold text-slate-900">
              Voir le projet <span className="ml-1 transition group-hover:translate-x-1">→</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
