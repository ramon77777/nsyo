import Container from "@/components/layout/Container";
import { getPageBySlug, getContentBlocksByPageId, blockMap } from "@/lib/data/content";

export default async function HomePage() {
  const page = await getPageBySlug("home");
  if (!page) return <div className="p-10">Page introuvable.</div>;

  const blocks = await getContentBlocksByPageId(page.id);
  const b = blockMap(blocks);

  const title = b["home.hero.title"]?.value?.text ?? "NSYO";
  const subtitle = b["home.hero.subtitle"]?.value?.text ?? "";
  const aboutTitle = b["home.about.title"]?.value?.text ?? "";
  const aboutText = b["home.about.text"]?.value?.text ?? "";

  return (
    <>
      <section className="relative bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,white,transparent_60%)]" />
        <Container>
          <div className="relative py-20">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-white/80 text-base md:text-lg">
              {subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#poles"
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:opacity-90"
              >
                Découvrir nos pôles
              </a>
              <a
                href="/contact"
                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Demander un devis
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="grid gap-10 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{aboutTitle}</h2>
              <p className="mt-4 text-slate-600 leading-relaxed">{aboutText}</p>
              <a
                href="/presentation"
                className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                En savoir plus
              </a>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
              <div className="text-sm font-semibold text-slate-900">Nos Pôles d’Activités</div>
              <p className="mt-2 text-sm text-slate-600">
                Projets industriels • Construction urbaine • Location d’engins
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
