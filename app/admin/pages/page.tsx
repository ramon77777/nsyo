// app/admin/pages/page.tsx
import "server-only";
import Link from "next/link";
import Container from "@/components/layout/Container";
import { listPagesAction } from "./actions";

export const dynamic = "force-dynamic";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "slate";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

export default async function AdminPagesIndex() {
  const res = await listPagesAction();

  return (
    <section className="py-10">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-sm text-slate-500">Admin • NSYO</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Pages & Navbar
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Modifie les pages (slug/titre/publication) et leurs{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em]">
                content_blocks
              </code>
              .
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            ← Retour admin
          </Link>
        </div>

        {!res.ok ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <div className="font-semibold">Erreur</div>
            <div className="mt-1">{res.message}</div>
          </div>
        ) : res.data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            Aucune page trouvée.
          </div>
        ) : (
          <div className="grid gap-4">
            {res.data.map((p) => {
              const href = `/admin/pages/${p.id}`;

              return (
                <Link
                  key={p.id}
                  href={href}
                  className={cn(
                    "group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm",
                    "transition hover:-translate-y-1 hover:shadow-lg",
                    "focus:outline-none focus:ring-2 focus:ring-amber-300"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {p.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        <span className="font-mono">/{p.slug}</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 font-mono">
                        id: {p.id}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.is_published ? (
                        <Badge tone="green">Publié</Badge>
                      ) : (
                        <Badge tone="slate">Brouillon</Badge>
                      )}

                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                        Ouvrir{" "}
                        <span
                          className="transition-transform group-hover:translate-x-1"
                          aria-hidden
                        >
                          →
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-0 ring-amber-400/30 transition group-hover:ring-2" />
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}