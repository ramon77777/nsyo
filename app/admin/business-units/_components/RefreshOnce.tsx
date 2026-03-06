"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefreshOnce() {
  const router = useRouter();

  useEffect(() => {
    // Force la page à récupérer la nouvelle payload RSC
    router.refresh();
  }, [router]);

  return null;
}
