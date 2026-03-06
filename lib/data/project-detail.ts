import { supabaseServerReadonly } from "@/lib/supabase/server";
import {
  getProjectBySlug,
  getProjectGalleryMedia,
  type ProjectWithCover,
  type GalleryItem,
} from "@/lib/data/projects";

export type ProjectDetail = {
  project: ProjectWithCover;
  gallery: GalleryItem[];
};

export async function getProjectDetailBySlug(slug: string): Promise<ProjectDetail | null> {
  const project = await getProjectBySlug(slug);
  if (!project) return null;

  const gallery = await getProjectGalleryMedia(project.id, {
    imagesLimit: 60,
    videosLimit: 12,
  });

  return { project, gallery };
}

export async function getProjectDetailById(projectId: string): Promise<ProjectDetail | null> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,business_unit_id,title,slug,description,category,location,date,is_featured,created_at,updated_at"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return getProjectDetailBySlug((data as { slug: string }).slug);
}
