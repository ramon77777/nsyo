// app/admin/quote-requests/page.tsx
import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/layout/Container";
import {
  listQuoteRequestsAction,
  updateQuoteStatusAction,
  deleteQuoteRequestAction,
  QuoteRequestRow,
} from "./actions";

export const dynamic = "force-dynamic";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: QuoteRequestRow["status"] }) {
  const map: Record<QuoteRequestRow["status"], string> = {
    new: "border-sky-200 bg-sky-50 text-sky-800",
    in_progress: "border-amber-200 bg-amber-50 text-amber-800",
    done: "border-emerald-200 bg-emerald-50 text-emerald-800",
    spam: "border-rose-200 bg-rose-50 text-rose-800",
  };

  const label: Record<QuoteRequestRow["status"], string> = {
    new: "Nouveau",
    in_progress: "En cours",
    done: "Traité",
    spam: "Spam",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        map[status]
      )}
    >
      {label[status]}
    </span>
  );
}

// Wrappers form actions (compat <form action>)
async function setStatus(formData: FormData): Promise<void> {
  "use server";
  const res = await updateQuoteStatusAction(formData);
  if (!res.ok) {
    const msg = encodeURIComponent(res.message);
    redirect(`/admin/quote-requests?error=${msg}`);
  }
  redirect(`/admin/quote-requests?saved=1`);
}

async function delRow(formData: FormData): Promise<void> {
  "use server";
  const res = await deleteQuoteRequestAction(formData);
  if (!res.ok) {
    const msg = encodeURIComponent(res.message);
    redirect(`/admin/quote-requests?error=${msg}`);
  }
  redirect(`/admin/quote-requests?deleted=1`);
}

export default async function AdminQuoteRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; saved?: string; deleted?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const status = String(sp?.status ?? "").trim();
  const q = String(sp?.q ?? "").trim();

  const saved = sp?.saved === "1";
  const deleted = sp?.deleted === "1";
  const errorMsg = String(sp?.error ?? "").trim();

  const res = await listQuoteRequestsAction({ status, q });

  return (
    <section className="py-10 bg-slate-50/50">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Admin • Demandes</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Demandes de devis
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Consulte, classe et traite les demandes envoyées depuis le site.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            ← Retour admin
          </Link>
        </div>

        {errorMsg ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {decodeURIComponent(errorMsg)}
          </div>
        ) : null}

        {saved ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Statut mis à jour ✅
          </div>
        ) : null}

        {deleted ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Demande supprimée ✅
          </div>
        ) : null}

        {/* Filters */}
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <form className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
            <div>
              <div className="text-xs font-semibold text-slate-700">Statut</div>
              <select
                name="status"
                defaultValue={status || ""}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              >
                <option value="">Tous</option>
                <option value="new">Nouveau</option>
                <option value="in_progress">En cours</option>
                <option value="done">Traité</option>
                <option value="spam">Spam</option>
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">Recherche</div>
              <input
                name="q"
                defaultValue={q}
                placeholder="Nom, email, téléphone, message…"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Filtrer
            </button>
          </form>
        </div>

        {!res.ok ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Erreur: {res.message}
          </div>
        ) : res.data.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
            Aucune demande pour le moment.
          </div>
        ) : (
          <div className="grid gap-4">
            {res.data.map((r) => (
              <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* ⬇️ min-w-[260px] -> min-w-64 (256px) */}
                  <div className="min-w-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-bold text-slate-900">{r.name}</div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Reçu le <span className="font-semibold">{fmtDate(r.created_at)}</span>
                      {r.source ? <span className="text-slate-400"> • </span> : null}
                      {r.source ? <span className="font-mono text-slate-600">{r.source}</span> : null}
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-slate-700">
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
                          Tél :{" "}
                          <a className="font-semibold text-slate-900 hover:underline" href={`tel:${r.phone}`}>
                            {r.phone}
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* ⬇️ min-w-[260px] -> min-w-64 (256px) */}
                  <div className="flex-1 min-w-64">
                    <div className="text-xs font-semibold text-slate-700">Message</div>
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line line-clamp-4">
                      {r.message}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/quote-requests/${r.id}`}
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        Ouvrir →
                      </Link>

                      <form action={setStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <select
                          name="status"
                          defaultValue={r.status}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
                        >
                          <option value="new">Nouveau</option>
                          <option value="in_progress">En cours</option>
                          <option value="done">Traité</option>
                          <option value="spam">Spam</option>
                        </select>
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-xl bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:opacity-90"
                        >
                          Mettre à jour
                        </button>
                      </form>

                      <form action={delRow}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}