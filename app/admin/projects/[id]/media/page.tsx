// app/admin/projects/[id]/media/page.tsx
import Container from "@/components/layout/Container";
import { supabaseServerReadonly } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  linkExistingMedia,
  saveOrder,
  setCover,
  unlinkMedia,
  uploadAndLinkMedia,
} from "./actions";

type ResolvedSearchParams = {
  q?: string;
  kind?: string;
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<ResolvedSearchParams>;
};

type ProjectRow = {
  id: string;
  title: string;
  slug: string;
};

type MediaRow = {
  id: string;
  kind: "image" | "video";
  bucket: "images" | "videos";
  path: string;
  public_url: string | null;
  title: string;
  description: string | null;
  thumbnail_media_id: string | null;
  thumbnail_url: string | null;
};

type LinkRowDb = {
  project_id: string;
  media_id: string;
  is_cover: boolean;
  order_index: number | null;
  media: MediaRow | MediaRow[] | null;
  thumb: { public_url: string | null } | { public_url: string | null }[] | null;
};

type LinkRow = {
  project_id: string;
  media_id: string;
  is_cover: boolean;
  order_index: number;
  media: MediaRow;
  thumb_public_url: string | null;
};

type SupabaseReadonlyClient = Awaited<ReturnType<typeof supabaseServerReadonly>>;

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function resolvePublicUrl(
  supabase: SupabaseReadonlyClient,
  media: Pick<MediaRow, "bucket" | "path" | "public_url">
) {
  return (
    media.public_url ??
    supabase.storage.from(media.bucket).getPublicUrl(media.path).data.publicUrl
  );
}

export default async function AdminProjectMediaPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<ResolvedSearchParams>({}),
  ]);

  const supabase = await supabaseServerReadonly();

  const q = String(resolvedSearchParams.q ?? "").trim();
  const kindFilter = String(resolvedSearchParams.kind ?? "").trim();

  const [projectRes, linksRes, mediaSearchRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id,title,slug")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("project_media")
      .select(
        `
        project_id,
        media_id,
        is_cover,
        order_index,
        media:media_id (
          id, kind, bucket, path, public_url, title, description, thumbnail_media_id, thumbnail_url
        ),
        thumb:media_id!media_thumbnail_media_id_fkey ( public_url )
      `
      )
      .eq("project_id", id)
      .order("is_cover", { ascending: false })
      .order("order_index", { ascending: true }),

    supabase
      .from("media")
      .select(
        "id,kind,bucket,path,public_url,title,description,thumbnail_media_id,thumbnail_url,created_at"
      )
      .ilike("title", q ? `%${q}%` : "%")
      .in(
        "kind",
        kindFilter === "image" || kindFilter === "video"
          ? [kindFilter]
          : ["image", "video"]
      )
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (projectRes.error) throw new Error(projectRes.error.message);
  const project = projectRes.data as ProjectRow | null;
  if (!project) return notFound();

  if (linksRes.error) throw new Error(linksRes.error.message);
  if (mediaSearchRes.error) throw new Error(mediaSearchRes.error.message);

  const rawLinks = (linksRes.data ?? []) as LinkRowDb[];

  const links: LinkRow[] = rawLinks
    .map((r) => {
      const media = one(r.media);
      if (!media) return null;

      const thumb = one(r.thumb);
      const order_index = typeof r.order_index === "number" ? r.order_index : 0;

      return {
        project_id: r.project_id,
        media_id: r.media_id,
        is_cover: Boolean(r.is_cover),
        order_index,
        media,
        thumb_public_url: thumb?.public_url ?? null,
      };
    })
    .filter(Boolean) as LinkRow[];

  const alreadyLinked = new Set(links.map((l) => l.media_id));
  const mediaSearch = (mediaSearchRes.data ?? []) as MediaRow[];

  return (
    <section className="py-10">
      <Container>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Admin / Projets / Médias
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Médias du projet
            </h1>
            <p className="mt-2 text-slate-600">
              <span className="font-semibold text-slate-900">{project.title}</span>{" "}
              <span className="text-slate-400">—</span>{" "}
              <span className="font-mono text-slate-600">{project.slug}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`/admin/projects/${project.id}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              ← Retour projet
            </a>
            <a
              href={`/projects/${project.slug}`}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Voir sur le site
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">
              Uploader + lier au projet
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Ajoute un fichier dans Storage, crée une ligne{" "}
              <span className="font-mono">media</span>, puis une liaison{" "}
              <span className="font-mono">project_media</span>.
            </p>

            <form
              className="mt-5 grid gap-4"
              action={async (fd) => {
                "use server";
                await uploadAndLinkMedia(project.id, fd);
              }}
            >
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-900">Fichier *</span>
                <input
                  name="file"
                  type="file"
                  required
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  accept="image/*,video/*"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-slate-900">Titre</span>
                  <input
                    name="title"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Ex: Chantier Abidjan"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-slate-900">Ordre</span>
                  <input
                    name="order_index"
                    type="number"
                    defaultValue={0}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-900">Description</span>
                <textarea
                  name="description"
                  rows={3}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm">
                <input name="is_cover" type="checkbox" className="h-4 w-4" />
                <span className="font-semibold text-slate-900">Définir comme cover</span>
              </label>

              <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
                Uploader
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">
              Lier un média existant
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Recherche dans <span className="font-mono">media</span> et liaison au projet.
            </p>

            <div className="mt-4">
              <form
                className="flex flex-col gap-2 sm:flex-row"
                action={`/admin/projects/${project.id}/media`}
                method="get"
              >
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Rechercher un titre..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <select
                  name="kind"
                  defaultValue={kindFilter}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Tout</option>
                  <option value="image">Images</option>
                  <option value="video">Vidéos</option>
                </select>
                <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  Filtrer
                </button>
              </form>
            </div>

            <div className="mt-5 grid gap-3">
              {mediaSearch.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Aucun média trouvé.
                </div>
              ) : (
                mediaSearch.map((m) => {
                  const preview =
                    m.kind === "image"
                      ? resolvePublicUrl(supabase, m)
                      : m.thumbnail_url || null;

                  const disabled = alreadyLinked.has(m.id);

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-14 w-24 overflow-hidden rounded-xl bg-slate-100">
                          {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt={m.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-slate-100" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                            {m.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {m.kind.toUpperCase()} • {m.bucket}/{m.path}
                          </div>
                        </div>
                      </div>

                      <form
                        action={async (fd) => {
                          "use server";
                          await linkExistingMedia(project.id, fd);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="media_id" value={m.id} />
                        <input
                          type="number"
                          name="order_index"
                          defaultValue={0}
                          className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs"
                          title="order_index"
                        />
                        <label className="hidden sm:inline-flex items-center gap-2 text-xs">
                          <input type="checkbox" name="is_cover" className="h-4 w-4" />
                          Cover
                        </label>
                        <button
                          disabled={disabled}
                          className={[
                            "rounded-xl px-3 py-2 text-xs font-semibold",
                            disabled
                              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                              : "border border-slate-200 bg-white hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {disabled ? "Déjà lié" : "Lier"}
                        </button>
                      </form>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Médias liés ({links.length})
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Définis le <strong>cover</strong> et ajuste l’<strong>ordre</strong>.
              </p>
            </div>

            <a
              href="#save-order"
              className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Enregistrer l’ordre ↓
            </a>
          </div>

          {links.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Aucun média lié.
            </div>
          ) : (
            <form
              id="save-order"
              action={async (fd) => {
                "use server";
                await saveOrder(project.id, fd);
              }}
            >
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {links.map((l) => {
                  const thumb =
                    l.media.kind === "image"
                      ? resolvePublicUrl(supabase, l.media)
                      : l.media.thumbnail_url || l.thumb_public_url || null;

                  return (
                    <article
                      key={l.media_id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <div className="relative aspect-video bg-slate-100">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={l.media.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-slate-100" />
                        )}

                        <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                          {l.media.kind === "video" ? "Vidéo" : "Image"}
                          {l.is_cover ? " • Cover" : ""}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                          {l.media.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 line-clamp-1">
                          {l.media.bucket}/{l.media.path}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            Ordre
                            <input
                              name={`order_${l.media_id}`}
                              type="number"
                              defaultValue={l.order_index}
                              className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs"
                            />
                          </label>

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              formAction={async () => {
                                "use server";
                                await setCover(project.id, l.media_id);
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                            >
                              Cover
                            </button>

                            <button
                              type="submit"
                              formAction={async () => {
                                "use server";
                                await unlinkMedia(project.id, l.media_id);
                              }}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              Détacher
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
                  Enregistrer l’ordre
                </button>
              </div>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}