// app/admin/business-units/_components/BusinessUnitsClient.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableRow } from "./SortableRow";
import {
  createBusinessUnitAction,
  deleteBusinessUnitAction,
  reorderBusinessUnitsAction,
  updateBusinessUnitAction,
} from "../actions";

export type BusinessUnit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
  created_at: string | null;
};

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type Mode = "create" | "edit";

function isNextRedirectError(e: unknown) {
  const msg = String((e as any)?.message ?? e ?? "");
  return msg.includes("NEXT_REDIRECT");
}

export default function BusinessUnitsClient({
  initialItems,
  refreshOnce,
}: {
  initialItems: BusinessUnit[];
  refreshOnce?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const [items, setItems] = useState<BusinessUnit[]>(
    [...initialItems].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    )
  );

  // Modal form
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editing, setEditing] = useState<BusinessUnit | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const ids = useMemo(() => items.map((x) => x.id), [items]);

  function notify(m: string) {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    if (!refreshOnce) return;
    // rien à faire ici côté client: la page server a déjà refresh initialItems
  }, [refreshOnce]);

  function openCreate() {
    setMode("create");
    setEditing(null);
    setOpen(true);
  }

  function openEdit(bu: BusinessUnit) {
    setMode("edit");
    setEditing(bu);
    setOpen(true);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = items.findIndex((x) => x.id === active.id);
    const newIndex = items.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex).map((x, idx) => ({
      ...x,
      order_index: idx + 1,
    }));

    setItems(next);

    startTransition(() => {
      (async () => {
        try {
          const res = await reorderBusinessUnitsAction({
            orderedIds: next.map((x) => x.id),
          });
          if (!res.ok) notify(res.message);
          else notify("Ordre mis à jour ✅");
        } catch (e) {
          notify(String((e as any)?.message ?? "Erreur réordonnancement"));
        }
      })();
    });
  }

  async function submit(fd: FormData) {
    startTransition(() => {
      (async () => {
        try {
          if (mode === "create") {
            const res = await createBusinessUnitAction(fd);
            if (!res.ok) return notify(res.message);

            // optimistic
            const title = String(fd.get("title") ?? "").trim();
            const slugRaw = String(fd.get("slug") ?? "").trim();
            const slug = slugRaw ? slugify(slugRaw) : slugify(title);
            const summary = String(fd.get("summary") ?? "").trim() || null;

            setItems((prev) => [
              ...prev,
              {
                id: res.data.id,
                title,
                slug,
                summary,
                order_index: prev.length + 1,
                created_at: new Date().toISOString(),
              },
            ]);

            setOpen(false);
            notify("Pôle créé ✅");
          } else {
            if (!editing) return;

            const res = await updateBusinessUnitAction(editing.id, fd);
            if (!res.ok) return notify(res.message);

            const title = String(fd.get("title") ?? "").trim();
            const slugRaw = String(fd.get("slug") ?? "").trim();
            const slug = slugRaw ? slugify(slugRaw) : slugify(title);
            const summary = String(fd.get("summary") ?? "").trim() || null;

            setItems((prev) =>
              prev.map((x) =>
                x.id === editing.id ? { ...x, title, slug, summary } : x
              )
            );

            setOpen(false);
            notify("Pôle mis à jour ✅");
          }
        } catch (e) {
          notify(String((e as any)?.message ?? "Erreur submit"));
        }
      })();
    });
  }

  function remove(bu: BusinessUnit) {
    if (!confirm(`Supprimer le pôle "${bu.title}" ?`)) return;

    startTransition(() => {
      (async () => {
        try {
          const res = await deleteBusinessUnitAction(bu.id);
          if (!res.ok) return notify(res.message);

          setItems((prev) => prev.filter((x) => x.id !== bu.id));
          notify("Pôle supprimé ✅");
        } catch (e) {
          // Le symptôme que tu as : NEXT_REDIRECT
          if (isNextRedirectError(e)) {
            notify(
              "Suppression bloquée: deleteBusinessUnitAction déclenche un redirect(). (Voir note ci-dessous)"
            );
            return;
          }
          notify(String((e as any)?.message ?? "Erreur suppression"));
        }
      })();
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-5 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Admin • NSYO
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Pôles d’activités
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Créer, modifier, supprimer et réordonner les pôles.{" "}
              <span className="font-semibold">
                “Sections & tableaux” est réservé à location-engins.
              </span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                ← Retour dashboard
              </Link>
              <Link
                href="/"
                className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Voir le site →
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-start md:items-end">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              + Nouveau pôle
            </button>

            {isPending ? (
              <div className="text-xs text-slate-600">Enregistrement…</div>
            ) : null}
          </div>
        </div>

        {toast ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {toast}
          </div>
        ) : null}

        <div className="mt-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((bu, idx) => {
                  const isLocationEngins = bu.slug === "location-engins";

                  return (
                    <SortableRow key={bu.id} id={bu.id}>
                      {/* ✅ IMPORTANT:
                          - On ne passe plus className à SortableRow (corrige ton erreur TS)
                          - On met h-full sur un wrapper interne */}
                      <div className="h-full">
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-lg font-bold text-slate-900 line-clamp-1">
                                {bu.title}
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                slug:{" "}
                                <span className="font-mono">{bu.slug}</span>
                              </div>
                            </div>
                            <div className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                              #{idx + 1}
                            </div>
                          </div>

                          <p className="mt-4 text-sm text-slate-600 line-clamp-3">
                            {bu.summary ?? "—"}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            {isLocationEngins ? (
                              <Link
                                href={`/admin/business-units/${bu.id}/sections`}
                                className="inline-flex rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:opacity-90"
                                title="Éditeur premium (4 blocs + images + drag&drop lignes)"
                              >
                                Sections & tableaux →
                              </Link>
                            ) : null}

                            <Link
                              href={`/business-unit/${bu.slug}`}
                              className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                            >
                              Voir public →
                            </Link>

                            <button
                              type="button"
                              onClick={() => openEdit(bu)}
                              className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                            >
                              Modifier
                            </button>

                            <button
                              type="button"
                              onClick={() => remove(bu)}
                              className="inline-flex rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                            >
                              Supprimer
                            </button>
                          </div>

                          <div className="mt-4 text-[11px] text-slate-400">
                            Astuce: utilise le bouton ⋮⋮ pour drag&drop.
                          </div>
                        </div>
                      </div>
                    </SortableRow>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <BUFormModal
        open={open}
        mode={mode}
        initial={editing}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        busy={isPending}
        suggestedOrder={items.length + 1}
      />
    </div>
  );
}

function BUFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  busy,
  suggestedOrder,
}: {
  open: boolean;
  mode: Mode;
  initial: BusinessUnit | null;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  busy: boolean;
  suggestedOrder: number;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [order, setOrder] = useState<number>(0);

  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;

    setTitle(initial?.title ?? "");
    setSlug(initial?.slug ?? "");
    setSummary(initial?.summary ?? "");
    setOrder(initial?.order_index ?? suggestedOrder);
    setSlugTouched(!!(initial?.slug ?? "").trim());
  }, [open, initial, suggestedOrder]);

  // slug auto tant que non touché
  useEffect(() => {
    if (!open) return;
    if (slugTouched) return;
    const next = slugify(title);
    setSlug(next);
  }, [title, slugTouched, open]);

  if (!open) return null;

  const titleOk = title.trim().length > 0;

  return (
    // ✅ warning Tailwind corrigé: z-[80] -> z-80
    <div className="fixed inset-0 z-80">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-16 md:inset-10">
        <div className="h-full w-full rounded-3xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {mode === "create" ? "Créer un pôle" : "Modifier le pôle"}
              </div>
              <div className="text-xs text-slate-600">
                “Sections & tableaux” est réservé à{" "}
                <span className="font-mono font-semibold">location-engins</span>.
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Fermer
              </button>

              <button
                type="button"
                disabled={busy || !titleOk}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("title", title.trim());
                  fd.set("slug", slug.trim());
                  fd.set("summary", summary.trim());
                  fd.set("order_index", String(order || 0));
                  onSubmit(fd);
                }}
                className={cn(
                  "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90",
                  (busy || !titleOk) && "opacity-60 cursor-not-allowed"
                )}
              >
                {busy ? "..." : "Enregistrer"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-900">Titre *</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  placeholder="Ex: Projets industriels"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-900">
                  Slug{" "}
                  <span className="text-slate-500">
                    ({slugTouched ? "manuel" : "auto"})
                  </span>
                </span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono"
                  placeholder="ex: projets-industriels"
                />
                <div className="text-xs text-slate-500">
                  URL publique :{" "}
                  <span className="font-mono">/business-unit/{slug || "..."}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSlugTouched(false);
                      setSlug(slugify(title));
                    }}
                    className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Reset slug auto
                  </button>
                </div>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-900">Résumé</span>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                  placeholder="Texte court affiché sur la home"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-900">Ordre</span>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                />
                <div className="text-xs text-slate-500">
                  (Optionnel) Tu peux surtout réordonner par drag&drop sur les cartes.
                </div>
              </label>

              {mode === "create" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Pour le pôle spécial, utilise le slug exact :{" "}
                  <span className="font-mono font-semibold">location-engins</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}