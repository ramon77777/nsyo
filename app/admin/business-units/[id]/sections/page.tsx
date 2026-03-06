// app/admin/business-units/[id]/sections/page.tsx
import "server-only";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServerReadonly } from "@/lib/supabase/server";
import SectionsEditorClient, { SectionDTO } from "./_components/SectionsEditorClient";

export const dynamic = "force-dynamic";

type BusinessUnitRow = {
  id: string;
  title: string;
  slug: string;
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
  image_media_id: string | null;
  order_index: number;
  image: MediaRow | null;
  items: Array<{
    id: string;
    designation: string;
    qty: string | null;
    order_index: number | null;
  }>;
};

function resolvePublicUrl(
  supabase: Awaited<ReturnType<typeof supabaseServerReadonly>>,
  media: { bucket: string; path: string; public_url: string | null }
): string {
  const { data } = supabase.storage.from(media.bucket).getPublicUrl(media.path);
  return data.publicUrl ?? media.public_url ?? "";
}

async function getBusinessUnit(id: string): Promise<BusinessUnitRow | null> {
  const supabase = await supabaseServerReadonly();
  const { data, error } = await supabase
    .from("business_units")
    .select("id,title,slug")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin sections] getBusinessUnit error:", error);
    throw new Error(error.message);
  }

  return (data ?? null) as BusinessUnitRow | null;
}

async function getSections(businessUnitId: string): Promise<SectionDTO[]> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("business_unit_sections")
    .select(
      `
      id, business_unit_id, key, title, intro_text, image_media_id, order_index,
      image:image_media_id(id, kind, bucket, path, public_url, title, description),
      items:business_unit_section_items(id, designation, qty, order_index)
    `
    )
    .eq("business_unit_id", businessUnitId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("[admin sections] getSections error:", error);
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
      key: s.key,
      title: s.title,
      intro_text: s.intro_text ?? "",
      order_index: s.order_index,
      image: s.image
        ? {
            id: s.image.id,
            title: s.image.title,
            description: s.image.description,
            url: imageUrl, // ✅ string garanti
            path: s.image.path,
          }
        : null,
      items: (s.items ?? [])
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((it) => ({
          id: it.id,
          designation: it.designation,
          qty: it.qty ?? "",
          order_index: it.order_index ?? 0,
        })),
    };
  });
}

export default async function AdminBusinessUnitSectionsPage({
  params,
}: {
  // ✅ Next 16.1.1: params peut être une Promise
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = String(rawId ?? "").trim();
  if (!id) notFound();

  const bu = await getBusinessUnit(id);
  if (!bu) {
    console.error("[admin sections] business_unit not found for id:", id);
    notFound();
  }

  const sections = await getSections(bu.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-5 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Administration</div>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Sections du pôle : {bu.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Slug: <span className="font-mono">{bu.slug}</span> • Drag & drop, images, tableaux.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/business-units"
                className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                ← Retour
              </Link>
              <Link
                href={`/business-unit/${bu.slug}`}
                className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Voir côté public →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            ⚠️ Toute modification est visible côté public après revalidation.
          </div>
        </div>

        <div className="mt-6">
          <SectionsEditorClient
            businessUnitId={bu.id}
            businessUnitSlug={bu.slug}
            initialSections={sections}
          />
        </div>
      </div>
    </div>
  );
}
