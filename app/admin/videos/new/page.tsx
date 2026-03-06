// app/admin/videos/new/page.tsx
import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/layout/Container";
import { uploadHomeVideoAction } from "../actions";
import SubmitUploadButton from "./submit-upload-button";

export const dynamic = "force-dynamic";

async function upload(formData: FormData): Promise<void> {
  "use server";

  const res = await uploadHomeVideoAction(formData);

  if (!res.ok) {
    redirect(`/admin/videos/new?error=${encodeURIComponent(res.message)}`);
  }

  redirect(`/admin/videos?saved=1`);
}

export default async function NewHomeVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const errorMsg = String(sp?.error ?? "").trim();

  return (
    <section className="bg-slate-50/50 py-10">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Admin • Home</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
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

        {errorMsg ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {decodeURIComponent(errorMsg)}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={upload} className="grid gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-700">Titre</div>
              <input
                name="title"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Ex: Vidéo chantier"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">Description</div>
              <input
                name="description"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Ex: Présentation vidéo (chantier / atelier)"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-700">
                  Fichier vidéo (MP4 recommandé)
                </div>
                <input
                  name="video_file"
                  type="file"
                  accept="video/*"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700">
                  Miniature (optionnel)
                </div>
                <input
                  name="thumbnail_file"
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 md:items-end">
              <div>
                <div className="text-xs font-semibold text-slate-700">order_index</div>
                <input
                  name="order_index"
                  type="number"
                  defaultValue={-1}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
                />
                <div className="mt-1 text-xs text-slate-500">
                  Mets <span className="font-mono">-1</span> pour ajouter automatiquement à la fin.
                </div>
              </div>

              <div className="flex justify-end">
                <SubmitUploadButton />
              </div>
            </div>
          </form>
        </div>
      </Container>
    </section>
  );
}