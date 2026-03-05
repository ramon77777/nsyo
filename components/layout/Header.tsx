import Link from "next/link";
import Container from "./Container";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-white/10">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="font-semibold tracking-wide text-white">
            <span className="text-white">NSYO</span>{" "}
            <span className="text-amber-400">Ingénierie</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
            <Link className="hover:text-white" href="/">Accueil</Link>
            <Link className="hover:text-white" href="/presentation">Présentation</Link>
            <Link className="hover:text-white" href="/notre-equipe">Notre équipe</Link>
            <Link className="hover:text-white" href="/nos-services">Nos services</Link>
            <Link className="hover:text-white" href="/references">Références</Link>
            <Link className="hover:text-white" href="/contact">Contact</Link>
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
