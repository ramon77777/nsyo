// app/admin/business-units/[id]/edit/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServerReadonly } from "@/lib/supabase/server";

import BusinessUnitForm from "../../_components/BusinessUnitForm";
import DeleteBusinessUnit from "../../_components/DeleteBusinessUnit";

import {
  deleteBusinessUnitAction,
  updateBusinessUnitAction,
} from "@/app/admin/business-units/actions";

export const dynamic = "force-dynamic";

type BusinessUnit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
};

function isUuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function getBusinessUnit(id: string): Promise<BusinessUnit | null> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("business_units")
    .select("id,slug,title,summary,order_index")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as BusinessUnit | null;
}

export default async function EditBusinessUnitPage({
  params,
}: {
  // ✅ params peut être Promise selon certains builds
  params: { id?: string } | Promise<{ id?: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const idParam = resolvedParams?.id;

  // ✅ ici on verrouille : après ça id est FORCÉMENT un string UUID
  if (!isUuid(idParam)) notFound();
  const id = idParam;

  const item = await getBusinessUnit(id);
  if (!item) notFound();

  const title = item.title;

  async function onUpdate(fd: FormData) {
    "use server";
    await updateBusinessUnitAction(id, fd);
    // ⚠️ updateBusinessUnitAction redirect déjà -> ne pas re-redirect ici
  }

  async function onDelete() {
    "use server";
    await deleteBusinessUnitAction(id);
    // ⚠️ deleteBusinessUnitAction redirect déjà -> ne pas re-redirect ici
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Éditer : {title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Modifie les infos du pôle. Le slug est auto-unique si conflit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/business-units/${id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            ← Détails
          </Link>
          <Link
            href="/admin/business-units"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Liste
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <BusinessUnitForm
          mode="edit"
          defaults={{
            title: item.title,
            slug: item.slug,
            summary: item.summary,
            order_index: item.order_index,
          }}
          submitAction={onUpdate}
        />

        <DeleteBusinessUnit title={title} onDelete={onDelete} />
      </div>
    </div>
  );
}
