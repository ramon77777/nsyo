// lib/data/business.ts
import "server-only";
import { supabaseServerAction, supabaseServerReadonly } from "@/lib/supabase/server";

export type BusinessUnit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
  is_active: boolean;
};

const BU_SELECT = "id,slug,title,summary,order_index,is_active" as const;

function cleanText(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeSlug(input: string): string {
  return cleanText(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toOrderIndex(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function toBool(v: unknown, fallback = true): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = cleanText(v).toLowerCase();
  if (!s) return fallback;
  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;
  return fallback;
}

function supaError(prefix: string, error: any): Error {
  const msg = error?.message ?? "Erreur inconnue Supabase";
  const hint = error?.hint ? `\nHint: ${error.hint}` : "";
  const details = error?.details ? `\nDetails: ${error.details}` : "";
  const code = error?.code ? `\nCode: ${error.code}` : "";
  return new Error(`${prefix}: ${msg}${code}${hint}${details}`);
}

/**
 * ✅ Retourne uniquement les pôles actifs (is_active = true)
 * => Ton compteur sur la home est automatiquement bon : businessUnits.length
 */
export async function getBusinessUnits(): Promise<BusinessUnit[]> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("business_units")
    .select(BU_SELECT)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) throw supaError("getBusinessUnits", error);
  return (data ?? []) as BusinessUnit[];
}

/**
 * ✅ Retourne un pôle actif par slug (ou variantes)
 */
export async function getBusinessUnitBySlug(slug: string): Promise<BusinessUnit | null> {
  const supabase = await supabaseServerReadonly();

  const raw = cleanText(slug);
  if (!raw) return null;

  const norm = normalizeSlug(raw);

  // variantes simples
  const rawLower = raw.toLowerCase();
  const dash = raw.replace(/_/g, "-").toLowerCase();
  const underscore = raw.replace(/-/g, "_").toLowerCase();

  const candidates = Array.from(new Set([raw, rawLower, norm, dash, underscore].filter(Boolean)));

  // 1) tentative rapide : match direct sur slug (et actif)
  const { data: hit, error: hitErr } = await supabase
    .from("business_units")
    .select(BU_SELECT)
    .eq("is_active", true)
    .in("slug", candidates)
    .limit(1);

  if (hitErr) throw supaError("getBusinessUnitBySlug", hitErr);

  const first = (hit ?? [])[0] ?? null;
  if (first) return first as BusinessUnit;

  // 2) fallback : on charge les actifs et on compare par normalisation (slug OU title)
  const { data: all, error: allErr } = await supabase
    .from("business_units")
    .select(BU_SELECT)
    .eq("is_active", true)
    .limit(500);

  if (allErr) throw supaError("getBusinessUnitBySlug(fallback)", allErr);

  const list = (all ?? []) as BusinessUnit[];

  // match slug normalisé
  let found = list.find((u) => normalizeSlug(u.slug) === norm) ?? null;

  // match title normalisé (si tes URLs sont basées sur le title)
  if (!found) {
    found = list.find((u) => normalizeSlug(u.title) === norm) ?? null;
  }

  return found;
}

export async function createBusinessUnit(input: {
  title: string;
  slug: string;
  summary?: string | null;
  order_index?: number;
  is_active?: boolean;
}): Promise<BusinessUnit> {
  const supabase = await supabaseServerAction();

  const title = cleanText(input.title);
  const slug = normalizeSlug(input.slug);
  const summary = cleanText(input.summary) || null;
  const order_index = toOrderIndex(input.order_index);
  const is_active = toBool(input.is_active, true);

  if (!title) throw new Error("createBusinessUnit: Le titre est obligatoire.");
  if (!slug) throw new Error("createBusinessUnit: Le slug est obligatoire.");

  const payload = { title, slug, summary, order_index, is_active };

  const { data, error } = await supabase
    .from("business_units")
    .insert(payload)
    .select(BU_SELECT)
    .single();

  if (error) {
    if (String(error.message ?? "").toLowerCase().includes("duplicate")) {
      throw new Error(`createBusinessUnit: Le slug "${slug}" existe déjà. Choisis-en un autre.`);
    }
    throw supaError("createBusinessUnit", error);
  }

  return data as BusinessUnit;
}

export async function updateBusinessUnit(
  id: string,
  input: {
    title: string;
    slug: string;
    summary?: string | null;
    order_index?: number;
    is_active?: boolean;
  }
): Promise<BusinessUnit> {
  const supabase = await supabaseServerAction();

  const unitId = cleanText(id);
  if (!unitId) throw new Error("updateBusinessUnit: id manquant.");

  const title = cleanText(input.title);
  const slug = normalizeSlug(input.slug);
  const summary = cleanText(input.summary) || null;
  const order_index = toOrderIndex(input.order_index);

  // si non fourni, on ne force pas à true/false; mais comme tu passes souvent tout,
  // on choisit un fallback "true" uniquement si on reçoit un undefined vide.
  const is_active =
    typeof input.is_active === "undefined" ? undefined : toBool(input.is_active, true);

  if (!title) throw new Error("updateBusinessUnit: Le titre est obligatoire.");
  if (!slug) throw new Error("updateBusinessUnit: Le slug est obligatoire.");

  const payload: any = { title, slug, summary, order_index };
  if (typeof is_active === "boolean") payload.is_active = is_active;

  const { data, error } = await supabase
    .from("business_units")
    .update(payload)
    .eq("id", unitId)
    .select(BU_SELECT)
    .single();

  if (error) {
    if (String(error.message ?? "").toLowerCase().includes("duplicate")) {
      throw new Error(`updateBusinessUnit: Le slug "${slug}" existe déjà. Choisis-en un autre.`);
    }
    throw supaError("updateBusinessUnit", error);
  }

  return data as BusinessUnit;
}

export async function deleteBusinessUnit(id: string): Promise<void> {
  const supabase = await supabaseServerAction();
  const unitId = cleanText(id);

  if (!unitId) throw new Error("deleteBusinessUnit: id manquant.");

  const { error } = await supabase.from("business_units").delete().eq("id", unitId);
  if (error) throw supaError("deleteBusinessUnit", error);
}