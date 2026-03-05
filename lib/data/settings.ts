import { supabaseServer } from "@/lib/supabase/server";
import type { SiteSetting } from "@/lib/supabase/types";

export async function getSiteSettings(): Promise<Record<string, any>> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value");

  if (error) throw new Error(error.message);

  const map: Record<string, any> = {};
  (data as SiteSetting[]).forEach((row) => (map[row.key] = row.value));
  return map;
}
