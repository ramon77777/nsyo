// lib/auth/requireAdmin.ts
import "server-only";
import { redirect } from "next/navigation";
import { supabaseServerAction, supabaseServerReadonly } from "@/lib/supabase/server";

async function isAdminReadonly(userId: string) {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return !!data;
}

async function isAdminAction(userId: string) {
  const supabase = await supabaseServerAction();

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return !!data;
}

export async function requireAdmin() {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/admin/login?error=not_authenticated");
  }

  const user = data.user;

  const ok = await isAdminReadonly(user.id);

  if (!ok) redirect("/admin/login?error=forbidden");

  return user;
}

export async function requireAdminNoRedirect() {
  const supabase = await supabaseServerAction();

  const { data, error } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);

  if (!data?.user) throw new Error("Non authentifié");

  const user = data.user;

  const ok = await isAdminAction(user.id);

  if (!ok) throw new Error("Accès refusé (admin requis)");

  return user;
}