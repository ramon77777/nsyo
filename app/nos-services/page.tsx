// app/nos-services/page.tsx
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

export default async function NosServicesPage() {
  const page = await getPageBySlug("nos-services");
  if (!page) {
    return (
      <section className="py-16">
        <Container>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-700">
            La page <span className="font-mono">nos-services</span> n’existe pas encore dans{" "}
            <span className="font-mono">pages</span>.
          </div>
        </Container>
      </section>
    );
  }

  const blocks = await getContentBlocksByPageId(page.id);
  const b = blockMap(blocks) as Record<string, AnyBlock>;

  const title = readText(b, "services.title", "Nos services");
  const intro = readText(b, "services.intro", "");
  const items = readList(b, "services.list", []);

  return (
    <section className="py-16 bg-slate-50">
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

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          {items.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((it, idx) => (
                <div key={`${idx}-${it}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-sm font-bold">
                    ✓
                  </span>
                  <div className="text-slate-800 leading-relaxed whitespace-pre-line">{it}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-600">Contenu à renseigner dans Supabase.</div>
          )}
        </div>
      </Container>
    </section>
  );
}