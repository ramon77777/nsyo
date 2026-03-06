// app/admin/projects/_components/DeleteProject.tsx
"use client";

import { useState, useTransition } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DeleteProject({
  title,
  onDelete,
}: {
  title: string;
  onDelete: () => Promise<any>;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const expected = title.trim();

  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
      <div className="text-sm font-semibold text-rose-900">Zone dangereuse</div>
      <p className="mt-1 text-sm text-rose-900/80">La suppression est irréversible.</p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
        >
          Supprimer ce projet
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="text-xs text-rose-900/80">
            Tape exactement : <span className="font-mono font-semibold">{expected}</span>
          </div>

          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={expected}
            className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={typed.trim() !== expected || isPending}
              onClick={() => {
                startTransition(async () => {
                  await onDelete();
                });
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                "bg-rose-700 hover:bg-rose-800",
                (typed.trim() !== expected || isPending) && "opacity-60 cursor-not-allowed"
              )}
            >
              {isPending ? "Suppression..." : "Confirmer suppression"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}