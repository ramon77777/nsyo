// app/admin/videos/new/ui/NewHomeVideoForm.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { uploadHomeVideoAction } from "../../actions";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function NewHomeVideoForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  async function onSubmit(formData: FormData) {
    setErrorMsg("");
    setSuccessMsg("");

    startTransition(() => {
      void (async () => {
        try {
          const title = String(formData.get("title") ?? "").trim();
          const videoFile = formData.get("video_file");

          if (!title) {
            setErrorMsg("Le titre est obligatoire.");
            return;
          }

          if (!(videoFile instanceof File) || videoFile.size === 0) {
            setErrorMsg("Fichier vidéo manquant.");
            return;
          }

          const res = await uploadHomeVideoAction(formData);

          if (!res.ok) {
            setErrorMsg(res.message || "Erreur lors de l’upload.");
            return;
          }

          setSuccessMsg("Vidéo ajoutée avec succès ✅");
          formRef.current?.reset();

          router.push("/admin/videos?saved=1");
          router.refresh();
        } catch (e: any) {
          setErrorMsg(e?.message ?? "Erreur inattendue lors de l’upload.");
        }
      })();
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Link
          href="/admin/videos"
          className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          ← Retour
        </Link>
      </div>

      {errorMsg ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMsg}
        </div>
      ) : null}

      {successMsg ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {successMsg}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          ref={formRef}
          action={onSubmit}
          className="grid gap-4"
        >
          <div>
            <div className="text-xs font-semibold text-slate-700">Titre</div>
            <input
              name="title"
              required
              disabled={isPending}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60"
              placeholder="Ex: Vidéo chantier"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700">Description</div>
            <input
              name="description"
              disabled={isPending}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60"
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
                disabled={isPending}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm disabled:opacity-60"
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
                disabled={isPending}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm disabled:opacity-60"
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
                disabled={isPending}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60"
              />
              <div className="mt-1 text-xs text-slate-500">
                Mets <span className="font-mono">-1</span> pour ajouter automatiquement à la fin.
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  "inline-flex items-center rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90",
                  isPending && "cursor-not-allowed opacity-60"
                )}
              >
                {isPending ? "Upload en cours..." : "Uploader & Ajouter à la Home"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}