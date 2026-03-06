// app/admin/videos/page.tsx
import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/layout/Container";
import {
  listHomeVideosAdminAction,
  deleteHomeVideoAction,
  updateHomeVideoOrderAction,
  updateHomeVideoMetaAction,
  setFeaturedHomeVideoAction,
} from "./actions";

export const dynamic = "force-dynamic";

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

async function del(formData: FormData): Promise<void> {
  "use server";
  const res = await deleteHomeVideoAction(formData);
  if (!res.ok) redirect(`/admin/videos?error=${encodeURIComponent(res.message)}`);
  redirect(`/admin/videos?deleted=1`);
}

async function saveOrder(formData: FormData): Promise<void> {
  "use server";
  const res = await updateHomeVideoOrderAction(formData);
  if (!res.ok) redirect(`/admin/videos?error=${encodeURIComponent(res.message)}`);
  redirect(`/admin/videos?saved=1`);
}

async function saveMeta(formData: FormData): Promise<void> {
  "use server";
  const res = await updateHomeVideoMetaAction(formData);
  if (!res.ok) redirect(`/admin/videos?error=${encodeURIComponent(res.message)}`);
  redirect(`/admin/videos?saved=1`);
}

async function setFeatured(formData: FormData): Promise<void> {
  "use server";
  const res = await setFeaturedHomeVideoAction(formData);
  if (!res.ok) redirect(`/admin/videos?error=${encodeURIComponent(res.message)}`);
  redirect(`/admin/videos?saved=1`);
}

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; deleted?: string }>;
}) {
  const sp = await searchParams;
  const errorMsg = String(sp?.error ?? "").trim();
  const saved = sp?.saved === "1";
  const deleted = sp?.deleted === "1";

  const res = await listHomeVideosAdminAction();

  return (
    <section className="py-10 bg-slate-50/50">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Admin • Home</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Vidéos (Home)
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Upload MP4 + miniature (optionnel) dans Supabase Storage (bucket{" "}
              <span className="font-mono">videos</span> / <span className="font-mono">images</span>),
              puis affichage sur la page d’accueil.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              ← Retour admin
            </Link>
            <Link
              href="/admin/videos/new"
              className="inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              + Ajouter une vidéo
            </Link>
          </div>
        </div>

        {errorMsg ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {decodeURIComponent(errorMsg)}
          </div>
        ) : null}

        {saved ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Modifications enregistrées ✅
          </div>
        ) : null}

        {deleted ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Vidéo supprimée ✅
          </div>
        ) : null}

        {!res.ok ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Erreur: {res.message}
          </div>
        ) : res.data.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
            Aucune vidéo liée à <span className="font-mono">home.videos</span>.
          </div>
        ) : (
          <div className="grid gap-4">
            {res.data.map((row, idx) => {
              const v = row.media;
              const isFeatured = idx === 0; // home prend le premier comme "À la une"
              return (
                <div key={v.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* ✅ Warning Tailwind corrigé : min-w-[260px] -> min-w-65 */}
                    <div className="min-w-65">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-bold text-slate-900">{v.title}</div>

                        {isFeatured ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                            À la une
                          </span>
                        ) : null}

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          order {row.order_index}
                        </span>
                      </div>

                      {v.description ? (
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-2">
                          {v.description}
                        </p>
                      ) : null}

                      <div className="mt-3 text-xs text-slate-600">
                        kind: <span className="font-mono">{v.kind}</span> • id:{" "}
                        <span className="font-mono">{v.id}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <form action={setFeatured}>
                        <input type="hidden" name="media_id" value={v.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          Mettre “À la une”
                        </button>
                      </form>

                      <form action={del}>
                        <input type="hidden" name="media_id" value={v.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3 md:items-end">
                    <form action={saveOrder} className="flex items-end gap-2">
                      <input type="hidden" name="media_id" value={v.id} />
                      <div className="w-full">
                        <div className="text-xs font-semibold text-slate-700">order_index</div>
                        <input
                          name="order_index"
                          type="number"
                          defaultValue={String(row.order_index ?? 0)}
                          className={cn(
                            "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900",
                            "outline-none focus:ring-2 focus:ring-amber-300"
                          )}
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                      >
                        OK
                      </button>
                    </form>

                    <form action={saveMeta} className="md:col-span-2 grid gap-2">
                      <input type="hidden" name="media_id" value={v.id} />
                      <div>
                        <div className="text-xs font-semibold text-slate-700">Titre</div>
                        <input
                          name="title"
                          defaultValue={v.title}
                          className={cn(
                            "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900",
                            "outline-none focus:ring-2 focus:ring-amber-300"
                          )}
                        />
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-700">Description</div>
                        <input
                          name="description"
                          defaultValue={v.description ?? ""}
                          className={cn(
                            "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900",
                            "outline-none focus:ring-2 focus:ring-amber-300"
                          )}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:opacity-90"
                        >
                          Enregistrer meta
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}