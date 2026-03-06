// app/admin/business-units/[id]/sections/_components/SectionsEditorClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { SortableRow } from "./sortable";
import MediaPickerModal from "./MediaPickerModal";
import {
  createItemAction,
  createSectionAction,
  deleteItemAction,
  deleteSectionAction,
  reorderItemsAction,
  reorderSectionsAction,
  setSectionImageAction,
  updateItemAction,
  updateSectionAction,
  type MediaPick,
} from "../actions";

export type SectionDTO = {
  id: string;
  business_unit_id: string;
  key: string;
  title: string;
  intro_text: string;
  order_index: number;
  image: { id: string; title: string; description: string | null; url: string; path: string } | null;
  items: Array<{ id: string; designation: string; qty: string; order_index: number }>;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

function SmallBtn({
  children,
  onClick,
  variant = "slate",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "slate" | "danger" | "amber";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl px-3 py-2 text-xs font-semibold border transition",
        variant === "slate" && "border-slate-200 bg-white text-slate-900 hover:bg-slate-100",
        variant === "amber" && "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
        variant === "danger" && "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

export default function SectionsEditorClient({
  businessUnitId,
  businessUnitSlug,
  initialSections,
}: {
  businessUnitId: string;
  businessUnitSlug: string;
  initialSections: SectionDTO[];
}) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const [sections, setSections] = useState<SectionDTO[]>(initialSections);

  // ✅ anti-hydration dnd-kit
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // modal picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  function openPicker(sectionId: string) {
    setPickerSectionId(sectionId);
    setPickerOpen(true);
  }

  function onPickMedia(m: MediaPick) {
    const sectionId = pickerSectionId;
    if (!sectionId) return;

    setPickerOpen(false);
    setPickerSectionId(null);

    // preview instant
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              image: { id: m.id, title: m.title, description: m.description, url: m.url, path: m.path },
            }
          : s
      )
    );

    startTransition(() => {
      (async () => {
        const res = await setSectionImageAction({
          businessUnitId,
          businessUnitSlug,
          sectionId,
          imageMediaId: m.id,
        });
        if (!res.ok) notify(res.message);
        else notify("Image liée ✅");
      })();
    });
  }

  function clearImage(sectionId: string) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, image: null } : s)));

    startTransition(() => {
      (async () => {
        const res = await setSectionImageAction({
          businessUnitId,
          businessUnitSlug,
          sectionId,
          imageMediaId: null,
        });
        if (!res.ok) notify(res.message);
        else notify("Image retirée ✅");
      })();
    });
  }

  // ---- Sections DnD
  function onDragEndSections(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(sections, oldIndex, newIndex).map((s, idx) => ({
      ...s,
      order_index: idx + 1,
    }));
    setSections(next);

    startTransition(() => {
      (async () => {
        const res = await reorderSectionsAction({
          businessUnitId,
          businessUnitSlug,
          orderedSectionIds: next.map((s) => s.id),
        });
        if (!res.ok) notify(res.message);
        else notify("Ordre des sections mis à jour ✅");
      })();
    });
  }

  async function saveSection(
    sectionId: string,
    patch: Partial<Pick<SectionDTO, "title" | "key" | "intro_text">>
  ) {
    const s = sections.find((x) => x.id === sectionId);
    if (!s) return;

    const title = (patch.title ?? s.title).trim();
    const key = slugify(patch.key ?? s.key).trim() || "section";
    const intro_text = patch.intro_text ?? s.intro_text;

    setSections((prev) => prev.map((x) => (x.id === sectionId ? { ...x, title, key, intro_text } : x)));

    startTransition(() => {
      (async () => {
        const res = await updateSectionAction({
          sectionId,
          title,
          key,
          intro_text,
        });
        if (!res.ok) notify(res.message);
        else notify("Section enregistrée ✅");
      })();
    });
  }

  function addSection() {
    const title = "Nouvelle section";

    startTransition(() => {
      (async () => {
        const res = await createSectionAction({ businessUnitId, title });
        if (!res.ok) return notify(res.message);

        const key = slugify(title) || "nouvelle-section";
        setSections((prev) => [
          ...prev,
          {
            id: res.data.id,
            business_unit_id: businessUnitId,
            key,
            title,
            intro_text: "",
            order_index: prev.length + 1,
            image: null,
            items: [],
          },
        ]);
        notify("Section créée ✅");
      })();
    });
  }

  function removeSection(sectionId: string) {
    if (!confirm("Supprimer cette section (et toutes ses lignes) ?")) return;

    startTransition(() => {
      (async () => {
        const res = await deleteSectionAction({ sectionId, businessUnitId, businessUnitSlug });
        if (!res.ok) return notify(res.message);

        setSections((prev) => prev.filter((s) => s.id !== sectionId));
        notify("Section supprimée ✅");
      })();
    });
  }

  // ---- Items DnD per section
  function onDragEndItems(sectionId: string, e: DragEndEvent) {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;

    const { active, over } = e;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = sec.items.findIndex((it) => it.id === active.id);
    const newIndex = sec.items.findIndex((it) => it.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextItems = arrayMove(sec.items, oldIndex, newIndex).map((it, idx) => ({
      ...it,
      order_index: idx + 1,
    }));

    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, items: nextItems } : s)));

    startTransition(() => {
      (async () => {
        const res = await reorderItemsAction({
          sectionId,
          orderedItemIds: nextItems.map((i) => i.id),
        });
        if (!res.ok) notify(res.message);
        else notify("Ordre du tableau mis à jour ✅");
      })();
    });
  }

  function addItem(sectionId: string) {
    const designation = "Nouvel engin";

    startTransition(() => {
      (async () => {
        const res = await createItemAction({ sectionId, designation, qty: "1" });
        if (!res.ok) return notify(res.message);

        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  items: [
                    ...s.items,
                    { id: res.data.id, designation, qty: "1", order_index: s.items.length + 1 },
                  ],
                }
              : s
          )
        );
        notify("Ligne ajoutée ✅");
      })();
    });
  }

  function saveItem(sectionId: string, itemId: string, patch: { designation?: string; qty?: string }) {
    const sec = sections.find((s) => s.id === sectionId);
    const it = sec?.items.find((x) => x.id === itemId);
    if (!sec || !it) return;

    const designation = (patch.designation ?? it.designation).trim();
    const qty = (patch.qty ?? it.qty).trim();

    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.map((x) => (x.id === itemId ? { ...x, designation, qty } : x)) }
          : s
      )
    );

    startTransition(() => {
      (async () => {
        const res = await updateItemAction({ itemId, designation, qty });
        if (!res.ok) notify(res.message);
      })();
    });
  }

  function removeItem(sectionId: string, itemId: string) {
    if (!confirm("Supprimer cette ligne ?")) return;

    startTransition(() => {
      (async () => {
        const res = await deleteItemAction({ itemId });
        if (!res.ok) return notify(res.message);

        setSections((prev) =>
          prev.map((s) => (s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s))
        );
        notify("Ligne supprimée ✅");
      })();
    });
  }

  // ---------- RENDER ----------
  return (
    <div className="space-y-5">
      {toast ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Sections & tableaux</div>
            <p className="mt-1 text-sm text-slate-600">
              Glisse-dépose pour réordonner. Choix d’image via modal. Aperçu instantané.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SmallBtn variant="amber" onClick={addSection} disabled={isPending}>
              + Ajouter une section
            </SmallBtn>
            <a
              href={`/business-unit/${businessUnitSlug}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
            >
              Preview public →
            </a>
            {isPending ? <span className="text-xs text-slate-600">Enregistrement…</span> : null}
          </div>
        </div>
      </div>

      {/* ✅ Anti-hydration: pas de DnD avant mount */}
      {!mounted ? (
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      key: <span className="ml-1 font-mono">{s.key}</span>
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                      chargement…
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndSections}>
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {sections.map((s) => (
                <SortableRow key={s.id} id={s.id}>
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            key: <span className="ml-1 font-mono">{s.key}</span>
                          </span>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                            drag&drop activé
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <label className="grid gap-2 text-sm">
                            <span className="font-semibold text-slate-900">Titre</span>
                            <input
                              value={s.title}
                              onChange={(e) =>
                                setSections((prev) =>
                                  prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x))
                                )
                              }
                              onBlur={() => saveSection(s.id, { title: s.title })}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                            />
                          </label>

                          <label className="grid gap-2 text-sm">
                            <span className="font-semibold text-slate-900">Key</span>
                            <input
                              value={s.key}
                              onChange={(e) =>
                                setSections((prev) =>
                                  prev.map((x) => (x.id === s.id ? { ...x, key: e.target.value } : x))
                                )
                              }
                              onBlur={() => saveSection(s.id, { key: s.key })}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
                            />
                            <div className="text-xs text-slate-500">
                              Ex: <span className="font-mono">levage</span>, <span className="font-mono">terrassement</span>…
                            </div>
                          </label>

                          <label className="grid gap-2 text-sm md:col-span-2">
                            <span className="font-semibold text-slate-900">Texte d’intro</span>
                            <textarea
                              value={s.intro_text}
                              onChange={(e) =>
                                setSections((prev) =>
                                  prev.map((x) => (x.id === s.id ? { ...x, intro_text: e.target.value } : x))
                                )
                              }
                              onBlur={() => saveSection(s.id, { intro_text: s.intro_text })}
                              rows={3}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="w-full lg:w-[320px]">
                        <div className="text-sm font-semibold text-slate-900">Image</div>

                        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                          <div className="relative h-40 bg-slate-100">
                            {s.image?.url ? (
                              <img src={s.image.url} alt={s.image.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
                                Aucune image
                              </div>
                            )}
                          </div>

                          <div className="p-3">
                            <div className="text-sm font-semibold text-slate-900 line-clamp-1">{s.image?.title ?? "—"}</div>
                            <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                              {s.image?.description ?? "Choisis une image depuis la bibliothèque médias."}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <SmallBtn variant="amber" onClick={() => openPicker(s.id)} disabled={isPending}>
                                Choisir une image
                              </SmallBtn>
                              <SmallBtn variant="slate" onClick={() => clearImage(s.id)} disabled={isPending}>
                                Retirer
                              </SmallBtn>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <SmallBtn variant="danger" onClick={() => removeSection(s.id)} disabled={isPending}>
                            Supprimer la section
                          </SmallBtn>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Tableau</div>
                          <div className="text-xs text-slate-600">Glisse les lignes pour réordonner.</div>
                        </div>

                        <SmallBtn variant="amber" onClick={() => addItem(s.id)} disabled={isPending}>
                          + Ajouter une ligne
                        </SmallBtn>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="grid grid-cols-[1.6fr_0.4fr_0.3fr] bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
                          <div>Désignation</div>
                          <div>Qté</div>
                          <div className="text-right">Actions</div>
                        </div>

                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => onDragEndItems(s.id, e)}
                        >
                          <SortableContext items={s.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                            <div className="divide-y divide-slate-200">
                              {s.items.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-slate-600">Aucune ligne. Clique “Ajouter une ligne”.</div>
                              ) : (
                                s.items.map((it) => (
                                  <SortableRow key={it.id} id={it.id}>
                                    <div className="grid grid-cols-[1.6fr_0.4fr_0.3fr] px-4 py-3 items-center gap-3">
                                      <input
                                        value={it.designation}
                                        onChange={(e) =>
                                          setSections((prev) =>
                                            prev.map((sec) =>
                                              sec.id === s.id
                                                ? {
                                                    ...sec,
                                                    items: sec.items.map((x) =>
                                                      x.id === it.id ? { ...x, designation: e.target.value } : x
                                                    ),
                                                  }
                                                : sec
                                            )
                                          )
                                        }
                                        onBlur={() => saveItem(s.id, it.id, { designation: it.designation })}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                      />

                                      <input
                                        value={it.qty}
                                        onChange={(e) =>
                                          setSections((prev) =>
                                            prev.map((sec) =>
                                              sec.id === s.id
                                                ? {
                                                    ...sec,
                                                    items: sec.items.map((x) =>
                                                      x.id === it.id ? { ...x, qty: e.target.value } : x
                                                    ),
                                                  }
                                                : sec
                                            )
                                          )
                                        }
                                        onBlur={() => saveItem(s.id, it.id, { qty: it.qty })}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                      />

                                      <div className="flex justify-end">
                                        <SmallBtn variant="danger" onClick={() => removeItem(s.id, it.id)} disabled={isPending}>
                                          Supprimer
                                        </SmallBtn>
                                      </div>
                                    </div>
                                  </SortableRow>
                                ))
                              )}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </div>
                  </div>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerSectionId(null);
        }}
        onPick={onPickMedia}
        businessUnitSlug={businessUnitSlug}
      />
    </div>
  );
}
