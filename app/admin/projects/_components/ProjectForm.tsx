// app/admin/projects/_components/ProjectForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

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

function isNextInternalNavigationError(err: unknown): boolean {
  const re = /NEXT_(REDIRECT|NOT_FOUND)/i;

  if (err == null) return false;
  if (typeof err === "string") return re.test(err);

  if (typeof err === "object") {
    const anyErr = err as any;

    const digest = typeof anyErr?.digest === "string" ? anyErr.digest : "";
    if (re.test(digest)) return true;

    const message = typeof anyErr?.message === "string" ? anyErr.message : "";
    if (re.test(message)) return true;

    const cause = anyErr?.cause;
    if (cause && isNextInternalNavigationError(cause)) return true;

    try {
      if (re.test(String(anyErr))) return true;
    } catch {}
  }

  try {
    return re.test(String(err));
  } catch {
    return false;
  }
}

export type BusinessUnitOption = {
  id: string;
  title: string;
};

type Defaults = {
  business_unit_id?: string;
  title?: string;
  slug?: string;
  description?: string;
  location?: string | null;
  date?: string | null; // ✅ TEXTE LIBRE
  category?: string | null;
  is_featured?: boolean;
};

export default function ProjectForm({
  mode,
  businessUnits,
  defaults,
  submitAction,
}: {
  mode: "create" | "edit";
  businessUnits: BusinessUnitOption[];
  defaults?: Defaults;
  submitAction: (fd: FormData) => Promise<any>;
}) {
  const sp = useSearchParams();
  const initialError = useMemo(() => sp.get("error"), [sp]);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    initialError ? decodeURIComponent(initialError) : null
  );

  const businessUnitMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of businessUnits) m.set(b.id, (b.title ?? "").trim());
    return m;
  }, [businessUnits]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of businessUnits) {
      const t = (b.title ?? "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [businessUnits]);

  const noBusinessUnits = businessUnits.length === 0;

  const initialBU = defaults?.business_unit_id ?? (businessUnits[0]?.id ?? "");
  const [businessUnitId, setBusinessUnitId] = useState<string>(initialBU);

  const [title, setTitle] = useState(defaults?.title ?? "");
  const [slug, setSlug] = useState(defaults?.slug ?? "");
  const [description, setDescription] = useState(defaults?.description ?? "");
  const [location, setLocation] = useState(defaults?.location ?? "");

  // ✅ Date = texte libre (pas calendrier)
  const [date, setDate] = useState(defaults?.date ?? "");

  const [isFeatured, setIsFeatured] = useState(!!defaults?.is_featured);

  const [slugTouched, setSlugTouched] = useState<boolean>(
    !!(defaults?.slug ?? "").trim()
  );
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const [categoryTouched, setCategoryTouched] = useState(false);

  const defaultCategory = useMemo(() => {
    const fromDefaults = (defaults?.category ?? "").trim();
    if (fromDefaults && categoryOptions.includes(fromDefaults)) return fromDefaults;

    const buTitle = (businessUnitMap.get(initialBU) ?? "").trim();
    if (buTitle && categoryOptions.includes(buTitle)) return buTitle;

    return "";
  }, [defaults?.category, categoryOptions, businessUnitMap, initialBU]);

  const [category, setCategory] = useState<string>(defaultCategory);

  useEffect(() => {
    if (categoryTouched) return;
    const next = (businessUnitMap.get(businessUnitId) ?? "").trim();
    setCategory(next);
  }, [businessUnitId, businessUnitMap, categoryTouched]);

  const slugModeLabel = slugTouched ? "manual" : "auto";

  const submittingRef = useRef(false);

  return (
    <form
      action={(fd) => {
        if (submittingRef.current) return;

        setError(null);

        fd.set("business_unit_id", businessUnitId);
        fd.set("title", title);
        fd.set("slug", slug);
        fd.set("description", description);
        fd.set("location", location ?? "");
        fd.set("date", date ?? ""); // ✅ texte libre
        fd.set("category", (category ?? "").trim());

        if (isFeatured) fd.set("is_featured", "on");
        else fd.delete("is_featured");

        submittingRef.current = true;

        startTransition(() => {
          (async () => {
            const res = await submitAction(fd);
            if (res && typeof res === "object" && "ok" in res && res.ok === false) {
              setError((res as any).message ?? "Erreur lors de l’enregistrement.");
            }
          })()
            .catch((e) => {
              if (isNextInternalNavigationError(e)) throw e;
              setError((e as any)?.message ?? "Erreur lors de l’enregistrement.");
            })
            .finally(() => {
              submittingRef.current = false;
            });
        });
      }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-busy={isPending}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {mode === "create" ? "Créer un projet" : "Modifier le projet"}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Pôle, titre + slug, description, infos (catégorie/lieu/date), mise en avant.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSlugTouched(false);
              setSlug(slugify(title));
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Reset slug
          </button>

          <button
            type="submit"
            disabled={isPending || noBusinessUnits}
            className={cn(
              "rounded-xl px-5 py-3 text-sm font-semibold text-white transition",
              "bg-slate-950 hover:opacity-90",
              (isPending || noBusinessUnits) && "cursor-not-allowed opacity-60"
            )}
          >
            {isPending ? "Enregistrement..." : mode === "create" ? "Enregistrer" : "Mettre à jour"}
          </button>
        </div>
      </div>

      {noBusinessUnits ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          Aucun pôle (business unit) trouvé. Crée d’abord un pôle avant de créer un projet.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Pôle */}
        <label className="grid gap-2 text-sm lg:col-span-2">
          <span className="font-semibold text-slate-900">Pôle (Business Unit) *</span>
          <select
            name="business_unit_id"
            value={businessUnitId}
            onChange={(e) => setBusinessUnitId(e.target.value)}
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {businessUnits.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>

        {/* Titre */}
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-900">Titre *</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Projet industriel"
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        {/* Slug */}
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-900">
            Slug <span className="text-slate-500">({slugModeLabel})</span>
          </span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="projet-industriel"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono"
          />
          <div className="text-xs text-slate-500">
            URL publique : <span className="font-mono">/projects/{slug || "..."}</span>
          </div>
        </label>

        {/* Description */}
        <label className="grid gap-2 text-sm lg:col-span-2">
          <span className="font-semibold text-slate-900">Description *</span>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            required
            placeholder="Description complète du projet…"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"
          />
        </label>

        {/* Catégorie */}
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-900">Catégorie</span>
          <select
            name="category"
            value={category}
            onChange={(e) => {
              setCategoryTouched(true);
              setCategory(e.target.value);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Aucune —</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="text-xs text-slate-500">
            Par défaut, la catégorie suit le pôle. Tu peux la changer manuellement.
          </div>
        </label>

        {/* Lieu */}
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-900">Lieu</span>
          <input
            name="location"
            value={location ?? ""}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: Abidjan"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        {/* ✅ Date (TEXTE LIBRE) */}
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-900">Date</span>
          <input
            name="date"
            value={date ?? ""}
            onChange={(e) => setDate(e.target.value)}
            placeholder='Ex: "2024" ou "Janvier 2025"'
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="text-xs text-slate-500">
            Champ libre (pas un calendrier). Exemple : “2024”, “Janvier 2025”.
          </div>
        </label>

        {/* Featured */}
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <input
            name="is_featured"
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="font-semibold text-slate-900">Mettre en avant (featured)</span>
        </label>
      </div>
    </form>
  );
}
