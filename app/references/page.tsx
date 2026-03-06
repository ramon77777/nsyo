// app/references/page.tsx
import "server-only";
import Link from "next/link";
import Container from "@/components/layout/Container";
import { getContentBlocksByPageId, blockMap, getPageBySlug } from "@/lib/data/content";

export const dynamic = "force-dynamic";

// ✅ Ton id Supabase (pages.id) pour slug="references"
const REFERENCES_PAGE_ID = "1cb6c342-ca07-4f99-88a2-04149b05efab";

function cleanText(v: unknown): string {
  return String(v ?? "").trim();
}

function getText(b: any, key: string, fallback = ""): string {
  const v = b?.[key]?.value;
  const t = cleanText(v?.text);
  return t || fallback;
}

function getRichTextLines(b: any, key: string): string[] {
  const v = b?.[key]?.value;
  const t = cleanText(v?.text);
  if (!t) return [];
  return t.split("\n").map((x) => x.trim()).filter(Boolean);
}

function getList(b: any, key: string): string[] {
  const items = b?.[key]?.value?.items;
  if (!Array.isArray(items)) return [];
  return items.map((x: any) => cleanText(x)).filter(Boolean);
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function renderLineWithLinks(line: string) {
  const raw = cleanText(line);
  if (!raw) return null;

  // Permet: "[nyso@outlook.com](mailto:nyso@outlook.com) / angaboly@gmail.com"
  const parts = raw.split("/").map((p) => p.trim()).filter(Boolean);

  return (
    <span className="whitespace-pre-line">
      {parts.map((p, idx) => {
        const md = p.match(/^\[(.+?)\]\(mailto:(.+?)\)$/i);
        if (md) {
          const label = cleanText(md[1]);
          const email = cleanText(md[2]);
          return (
            <span key={`${p}-${idx}`}>
              <a className="font-semibold text-slate-950 hover:underline" href={`mailto:${email}`}>
                {label || email}
              </a>
              {idx < parts.length - 1 ? " / " : ""}
            </span>
          );
        }

        if (isEmail(p)) {
          return (
            <span key={`${p}-${idx}`}>
              <a className="font-semibold text-slate-950 hover:underline" href={`mailto:${p}`}>
                {p}
              </a>
              {idx < parts.length - 1 ? " / " : ""}
            </span>
          );
        }

        return (
          <span key={`${p}-${idx}`}>
            {p}
            {idx < parts.length - 1 ? " / " : ""}
          </span>
        );
      })}
    </span>
  );
}

const DEFAULT_ITEMS: string[] = [
  "NSYO Sarl au Capital de 2 000 000 Frs CFA",
  "N° RCCM N° CI-ABJ-2020-B-07061",
  "N° NCC 2023030 K",
  "Siège Social Adjamé 220 Lgts",
  "N° CNPS : 365673",
  "Gérant : M. KONAN Angaboly Pascal, DUT Génie Mécanique,\nChef de projet en ingénierie Industrielle ; 17 ans d’expériences professionnelles",
  "GSM (+225) 07 08 08 83 63 / (+225) 05 05 14 20 20 / WhatsApp (+225) 05 55 67 47 00",
  "[nyso@outlook.com](mailto:nyso@outlook.com) / angaboly@gmail.com",
  "21 B.P. 3461 ABIDJAN 21",
];

export default async function ReferencesPage() {
  const page = await getPageBySlug("references");
  const pageId = page?.id ?? REFERENCES_PAGE_ID;

  const blocks = await getContentBlocksByPageId(pageId);
  const b = blockMap(blocks);

  const kicker = getText(b, "references.hero.kicker", "NSYO Ingénierie");
  const title = getText(b, "references.hero.title", "Références");
  const subtitle = getText(
    b,
    "references.hero.subtitle",
    "Informations légales et contacts de l’entreprise."
  );

  const itemsFromList = getList(b, "references.items");
  const itemsFromRich = getRichTextLines(b, "references.body");

  const items =
    itemsFromList.length > 0
      ? itemsFromList
      : itemsFromRich.length > 0
        ? itemsFromRich
        : DEFAULT_ITEMS;

  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <section className="bg-slate-950 text-white border-b border-white/10">
        <Container>
          <div className="py-12 md:py-16">
            <div className="text-white/70 text-sm">{kicker}</div>
            <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-4 max-w-2xl text-white/75 leading-relaxed">{subtitle}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex rounded-2xl border border-white/10 bg-white/3 px-5 py-3 text-sm font-semibold hover:bg-white/6"
              >
                ← Retour à l’accueil
              </Link>

              <Link
                href="/contact"
                className="inline-flex rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black hover:opacity-95"
              >
                Demander un devis
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* CONTENT */}
      <section className="py-12">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-start">
            {/* Liste */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg md:text-xl font-semibold text-slate-900">Informations</h2>
              </div>

              <div className="mt-6 space-y-3">
                {items.map((line, idx) => (
                  <div
                    key={`${idx}-${line}`}
                    className="flex gap-3 text-sm md:text-[15px] text-slate-700"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <div className="leading-relaxed">{renderLineWithLinks(line)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Encadré */}
            <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-8">
              <h3 className="text-lg font-semibold text-slate-900">Besoin d’un devis ?</h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Décrivez votre besoin. Nous vous proposerons une solution et un planning.
              </p>

              <Link
                href="/contact"
                className="mt-5 inline-flex w-full justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Contacter NSYO
              </Link>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}