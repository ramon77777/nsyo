// app/admin/projects/[id]/edit/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServerReadonly } from "@/lib/supabase/server";

import ProjectForm, { type BusinessUnitOption } from "../../_components/ProjectForm";
import DeleteProject from "../../_components/DeleteProject";
import { deleteProjectAction, updateProjectAction } from "../../actions";
import ProjectMediaManager, {
  type ProjectMediaItem,
} from "../../_components/ProjectMediaManager";

export const dynamic = "force-dynamic";

type Project = {
  id: string;
  business_unit_id: string;
  title: string;
  slug: string;
  description: string;
  location: string | null;
  date: string | null; // YYYY-MM-DD
  category: string | null;
  is_featured: boolean;
};

type PageProps = {
  params: { id?: string } | Promise<{ id?: string }>;
};

function isUuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function getBusinessUnits(): Promise<BusinessUnitOption[]> {
  const supabase = await supabaseServerReadonly();
  const { data, error } = await supabase
    .from("business_units")
    .select("id,title")
    .order("order_index", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw new Error(`Erreur Supabase (business_units): ${error.message}`);
  return (data ?? []) as BusinessUnitOption[];
}

async function getProject(id: string): Promise<Project | null> {
  const supabase = await supabaseServerReadonly();
  const { data, error } = await supabase
    .from("projects")
    .select("id,business_unit_id,title,slug,description,location,date,category,is_featured")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Erreur Supabase (project by id): ${error.message}`);
  return (data ?? null) as Project | null;
}

async function getProjectMedia(projectId: string): Promise<ProjectMediaItem[]> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("project_media")
    .select(
      `
      media_id,
      order_index,
      is_cover,
      media:media_id(
        public_url,
        title,
        description,
        mime_type,
        kind
      )
    `
    )
    .eq("project_id", projectId)
    .order("is_cover", { ascending: false })
    .order("order_index", { ascending: true });

  if (error) throw new Error(`Erreur Supabase (project_media): ${error.message}`);

  // normalize (join peut être objet ou tableau selon typings)
  return (data ?? [])
    .map((row: any) => {
      const m = Array.isArray(row.media) ? row.media[0] : row.media;
      return {
        media_id: String(row.media_id),
        order_index: Number(row.order_index ?? 0),
        is_cover: !!row.is_cover,
        public_url: m?.public_url ?? null,
        title: m?.title ?? "media",
        description: m?.description ?? null,
        mime_type: m?.mime_type ?? null,
        kind: m?.kind ?? "file",
      } satisfies ProjectMediaItem;
    })
    .filter((x) => x.media_id);
}

export default async function EditProjectPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const idParam = resolvedParams?.id;

  if (!isUuid(idParam)) notFound();
  const id = idParam;

  const [project, businessUnits, mediaItems] = await Promise.all([
    getProject(id),
    getBusinessUnits(),
    getProjectMedia(id),
  ]);

  if (!project) notFound();

  const title = project.title;

  async function onUpdate(fd: FormData) {
    "use server";
    return updateProjectAction(id, fd);
  }

  async function deleteProxy() {
    "use server";
    return deleteProjectAction(id);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Éditer : {title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Modifie les infos du projet, puis gère les médias (cover + galerie).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/projects/${id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            ← Détails
          </Link>
          <Link
            href="/admin/projects"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Liste
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <ProjectForm
          mode="edit"
          businessUnits={businessUnits}
          defaults={{
            business_unit_id: project.business_unit_id,
            title: project.title,
            slug: project.slug,
            description: project.description,
            category: project.category,
            location: project.location,
            date: project.date,
            is_featured: project.is_featured,
          }}
          submitAction={onUpdate}
        />

        <div id="media">
          <ProjectMediaManager projectId={id} initialItems={mediaItems} />
        </div>

        <DeleteProject title={title} onDelete={deleteProxy} />
      </div>
    </div>
  );
}
