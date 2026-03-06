// lib/data/business-unit-sections.ts
import "server-only";
import { supabaseServerReadonly } from "@/lib/supabase/server";

export type BusinessUnitSection = {
  id: string;
  business_unit_id: string;
  key: string;
  title: string;
  intro_text: string;
  order_index: number;
  image: {
    id: string;
    title: string;
    description: string | null;
    url: string;
    path: string;
  } | null;
  items: Array<{
    id: string;
    designation: string;
    qty: string | null;
    order_index: number;
  }>;
};

type MediaRow = {
  id: string;
  kind: string;
  bucket: string;
  path: string;
  public_url: string | null;
  title: string;
  description: string | null;
};

type SectionRow = {
  id: string;
  business_unit_id: string;
  key: string;
  title: string;
  intro_text: string | null;
  order_index: number;
  image: MediaRow | null;
  items: Array<{
    id: string;
    designation: string;
    qty: string | null;
    order_index: number;
  }> | null;
};

function resolvePublicUrl(
  supabase: Awaited<ReturnType<typeof supabaseServerReadonly>>,
  media: { bucket: string; path: string; public_url: string | null }
): string {
  // ✅ On privilégie un public_url stocké en DB si tu l’as
  if (media.public_url) return media.public_url;

  // ✅ Sinon on reconstruit depuis Supabase Storage
  const { data } = supabase.storage.from(media.bucket).getPublicUrl(media.path);
  return data.publicUrl ?? "";
}

/**
 * ✅ Source de vérité utilisée côté public (LocationEnginsContent).
 * - Pas de cache applicatif ici (la page est déjà en force-dynamic).
 * - Jointure media + calcul URL publique robuste.
 * - Tri sections + items.
 */
export async function getBusinessUnitSections(
  businessUnitId: string
): Promise<BusinessUnitSection[]> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("business_unit_sections")
    .select(
      `
      id,
      business_unit_id,
      key,
      title,
      intro_text,
      order_index,
      image:image_media_id(
        id,
        kind,
        bucket,
        path,
        public_url,
        title,
        description
      ),
      items:business_unit_section_items(
        id,
        designation,
        qty,
        order_index
      )
    `
    )
    .eq("business_unit_id", businessUnitId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("[getBusinessUnitSections] error:", error);
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as SectionRow[];

  return rows.map((s) => {
    const imageUrl =
      s.image && s.image.kind === "image"
        ? resolvePublicUrl(supabase, {
            bucket: s.image.bucket,
            path: s.image.path,
            public_url: s.image.public_url,
          })
        : "";

    return {
      id: s.id,
      business_unit_id: s.business_unit_id,
      key: String(s.key ?? "").trim(),
      title: String(s.title ?? "").trim(),
      intro_text: s.intro_text ?? "",
      order_index: Number(s.order_index ?? 0),
      image:
        s.image && s.image.kind === "image" && (s.image.path || s.image.public_url)
          ? {
              id: s.image.id,
              title: s.image.title,
              description: s.image.description,
              url: imageUrl, // ✅ string (jamais null)
              path: s.image.path,
            }
          : null,
      items: (s.items ?? [])
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((it) => ({
          id: it.id,
          designation: it.designation,
          qty: it.qty,
          order_index: it.order_index ?? 0,
        })),
    };
  });
}
