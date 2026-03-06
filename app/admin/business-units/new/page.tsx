// app/admin/business-units/new/page.tsx
import Link from "next/link";
import BusinessUnitForm from "../_components/BusinessUnitForm";

// ✅ Chemin canonique (stable)
import { createBusinessUnitAction } from "@/app/admin/business-units/actions";

export const dynamic = "force-dynamic";

export default function NewBusinessUnitPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Nouveau pôle
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Crée un pôle d’activité visible sur le site.
          </p>
        </div>

        <Link
          href="/admin/business-units"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          ← Retour
        </Link>
      </div>

      <div className="mt-8">
        <BusinessUnitForm mode="create" submitAction={createBusinessUnitAction} />
      </div>
    </div>
  );
}
