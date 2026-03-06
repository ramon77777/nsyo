import type { ReactNode } from "react";

export default function AdminLoginLayout({ children }: { children: ReactNode }) {
  // Pas de requireAdmin ici, sinon boucle infinie
  return <>{children}</>;
}
