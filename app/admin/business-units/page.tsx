// app/admin/business-units/page.tsx
import { supabaseServerReadonly } from "@/lib/supabase/server";
import BusinessUnitsClient from "./_components/BusinessUnitsClient";

export const dynamic = "force-dynamic";

export type BusinessUnit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
  created_at: string | null;

  // optionnel (si tu as fait la migration)
  page_title?: string | null;
  page_intro?: string | null;
};

async function getBusinessUnits(): Promise<BusinessUnit[]> {
  const supabase = await supabaseServerReadonly();

  const { data, error } = await supabase
    .from("business_units")
    .select("id,slug,title,summary,order_index,created_at,page_title,page_intro")
    .order("order_index", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as BusinessUnit[];
}

export default async function AdminBusinessUnitsPage({
  searchParams,
}: {
  searchParams?: Promise<{ updated?: string; created?: string; deleted?: string }>;
}) {
  const items = await getBusinessUnits();
  const sp = await searchParams;

  const refreshOnce = !!(sp?.updated || sp?.created || sp?.deleted);

  return <BusinessUnitsClient initialItems={items} refreshOnce={refreshOnce} />;
}
