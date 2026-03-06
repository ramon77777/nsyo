// components/layout/Header.tsx
import "server-only";
import Link from "next/link";
import Container from "./Container";
import { supabaseServerReadonly } from "@/lib/supabase/server";

type NavPage = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
};

function normalizeSlug(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export const dynamic = "force-dynamic";

export default async function Header() {
  // Ordre voulu dans le Navbar (pages dynamiques venant de "pages")
  const ORDER = ["presentation", "notre-equipe", "nos-services", "references", "contact"] as const;
  const orderIndex = new Map<string, number>(ORDER.map((s, i) => [s, i]));

  // Lien “Business Unit” (pointe vers la section Pôles d’activités sur la home)
  const businessUnitLink = { href: "/#poles", label: "Business Unit" };

  // Fallback statique
  const fallbackLinks: Array<{ href: string; label: string }> = [
    { href: "/", label: "Accueil" },
    businessUnitLink,
    { href: "/presentation", label: "Présentation" },
    { href: "/notre-equipe", label: "Notre équipe" },
    { href: "/nos-services", label: "Nos services" },
    { href: "/references", label: "Références" },
    { href: "/contact", label: "Contact" },
  ];

  let links = fallbackLinks;

  try {
    const supabase = await supabaseServerReadonly();

    const { data, error } = await supabase
      .from("pages")
      .select("id,slug,title,is_published")
      .eq("is_published", true)
      .in("slug", [...ORDER]);

    if (!error && Array.isArray(data)) {
      const pages = (data as NavPage[])
        .map((p) => ({
          slug: normalizeSlug(p.slug),
          title: String(p.title ?? "").trim(),
        }))
        .filter((p) => p.slug && p.title && orderIndex.has(p.slug))
        .sort((a, b) => (orderIndex.get(a.slug) ?? 999) - (orderIndex.get(b.slug) ?? 999));

      links = [
        { href: "/", label: "Accueil" },
        businessUnitLink,
        ...pages.map((p) => ({ href: `/${p.slug}`, label: p.title })),
      ];
    }
  } catch {
    // on garde le fallback
  }

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-white/10">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="font-semibold tracking-wide text-white">
            <span className="text-white">NSYO</span>{" "}
            <span className="text-amber-400">Ingénierie</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
            {links.map((l) => (
              <Link key={l.href} className="hover:text-white" href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/contact"
            className="inline-flex items-center rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:opacity-90"
          >
            Demander un devis
          </Link>
        </div>
      </Container>
    </header>
  );
}