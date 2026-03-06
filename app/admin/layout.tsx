// app/admin/layout.tsx
import Container from "@/components/layout/Container";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseServerAction } from "@/lib/supabase/server";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🔐 protège tout /admin
  await requireAdmin();

  // 🚪 logout server action (cookie-based)
  async function logout() {
    "use server";
    const supabase = await supabaseServerAction();
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <Container>
          <div className="flex items-center justify-between gap-3 py-4">
            <div className="font-bold text-slate-900">Admin • NSYO</div>

            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/admin"
                className="rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </Link>

              <Link
                href="/admin/business-units"
                className="rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Pôles d&apos;activités
              </Link>

              <Link
                href="/"
                className="rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Voir le site
              </Link>

              <form action={logout} className="ml-2">
                <button
                  type="submit"
                  className={cn(
                    "rounded-lg px-3 py-2 font-semibold",
                    "text-rose-700 hover:bg-rose-50"
                  )}
                  title="Se déconnecter"
                >
                  Se déconnecter
                </button>
              </form>
            </nav>
          </div>
        </Container>
      </header>

      <main className="py-8">
        <Container>{children}</Container>
      </main>
    </div>
  );
}