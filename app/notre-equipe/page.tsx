// app/notre-equipe/page.tsx
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

function readText(m: Record<string, AnyBlock>, key: string, fallback = ""): string {
  const b = m[key];
  if (!b) return fallback;
  const v = b.value;
  if (typeof v === "string") return v;
  if (v && typeof v.text === "string") return v.text;
  return fallback;
}

function readList(m: Record<string, AnyBlock>, key: string, fallback: string[] = []): string[] {
  const b = m[key];
  if (!b) return fallback;
  const v = b.value;
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (v && Array.isArray(v.items)) return v.items.map((x: any) => String(x ?? "").trim()).filter(Boolean);
  if (typeof v === "string") return v.split("\n").map((x) => x.trim()).filter(Boolean);
  return fallback;
}

export default async function NotreEquipePage() {
  const page = await getPageBySlug("notre-equipe");
  if (!page) {
    return (
      <section className="py-16">
        <Container>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-700">
            La page <span className="font-mono">notre-equipe</span> n’existe pas encore dans{" "}
            <span className="font-mono">pages</span>.
          </div>
        </Container>
      </section>
    );
  }

  const blocks = await getContentBlocksByPageId(page.id);
  const b = blockMap(blocks) as Record<string, AnyBlock>;

  const title = readText(b, "team.title", "Notre équipe");
  const intro = readText(b, "team.intro", "");
  const roles = readList(b, "team.list", []);

  return (
    <section className="py-16 bg-white">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{title}</h1>
            {intro ? <p className="mt-2 text-slate-600 whitespace-pre-line">{intro}</p> : null}
          </div>

          <a
            href="/contact"
            className="hidden sm:inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Demander un devis
          </a>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {roles.length ? (
            roles.map((r, idx) => (
              <div key={`${idx}-${r}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-700 font-bold">
                    ✓
                  </span>
                  <div className="text-slate-900 font-semibold leading-relaxed whitespace-pre-line">{r}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-600 md:col-span-2">
              Contenu à renseigner dans Supabase.
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}