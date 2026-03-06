// app/admin/business-units/_components/DeleteBusinessUnit.tsx
"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DeleteBusinessUnit({
  title,
  onDelete,
}: {
  title: string;
  onDelete: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dialogTitleId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const expected = useMemo(() => title.trim(), [title]);
  const canDelete = typed.trim() === expected && expected.length > 0;

  function close() {
    setOpen(false);
    setTyped("");
    setError(null);
    // Retour focus sur le bouton d’ouverture
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  // Focus + ESC
  useEffect(() => {
    if (!open) return;

    const t = window.setTimeout(() => inputRef.current?.focus(), 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function confirmDelete() {
    setError(null);

    startTransition(async () => {
      try {
        await onDelete(); // souvent redirect() côté server action
      } catch (e: any) {
        setError(e?.message ?? "Impossible de supprimer. Réessaie.");
      }
    });
  }

  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-rose-900">Zone dangereuse</div>
          <p className="mt-1 text-sm text-rose-900/80">
            La suppression est <b>irréversible</b>. Ce pôle sera retiré du site.
          </p>
        </div>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
        >
          Supprimer
        </button>
      </div>

      {/* Modal */}
      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          onMouseDown={(e) => {
            // clic sur overlay => ferme
            if (e.target === e.currentTarget) close();
          }}
        >
          {/* overlay */}
          <div className="absolute inset-0 bg-slate-950/40" />

          {/* panel */}
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={dialogTitleId} className="text-base font-semibold text-slate-900">
                  Confirmer la suppression
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Pour éviter toute erreur, tape exactement le nom du pôle :
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              Tape : <span className="font-mono font-semibold">{expected}</span>
            </div>

            <div className="mt-4">
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={expected}
                className={cn(
                  "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none",
                  "border-slate-200 focus:border-slate-400"
                )}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <div className="mt-2 text-xs text-slate-500">
                {canDelete ? (
                  <span className="text-emerald-700">✓ Correspondance exacte</span>
                ) : (
                  <span>La suppression sera activée après correspondance exacte.</span>
                )}
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className={cn(
                  "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50",
                  isPending && "cursor-not-allowed opacity-60"
                )}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={!canDelete || isPending}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white transition",
                  "bg-rose-700 hover:bg-rose-800",
                  (!canDelete || isPending) && "cursor-not-allowed opacity-60"
                )}
              >
                {isPending ? "Suppression..." : "Confirmer suppression"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
