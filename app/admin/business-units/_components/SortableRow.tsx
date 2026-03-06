// app/admin/business-units/_components/SortableRow.tsx
"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // ✅ évite mismatch d’attributs aria de dnd-kit au moment de l’hydratation
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-10")}>
      <div className="flex items-stretch gap-3">
        {/* Drag handle (petite colonne à gauche) */}
        <div
          className={cn(
            "shrink-0 flex items-center justify-center px-2",
            "rounded-2xl border border-slate-200 bg-white",
            "cursor-grab active:cursor-grabbing select-none",
            "text-slate-700"
          )}
          {...(mounted ? attributes : {})}
          {...(mounted ? listeners : {})}
          aria-label="Déplacer"
          title="Déplacer"
        >
          <span className="text-lg leading-none">⋮⋮</span>
        </div>

        {/* Card */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
