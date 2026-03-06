// app/presentation/page.tsx
import "server-only";
import Container from "@/components/layout/Container";
import { getPageBySlug, getContentBlocksByPageId, blockMap } from "@/lib/data/content";

export const dynamic = "force-dynamic";

type AnyBlock = {
  key: string;
  type: "text" | "richtext" | "list" | "json";
  value: any;
  order_index: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function readText(m: Record<string, AnyBlock>, key: string, fallback = ""): string {
  const b = m[key];
  if (!b) return fallback;

  const v = b.value;
  if (typeof v === "string") return v;
  if (v && typeof v.text === "string") return v.text;
  if (v && typeof v.content === "string") return v.content;

  return fallback;
}

function readList(m: Record<string, AnyBlock>, key: string, fallback: string[] = []): string[] {
  const b = m[key];
  if (!b) return fallback;

  const v = b.value;

  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (v && Array.isArray(v.items)) return v.items.map((x: any) => String(x ?? "").trim()).filter(Boolean);
  if (typeof v === "string") {
    // support simple "line1\nline2"
    return v
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return fallback;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">{children}</h2>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-line">{children}</p>;
}

function List({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-4 grid gap-2">
      {items.map((it, idx) => (
        <li key={`${idx}-${it}`} className="flex items-start gap-2 text-slate-700">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
          <span className="leading-relaxed">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default async function PresentationPage() {
  // slug "presentation" dans table pages
  const page = await getPageBySlug("presentation");
  if (!page) {
    return (
      <section className="py-16">
        <Container>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-700">
            La page <span className="font-mono">presentation</span> n’existe pas encore dans la table{" "}
            <span className="font-mono">pages</span>.
          </div>
        </Container>
      </section>
    );
  }

  const blocks = await getContentBlocksByPageId(page.id);
  const b = blockMap(blocks) as Record<string, AnyBlock>;

  const heroTitle = readText(b, "presentation.hero.title", "Présentation");
  const heroSubtitle = readText(
    b,
    "presentation.hero.subtitle",
    "Présentation générale de NSYO."
  );

  const intro = readText(b, "presentation.intro");
  const polesIntro = readText(b, "presentation.poles.intro");
  const poles = readList(b, "presentation.poles.list");

  const savoirFaire = readText(b, "presentation.savoirfaire");
  const equipesIntro = readText(b, "presentation.equipes.intro");
  const equipes = readList(b, "presentation.equipes.list");

  const objectif = readText(b, "presentation.objectif");
  const competencesIntro = readText(b, "presentation.competences.intro");
  const competences = readList(b, "presentation.competences.list");

  const positionnement = readText(b, "presentation.positionnement");

  // bloc “références légales” (dans présentation, puisque /references sert déjà aux réalisations)
  const legalTitle = readText(b, "presentation.legal.title", "Références");
  const legalItems = readList(b, "presentation.legal.list");

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,white,transparent_55%)]" />
        <Container>
          <div className="relative py-16 md:py-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              NSYO Ingénierie
            </div>

            <h1 className="mt-6 text-3xl md:text-5xl font-bold tracking-tight">{heroTitle}</h1>
            <p className="mt-4 max-w-3xl text-white/80 leading-relaxed whitespace-pre-line">{heroSubtitle}</p>
          </div>
        </Container>
      </section>

      {/* CONTENT */}
      <section className="py-16 bg-white">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-start">
            <div className="space-y-10">
              <div>
                <SectionTitle>Présentation générale</SectionTitle>
                {intro ? <Paragraph>{intro}</Paragraph> : null}
              </div>

              <div>
                <SectionTitle>Nos pôles d’activités</SectionTitle>
                {polesIntro ? <Paragraph>{polesIntro}</Paragraph> : null}
                <List items={poles} />
              </div>

              <div>
                <SectionTitle>Notre savoir-faire</SectionTitle>
                {savoirFaire ? <Paragraph>{savoirFaire}</Paragraph> : null}
              </div>

              <div>
                <SectionTitle>Nos équipes & services</SectionTitle>
                {equipesIntro ? <Paragraph>{equipesIntro}</Paragraph> : null}
                <List items={equipes} />
              </div>

              <div>
                <SectionTitle>Objectif</SectionTitle>
                {objectif ? <Paragraph>{objectif}</Paragraph> : null}
              </div>

              <div>
                <SectionTitle>Nos principales compétences</SectionTitle>
                {competencesIntro ? <Paragraph>{competencesIntro}</Paragraph> : null}
                <List items={competences} />
              </div>

              <div>
                <SectionTitle>Positionnement</SectionTitle>
                {positionnement ? <Paragraph>{positionnement}</Paragraph> : null}
              </div>
            </div>

            <div className="space-y-6">
              <Card title="Contacts">
                <div className="text-sm text-slate-600 leading-relaxed">
                  Besoin d’un devis ou d’informations ?
                </div>
                <a
                  href="/contact"
                  className="mt-4 inline-flex w-full justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:opacity-90"
                >
                  Demander un devis
                </a>
              </Card>

              <Card title={legalTitle}>
                {legalItems.length ? (
                  <ul className="text-sm text-slate-700 leading-relaxed space-y-2">
                    {legalItems.map((it, idx) => (
                      <li key={`${idx}-${it}`} className="whitespace-pre-line">
                        {it}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-600">Contenu à renseigner dans Supabase.</div>
                )}
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}