// app/admin/quote-requests/actions.ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServerAction } from "@/lib/supabase/server";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function fail<T = never>(message: string): ActionResult<T> {
  return { ok: false, message };
}

function cleanText(v: unknown) {
  return String(v ?? "").trim();
}

export type QuoteRequestRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  source: string;
  page_id: string | null;
  status: "new" | "in_progress" | "done" | "spam";
  notes: string | null;
};

export async function listQuoteRequestsAction(args?: {
  status?: string;
  q?: string; // search by name/email/phone/message
}): Promise<ActionResult<QuoteRequestRow[]>> {
  try {
    const supabase = await supabaseServerAction();

    const status = cleanText(args?.status);
    const q = cleanText(args?.q);

    let query = supabase
      .from("quote_requests")
      .select(
        "id,created_at,updated_at,name,email,phone,message,source,page_id,status,notes"
      )
      .order("created_at", { ascending: false });

    if (status && ["new", "in_progress", "done", "spam"].includes(status)) {
      query = query.eq("status", status);
    }

    if (q) {
      // ilike OR sur plusieurs champs
      const like = `%${q}%`;
      query = query.or(
        [
          `name.ilike.${like}`,
          `email.ilike.${like}`,
          `phone.ilike.${like}`,
          `message.ilike.${like}`,
        ].join(",")
      );
    }

    const { data, error } = await query;
    if (error) return fail(error.message);

    return ok((data ?? []) as QuoteRequestRow[]);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur listQuoteRequestsAction");
  }
}

export async function getQuoteRequestAction(id: string): Promise<ActionResult<QuoteRequestRow>> {
  try {
    const supabase = await supabaseServerAction();
    const rid = cleanText(id);
    if (!rid) return fail("id manquant.");

    const { data, error } = await supabase
      .from("quote_requests")
      .select(
        "id,created_at,updated_at,name,email,phone,message,source,page_id,status,notes"
      )
      .eq("id", rid)
      .single();

    if (error) return fail(error.message);
    return ok(data as QuoteRequestRow);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur getQuoteRequestAction");
  }
}

export async function updateQuoteStatusAction(formData: FormData): Promise<ActionResult<null>> {
  try {
    const supabase = await supabaseServerAction();

    const id = cleanText(formData.get("id"));
    const status = cleanText(formData.get("status"));

    if (!id) return fail("id manquant.");
    if (!["new", "in_progress", "done", "spam"].includes(status)) {
      return fail("Statut invalide.");
    }

    const { error } = await supabase
      .from("quote_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return fail(error.message);

    revalidatePath("/admin/quote-requests");
    revalidatePath(`/admin/quote-requests/${id}`);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur updateQuoteStatusAction");
  }
}

export async function updateQuoteNotesAction(formData: FormData): Promise<ActionResult<null>> {
  try {
    const supabase = await supabaseServerAction();

    const id = cleanText(formData.get("id"));
    const notes = cleanText(formData.get("notes"));

    if (!id) return fail("id manquant.");

    const { error } = await supabase
      .from("quote_requests")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return fail(error.message);

    revalidatePath("/admin/quote-requests");
    revalidatePath(`/admin/quote-requests/${id}`);
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur updateQuoteNotesAction");
  }
}

export async function deleteQuoteRequestAction(formData: FormData): Promise<ActionResult<null>> {
  try {
    const supabase = await supabaseServerAction();
    const id = cleanText(formData.get("id"));
    if (!id) return fail("id manquant.");

    const { error } = await supabase.from("quote_requests").delete().eq("id", id);
    if (error) return fail(error.message);

    revalidatePath("/admin/quote-requests");
    return ok(null);
  } catch (e: any) {
    return fail(e?.message ?? "Erreur deleteQuoteRequestAction");
  }
}