// app/admin/projects/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServerAction, supabaseServerReadonly } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function getSP(sp: SearchParams | undefined, key: string): string | null {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? null;
  return null;
}

function isUuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const fmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "UTC",
});
function formatDateUtc(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return fmt.format(d);
}

type MediaLite = {
  id: string;
  public_url: string | null;
  title: string;
  description: string | null;
  kind: string;
  mime_type: string | null;
};

type ProjectMediaRow = {
  media_id: string;
  order_index: number;
  is_cover: boolean;
  media?: MediaLite | MediaLite[] | null;
};

type Project = {
  id: string;
  business_unit_id: string;
  title: string;
  slug: string;
  description: string;
  location: string | null;
  date: string | null;
  category: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  business_units?: { title: string } | { title: string }[] | null;
  project_media?: ProjectMediaRow[] | null;
};

function buTitle(p: Project) {
  const bu = p.business_units;
  if (!bu) return null;
  if (Array.isArray(bu)) return bu[0]?.title ?? null;
  return bu.title ?? null;
}

type NormalizedMediaItem = {
  id: string;
  media_id: string;
  order_index: number;
  is_cover: boolean;
  public_url: string | null;
  title: string;
  description: string | null;
  kind: string;
  mime_type: string | null;
};

function isVideo(it: NormalizedMediaItem) {
  const mt = (it.mime_type ?? "").toLowerCase();
  return it.kind === "video" || mt.startsWith("video/");
}

function normalizeMedia(pm: ProjectMediaRow[] | null | undefined) {
  const rows: NormalizedMediaItem[] = (pm ?? [])
    .map((x) => {
      const m = x.media;
      const media = Array.isArray(m) ? m[0] : m;

      const mediaId = media?.id ?? x.media_id;

      return {
        media_id: String(x.media_id ?? ""),
        order_index: typeof x.order_index === "number" ? x.order_index : 0,
        is_cover: !!x.is_cover,
        id: String(mediaId ?? ""),
        public_url: media?.public_url ?? null,
        title: (media?.title ?? "media").trim() || "media",
        description: media?.description ?? null,
        kind: media?.kind ?? "file",
        mime_type: media?.mime_type ?? null,
      };
    })
    .filter((x) => x.id && x.media_id);

  rows.sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
    if (a.order_index !== b.order_index) return a.order_index - b.order_index;
    return a.id.localeCompare(b.id);
  });

  // cover : priorité au is_cover, sinon premier avec aperçu, sinon premier tout court
  const cover =
    rows.find((x) => x.is_cover) ??
    rows.find((x) => !!x.public_url) ??
    rows[0] ??
    null;

  const gallery = cover ? rows.filter((x) => x.media_id !== cover.media_id) : rows;

  return { cover, gallery, all: rows };
}

async function getProject(id: string): Promise<Project | null> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      id,business_unit_id,title,slug,description,location,date,category,is_featured,created_at,updated_at,
      business_units:business_unit_id(title),
      project_media(
        media_id,
        order_index,
        is_cover,
        media:media_id(id,public_url,title,description,kind,mime_type)
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Erreur Supabase (project by id): ${error.message}`);
  return (data ?? null) as unknown as Project | null;
}

async function deleteProject(id: string) {
  const supabase = await supabaseServerAction();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export default async function AdminProjectPage({
  params,
  searchParams,
}: {
  params: { id?: string } | Promise<{ id?: string }>;
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSP = await Promise.resolve(searchParams);

  const idParam = resolvedParams?.id;
  if (!isUuid(idParam)) notFound();
  const id = idParam;

  let item: Project | null = null;
  let fatalError: string | null = null;

  try {
    item = await getProject(id);
  } catch (e: any) {
    fatalError = e?.message ?? "Erreur inconnue.";
  }

  if (!item && !fatalError) notFound();

  const createdFlag = getSP(resolvedSP, "created") === "1";
  const updatedFlag = getSP(resolvedSP, "updated") === "1";
  const deletedFlag = getSP(resolvedSP, "deleted") === "1";
  const errorMsgRaw = getSP(resolvedSP, "error");
  const errorMsg = errorMsgRaw ? decodeURIComponent(errorMsgRaw) : null;

  async function onDelete() {
    "use server";
    await deleteProject(id);
    redirect("/admin/projects?deleted=1");
  }

  const media = item ? normalizeMedia(item.project_media) : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projet</h1>
          <p className="mt-1 text-sm text-slate-600">Détails du projet et actions rapides.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/projects"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            ← Retour
          </Link>

          <Link
            href={`/admin/projects/${id}/edit`}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Éditer
          </Link>

          <form action={onDelete}>
            <button
              type="submit"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
            >
              Supprimer
            </button>
          </form>
        </div>
      </div>

      {createdFlag ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          ✅ Projet créé.
        </div>
      ) : null}

      {updatedFlag ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          ✅ Modifications enregistrées.
        </div>
      ) : null}

      {deletedFlag ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          ✅ Suppression effectuée.
        </div>
      ) : null}

      {errorMsg ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          <div className="font-semibold">Erreur</div>
          <div className="mt-1 text-sm">{errorMsg}</div>
        </div>
      ) : null}

      {fatalError ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          <div className="font-semibold">Erreur serveur</div>
          <pre className="mt-2 whitespace-pre-wrap text-sm">{fatalError}</pre>
        </div>
      ) : item ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Titre</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{item.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-white px-2 py-1 font-mono border border-slate-200">
                    {item.slug}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 border border-slate-200">
                    Pôle : {buTitle(item) ?? "—"}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-semibold border",
                      item.is_featured
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    Featured : {item.is_featured ? "Oui" : "Non"}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                <div>Créé (UTC) : {formatDateUtc(item.created_at)}</div>
                <div>MAJ (UTC) : {formatDateUtc(item.updated_at)}</div>
              </div>
            </div>
          </div>

          {/* ✅ Cover */}
          {media?.cover ? (
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase text-slate-500">Cover</div>
                <Link
                  href={`/admin/projects/${id}/edit#media`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Gérer
                </Link>
              </div>

              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {media.cover.public_url ? (
                  isVideo(media.cover) ? (
                    <video
                      src={media.cover.public_url}
                      className="h-72 w-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={media.cover.public_url}
                      alt={media.cover.title}
                      className="h-72 w-full object-cover"
                      loading="lazy"
                    />
                  )
                ) : (
                  <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                    Pas d’aperçu pour le cover
                  </div>
                )}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                <div className="font-semibold">{media.cover.title}</div>
                {media.cover.description ? (
                  <div className="mt-1 text-slate-600">{media.cover.description}</div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Infos</div>
              <div className="mt-2 text-sm text-slate-800">
                <div>
                  <span className="font-semibold">Catégorie :</span> {item.category ?? "—"}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Lieu :</span> {item.location ?? "—"}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Date :</span> {item.date ?? "—"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Identifiants</div>
              <div className="mt-2 text-xs text-slate-700">
                <div>
                  <span className="font-semibold">id :</span>{" "}
                  <span className="font-mono">{item.id}</span>
                </div>
                <div className="mt-1">
                  <span className="font-semibold">business_unit_id :</span>{" "}
                  <span className="font-mono">{item.business_unit_id}</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Description</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                {item.description}
              </div>
            </div>

            {/* ✅ Galerie */}
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">Galerie</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {media?.gallery?.length ?? 0} élément(s)
                  </div>
                </div>

                <Link
                  href={`/admin/projects/${id}/edit#media`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Gérer
                </Link>
              </div>

              {!media || media.all.length === 0 ? (
                <div className="mt-4 text-sm text-slate-600">Aucun média.</div>
              ) : media.gallery.length === 0 ? (
                <div className="mt-4 text-sm text-slate-600">Uniquement un cover.</div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {media.gallery.map((m) => (
                    <div
                      key={m.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      title={m.title}
                    >
                      {m.public_url ? (
                        isVideo(m) ? (
                          <video
                            src={m.public_url}
                            className="h-40 w-full object-cover"
                            controls
                            preload="metadata"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.public_url}
                            alt={m.title}
                            className="h-40 w-full object-cover"
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                          Pas d’aperçu
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600">
            Médias gérés via DB (<span className="font-mono">media</span> +{" "}
            <span className="font-mono">project_media</span>) + Storage.
          </div>
        </div>
      ) : null}
    </div>
  );
}
