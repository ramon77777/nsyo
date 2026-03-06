// app/admin/page.tsx
import "server-only";

import Container from "@/components/layout/Container";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAction } from "@/lib/supabase/server";

type AdminCard = {
  title: string;
  description: string;
  href: string;
  accent?: "amber" | "slate";
};

const cards: AdminCard[] = [
  {
    title: "Pages & Navbar",
    description:
      "Modifier les pages (Présentation, Références, etc.) et leurs blocs de contenu.",
    href: "/admin/pages",
    accent: "amber",
  },
  {
    title: "Pôles d’activités",
    description: "Créer, modifier et organiser les business units.",
    href: "/admin/business-units",
    accent: "amber",
  },
  {
    title: "Projets",
    description: "Gérer les projets, catégories et mise en avant.",
    href: "/admin/projects",
    accent: "slate",
  },
  {
    title: "Médias",
    description: "Uploader images / vidéos et les lier aux projets.",
    href: "/admin/media",
    accent: "slate",
  },
  {
    title: "Vidéos (Home)",
    description:
      "Uploader des vidéos et gérer celles affichées sur la page d’accueil.",
    href: "/admin/videos",
    accent: "amber",
  },
  {
    title: "Demandes de devis",
    description: "Consulter et traiter les demandes envoyées depuis le site.",
    href: "/admin/quote-requests",
    accent: "amber",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ✅ Server Action: déconnexion depuis le dashboard admin
async function signOutAction() {
  "use server";
  const supabase = await supabaseServerAction();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export default async function AdminHomePage() {
  return (
    <section className="py-10">
      <Container>
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Administration
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Tableau de bord d’administration NSYO. Gérez les contenus du site
              en toute sécurité.
            </p>
          </div>

          {/* ✅ Bouton se déconnecter AU BON ENDROIT */}
          <form action={signOutAction} className="shrink-0">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              title="Se déconnecter de l’admin"
            >
              Se déconnecter
            </button>
          </form>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={cn(
                "group relative overflow-hidden rounded-3xl border bg-white p-6 shadow-sm",
                "transition hover:-translate-y-1 hover:shadow-lg",
                card.accent === "amber" ? "border-amber-200" : "border-slate-200"
              )}
            >
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-1",
                  card.accent === "amber" ? "bg-amber-400" : "bg-slate-900"
                )}
              />

              <div className="relative">
                <div className="text-sm font-semibold text-slate-900">
                  {card.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {card.description}
                </p>

                <div className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                  Ouvrir
                  <span
                    className="transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden
                  >
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          ⚠️ Les modifications effectuées ici impactent directement le site
          public. Vérifie les contenus avant publication.
        </div>
      </Container>
    </section>
  );
}