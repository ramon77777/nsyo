// components/admin/AdminTopBar.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminTopBar() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky top-0 z-90 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3">
        <Link href="/admin" className="text-sm font-bold text-slate-900">
          Admin • NSYO
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Voir le site →
          </Link>

          <button
            type="button"
            onClick={signOut}
            disabled={loading}
            className={cn(
              "rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:opacity-90",
              loading && "opacity-60 cursor-not-allowed"
            )}
          >
            {loading ? "..." : "Se déconnecter"}
          </button>
        </div>
      </div>
    </div>
  );
}