import Container from "@/components/layout/Container";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <a href="/admin" className="font-bold text-slate-900">
              NSYO <span className="text-slate-400">Admin</span>
            </a>

            <nav className="flex items-center gap-2">
              <a
                href="/admin/business-units"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Pôles
              </a>
              <a
                href="/admin/projects"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Projets
              </a>
              <a
                href="/admin/media"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Médias
              </a>

              <a
                href="/"
                className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Voir le site
              </a>
            </nav>
          </div>
        </Container>
      </header>

      <main>{children}</main>
    </div>
  );
}
