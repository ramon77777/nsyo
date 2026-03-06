// lib/data/settings.ts
import { supabaseServerReadonly } from "@/lib/supabase/server";

export type SiteSettingRow = {
  key: string;
  value: any;
};

export async function getSiteSettings(): Promise<Record<string, any>> {
  // ✅ IMPORTANT: await sinon supabase = Promise
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value");

  if (error) throw new Error(error.message);

  const out: Record<string, any> = {};
  (data ?? []).forEach((row: SiteSettingRow) => {
    out[row.key] = row.value;
  });

  return out;
}
