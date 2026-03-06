// app/admin/quote-requests/[id]/page.tsx
import "server-only";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/layout/Container";
import {
  getQuoteRequestAction,
  updateQuoteStatusAction,
  updateQuoteNotesAction,
  deleteQuoteRequestAction,
} from "../actions";

export const dynamic = "force-dynamic";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  } catch {
    return iso;
  }
}

async function setStatus(formData: FormData): Promise<void> {
  "use server";
  const id = String(formData.get("id") ?? "");
  const res = await updateQuoteStatusAction(formData);
  if (!res.ok) redirect(`/admin/quote-requests/${id}?error=${encodeURIComponent(res.message)}`);
  redirect(`/admin/quote-requests/${id}?saved=1`);
}

async function saveNotes(formData: FormData): Promise<void> {
  "use server";
  const id = String(formData.get("id") ?? "");
  const res = await updateQuoteNotesAction(formData);
  if (!res.ok) redirect(`/admin/quote-requests/${id}?error=${encodeURIComponent(res.message)}`);
  redirect(`/admin/quote-requests/${id}?saved=1`);
}

async function delRow(formData: FormData): Promise<void> {
  "use server";
  const res = await deleteQuoteRequestAction(formData);
  if (!res.ok) redirect(`/admin/quote-requests?error=${encodeURIComponent(res.message)}`);
  redirect(`/admin/quote-requests?deleted=1`);
}

export default async function AdminQuoteRequestDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const rid = String(id ?? "").trim();
  if (!rid) notFound();

  const saved = sp?.saved === "1";
  const errorMsg = String(sp?.error ?? "").trim();

  const res = await getQuoteRequestAction(rid);
  if (!res.ok) {
    return (
      <section className="py-10">
        <Container>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Erreur: {res.message}
          </div>
        </Container>
      </section>
    );
  }

  const r = res.data;

  return (
    <section className="py-10 bg-slate-50/50">
      <Container>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Admin • Demandes</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {r.name}
            </h1>
            <div className="mt-2 text-sm text-slate-600">
              Reçu le <span className="font-semibold">{fmtDate(r.created_at)}</span>
              <span className="text-slate-400"> • </span>
              <span className="font-mono">{r.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/quote-requests"
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              ← Retour
            </Link>

            <form action={delRow}>
              <input type="hidden" name="id" value={r.id} />
              <button
                type="submit"
                className="inline-flex items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
              >
                Supprimer
              </button>
            </form>
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

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Message */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="text-xs font-semibold text-slate-700">Message</div>
            <div className="mt-3 whitespace-pre-line text-sm text-slate-800 leading-relaxed">
              {r.message}
            </div>

            <div className="mt-6 grid gap-2 text-sm text-slate-700">
              {r.email ? (
                <div>
                  Email :{" "}
                  <a className="font-semibold text-slate-900 hover:underline" href={`mailto:${r.email}`}>
                    {r.email}
                  </a>
                </div>
              ) : null}
              {r.phone ? (
                <div>
                  Téléphone :{" "}
                  <a className="font-semibold text-slate-900 hover:underline" href={`tel:${r.phone}`}>
                    {r.phone}
                  </a>
                </div>
              ) : null}
              <div>
                Source : <span className="font-mono text-slate-900">{r.source}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <aside className="space-y-6">
            {/* Status */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-bold text-slate-900">Statut</div>

              <form action={setStatus} className="mt-4 grid gap-3">
                <input type="hidden" name="id" value={r.id} />
                <select
                  name="status"
                  defaultValue={r.status}
                  className={cn(
                    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm",
                    "outline-none focus:ring-2 focus:ring-amber-300"
                  )}
                >
                  <option value="new">Nouveau</option>
                  <option value="in_progress">En cours</option>
                  <option value="done">Traité</option>
                  <option value="spam">Spam</option>
                </select>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90"
                >
                  Enregistrer
                </button>
              </form>
            </div>

            {/* Notes */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-bold text-slate-900">Notes internes</div>

              <form action={saveNotes} className="mt-4 grid gap-3">
                <input type="hidden" name="id" value={r.id} />
                <textarea
                  name="notes"
                  defaultValue={r.notes ?? ""}
                  rows={6}
                  placeholder="Notes admin…"
                  className={cn(
                    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900",
                    "outline-none focus:ring-2 focus:ring-amber-300"
                  )}
                />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Sauvegarder les notes
                </button>
              </form>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}