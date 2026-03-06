// app/admin/videos/new/page.tsx
import "server-only";
import Link from "next/link";
import Container from "@/components/layout/Container";
import UploadHomeVideoClient from "./UploadHomeVideoClient";

export const dynamic = "force-dynamic";

export default async function NewHomeVideoPage() {
  return (
    <section className="py-10 bg-slate-50/50">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Admin • Home</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Ajouter une vidéo
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Upload direct dans Supabase Storage.
            </p>
          </div>

          <Link
            href="/admin/videos"
            className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            ← Retour
          </Link>
        </div>

        <UploadHomeVideoClient />
      </Container>
    </section>
  );
}