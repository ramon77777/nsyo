// app/admin/business-units/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServerReadonly } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type BusinessUnit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
};

type PageProps = {
  params: Promise<{ id?: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

const fmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "UTC",
});
function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : fmt.format(d);
}

async function getBusinessUnit(id: string): Promise<BusinessUnit | null> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("business_units")
    .select("id,slug,title,summary,order_index,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as BusinessUnit | null;
}

export default async function AdminBusinessUnitPage({ params, searchParams }: PageProps) {
  const p = await params;
  const sp = await searchParams;

  // ✅ IMPORTANT: id devient string (plus undefined) avant usage
  const id = p.id;
  if (!id) notFound();
  if (!isUuid(id)) notFound();

  const item = await getBusinessUnit(id);
  if (!item) notFound();

  const updated = sp?.updated === "1";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pôle</h1>
          <p className="mt-1 text-sm text-slate-600">Détails du pôle et actions rapides.</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/business-units"
            prefetch={false}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            ← Retour
          </Link>

          <Link
            href={`/admin/business-units/${id}/edit`}
            prefetch={false}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Éditer
          </Link>
        </div>
      </div>

      {updated && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          ✅ Modifications enregistrées.
        </div>
      )}

      <div className="mt-6 rounded-2xl border bg-white p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Titre</div>
            <div className="mt-2 font-semibold">{item.title}</div>
            <div className="mt-2 text-xs text-slate-500">
              Slug :
              <span className="ml-1 rounded bg-slate-100 px-2 py-0.5 font-mono">{item.slug}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Ordre</div>
            <div className="mt-2">{item.order_index}</div>
            <div className="mt-2 text-xs text-slate-500">
              Créé : {fmtDate(item.created_at)}
              <br />
              MAJ : {fmtDate(item.updated_at)}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase text-slate-500">Résumé</div>
            <div className="mt-2 text-sm">{item.summary ?? <span className="text-slate-400">—</span>}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
