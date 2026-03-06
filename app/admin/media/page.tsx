// app/admin/media/page.tsx
import Link from "next/link";
import { supabaseServerReadonly } from "@/lib/supabase/server";
import { deleteMediaAction } from "./actions";

export const dynamic = "force-dynamic";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const fmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatUtc(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return fmt.format(d);
}

type MediaRow = {
  id: string;
  kind: string;
  bucket: string;
  path: string;
  public_url: string | null;
  title: string;
  description: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type LinkedProject = { id: string; title: string; slug: string };

type MediaWithUsage = MediaRow & {
  projects_count: number;
  projects: LinkedProject[];
  preview_url: string | null;
};

async function getMedia(): Promise<MediaWithUsage[]> {
  const supabase = await supabaseServerReadonly();

  const { data: media, error: mErr } = await supabase
    .from("media")
    .select("id,kind,bucket,path,public_url,title,description,mime_type,size_bytes,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (mErr) throw new Error(`Erreur Supabase (media): ${mErr.message}`);

  const rows = (media ?? []) as MediaRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const { data: links, error: lErr } = await supabase
    .from("project_media")
    .select(
      `
      media_id,
      project:project_id(
        id,
        title,
        slug
      )
    `
    )
    .in("media_id", ids);

  if (lErr) throw new Error(`Erreur Supabase (project_media usage): ${lErr.message}`);

  const byMedia = new Map<string, LinkedProject[]>();

  for (const r of links ?? []) {
    const mid = String((r as any).media_id ?? "");
    const p = (r as any).project;
    const proj = Array.isArray(p) ? p[0] : p;
    if (!mid || !proj?.id) continue;

    const arr = byMedia.get(mid) ?? [];
    arr.push({
      id: String(proj.id),
      title: String(proj.title ?? "Projet"),
      slug: String(proj.slug ?? ""),
    });
    byMedia.set(mid, arr);
  }

  return rows.map((r) => {
    const projects = byMedia.get(r.id) ?? [];
    const preview_url =
      r.public_url ??
      (r.bucket && r.path && r.path !== "pending"
        ? supabase.storage.from(r.bucket).getPublicUrl(r.path).data.publicUrl
        : null);

    return {
      ...r,
      projects_count: projects.length,
      projects,
      preview_url,
    };
  });
}

export default async function AdminMediaPage() {
  const items = await getMedia();

  async function onDelete(formData: FormData) {
    "use server";
    const mediaId = String(formData.get("media_id") ?? "");
    await deleteMediaAction(mediaId);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Médias</h1>
          <p className="mt-1 text-sm text-slate-600">
            Liste globale des médias (DB <span className="font-mono">media</span>) et leur usage
            (liens <span className="font-mono">project_media</span>). Dates en UTC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            ← Dashboard
          </Link>
          <Link
            href="/admin/projects"
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Projets
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-600">
          <div className="col-span-4">Aperçu</div>
          <div className="col-span-4">Infos</div>
          <div className="col-span-2">Usage</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-600">Aucun média pour l’instant.</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {items.map((m) => (
              <li key={m.id} className="grid grid-cols-12 gap-3 px-5 py-4">
                <div className="col-span-4">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {m.preview_url ? (
                      m.kind === "video" || (m.mime_type ?? "").startsWith("video/") ? (
                        <video src={m.preview_url} controls preload="metadata" className="h-40 w-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.preview_url} alt={m.title} className="h-40 w-full object-cover" loading="lazy" />
                      )
                    ) : (
                      <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                        Pas d’URL publique
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-4">
                  <div className="text-sm font-semibold text-slate-900">{m.title}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-mono">
                      {m.kind}
                    </span>{" "}
                    {m.mime_type ? <span>• {m.mime_type}</span> : null}
                  </div>

                  <div className="mt-2 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold">Bucket :</span>{" "}
                      <span className="font-mono">{m.bucket}</span>
                    </div>
                    <div className="truncate">
                      <span className="font-semibold">Path :</span>{" "}
                      <span className="font-mono">{m.path}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Créé :</span> {formatUtc(m.created_at)}
                    </div>
                    {m.size_bytes != null ? (
                      <div>
                        <span className="font-semibold">Taille :</span>{" "}
                        {Math.round((m.size_bytes / 1024 / 1024) * 10) / 10} MB
                      </div>
                    ) : null}
                  </div>

                  {m.description ? <div className="mt-2 text-sm text-slate-700">{m.description}</div> : null}
                </div>

                <div className="col-span-2 text-sm text-slate-700">
                  <div>
                    <span className="font-semibold">{m.projects_count}</span> projet(s)
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{m.projects_count === 0 ? "Orphelin" : "Lié"}</div>

                  {m.projects_count > 0 ? (
                    <div className="mt-2 space-y-1 text-xs">
                      {m.projects.slice(0, 3).map((p) => (
                        <Link
                          key={p.id}
                          href={`/admin/projects/${p.id}`}
                          className="block truncate text-slate-700 hover:underline"
                          title={p.title}
                        >
                          • {p.title}
                        </Link>
                      ))}
                      {m.projects.length > 3 ? (
                        <div className="text-slate-500">+ {m.projects.length - 3} autre(s)</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="col-span-2 flex items-start justify-end gap-2">
                  <form action={onDelete}>
                    <input type="hidden" name="media_id" value={m.id} />
                    <button
                      type="submit"
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-semibold",
                        m.projects_count === 0
                          ? "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      )}
                      title={m.projects_count === 0 ? "Supprimer (orphelin)" : "Supprime aussi les liens project_media"}
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
          Astuce : pour gérer les médias d’un projet (cover + galerie), va sur{" "}
          <span className="font-mono">/admin/projects/[id]/edit#media</span>.
        </div>
      </div>
    </div>
  );
}