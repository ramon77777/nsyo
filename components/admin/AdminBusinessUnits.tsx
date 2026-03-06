"use client";

import { useMemo, useState } from "react";

export type BusinessUnit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto flex h-full max-w-2xl items-center px-4">
        <div className="w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="font-bold text-slate-900">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Fermer
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminBusinessUnits({
  items,
  createAction,
  updateAction,
  deleteAction,
}: {
  items: BusinessUnit[];
  createAction: (formData: FormData) => void;
  updateAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
}) {
  const [q, setQ] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [edit, setEdit] = useState<BusinessUnit | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((x) => {
      return (
        x.title.toLowerCase().includes(term) ||
        x.slug.toLowerCase().includes(term) ||
        (x.summary ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, q]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (titre, slug, résumé)…"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-slate-400"
          />
          <div className="text-xs font-semibold text-slate-500">
            {filtered.length} / {items.length}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Nouveau pôle
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
          <div className="col-span-4">Titre</div>
          <div className="col-span-3">Slug</div>
          <div className="col-span-3">Ordre</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {filtered.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-12 items-center gap-2 px-4 py-3 hover:bg-slate-50"
          >
            <div className="col-span-4">
              <div className="font-semibold text-slate-900">{u.title}</div>
              <div className="text-xs text-slate-500 line-clamp-1">
                {u.summary ?? "—"}
              </div>
            </div>

            <div className="col-span-3 text-sm text-slate-700">{u.slug}</div>

            <div className="col-span-3 text-sm text-slate-700">
              {u.order_index}
            </div>

            <div className="col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEdit(u)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                Modifier
              </button>

              <form
                action={deleteAction}
                onSubmit={(e) => {
                  const ok = confirm(
                    `Supprimer le pôle "${u.title}" ?\n\nAttention: si des projets y sont liés, la suppression peut échouer (FK).`
                  );
                  if (!ok) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={u.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Supprimer
                </button>
              </form>
            </div>
          </div>
        ))}

        {!filtered.length ? (
          <div className="p-8 text-center text-slate-600">
            Aucun pôle trouvé.
          </div>
        ) : null}
      </div>

      {/* Create modal */}
      <Modal
        open={openCreate}
        title="Créer un pôle"
        onClose={() => setOpenCreate(false)}
      >
        <form
          action={createAction}
          onSubmit={() => setOpenCreate(false)}
          className="grid gap-4"
        >
          <div>
            <label className="text-sm font-semibold text-slate-900">Titre</label>
            <input
              name="title"
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="Ex: Construction urbaine"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">Slug</label>
            <input
              name="slug"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="Optionnel (auto depuis le titre)"
            />
            <div className="mt-1 text-xs text-slate-500">
              Laisse vide pour générer automatiquement.
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">Résumé</label>
            <textarea
              name="summary"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              rows={3}
              placeholder="Courte description (optionnelle)"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">Ordre</label>
            <input
              name="order_index"
              type="number"
              defaultValue={0}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenCreate(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Créer
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!edit}
        title="Modifier un pôle"
        onClose={() => setEdit(null)}
      >
        {edit ? (
          <form
            action={updateAction}
            onSubmit={() => setEdit(null)}
            className="grid gap-4"
          >
            <input type="hidden" name="id" value={edit.id} />

            <div>
              <label className="text-sm font-semibold text-slate-900">Titre</label>
              <input
                name="title"
                required
                defaultValue={edit.title}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900">Slug</label>
              <input
                name="slug"
                defaultValue={edit.slug}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900">Résumé</label>
              <textarea
                name="summary"
                defaultValue={edit.summary ?? ""}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900">Ordre</label>
              <input
                name="order_index"
                type="number"
                defaultValue={edit.order_index}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Enregistrer
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
