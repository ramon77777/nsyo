// app/admin/projects/new/page.tsx
import Link from "next/link";
import { supabaseServerReadonly } from "@/lib/supabase/server";
import ProjectForm, { type BusinessUnitOption } from "../_components/ProjectForm";
import { createProjectAction } from "../actions";

export const dynamic = "force-dynamic";

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

export default async function NewProjectPage() {
  const businessUnits = await getBusinessUnits();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nouveau projet</h1>
          <p className="mt-1 text-sm text-slate-600">Crée un projet visible sur le site.</p>
        </div>

        <Link
          href="/admin/projects"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          ← Retour
        </Link>
      </div>

      {businessUnits.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="font-semibold">Aucun pôle disponible</div>
          <p className="mt-1 text-sm">
            Tu dois d’abord créer au moins un pôle (Business Unit) avant de créer un projet.
          </p>
          <div className="mt-3">
            <Link
              href="/admin/business-units/new"
              className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              + Créer un pôle
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <ProjectForm
            mode="create"
            businessUnits={businessUnits}
            submitAction={createProjectAction}
          />
        </div>
      )}
    </div>
  );
}
