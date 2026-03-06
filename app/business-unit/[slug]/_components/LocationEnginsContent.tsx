// app/business-unit/[slug]/_components/LocationEnginsContent.tsx
import "server-only";
import {
  getBusinessUnitSections,
  type BusinessUnitSection,
} from "@/lib/data/business-unit-sections";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function SectionBlock({ s }: { s: BusinessUnitSection }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="bg-[#0b2a6a] px-4 py-2">
        <div className="text-center font-extrabold tracking-wide text-amber-300 uppercase">
          {s.title}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 p-4">
        <div className="min-w-0">
          {s.intro_text ? (
            <p className="mb-3 text-xs text-white/70 whitespace-pre-line">
              {s.intro_text}
            </p>
          ) : null}

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-[1fr_80px] bg-white/5 px-3 py-2 text-xs font-semibold text-white/85">
              <div>Désignation</div>
              <div className="text-right">Nbre</div>
            </div>

            <div className="divide-y divide-white/10">
              {(s.items ?? []).length === 0 ? (
                <div className="px-3 py-3 text-xs text-white/60">
                  Aucune ligne. Ajoute des engins dans l’admin.
                </div>
              ) : (
                s.items.map((it) => (
                  <div
                    key={it.id}
                    className="grid grid-cols-[1fr_80px] px-3 py-2 text-xs text-white/80"
                  >
                    <div className="truncate">{it.designation}</div>
                    <div className="text-right">{it.qty ?? "—"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            {s.image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.image.url}
                alt={s.image.title}
                className="h-48 md:h-44 lg:h-52 w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-48 md:h-44 lg:h-52 w-full flex items-center justify-center text-xs text-white/50">
                Aucune image
              </div>
            )}
          </div>

          {s.image?.title ? (
            <div className="mt-2 text-xs text-white/60 line-clamp-2">
              {s.image.title}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function normalizeKey(s: BusinessUnitSection) {
  return String(s.key ?? "").trim().toLowerCase();
}

function pickOrderedBlocks(sections: BusinessUnitSection[]) {
  const wanted = ["levage", "terrassement", "transport", "manutention"];

  const map = new Map<string, BusinessUnitSection>();
  for (const s of sections) map.set(normalizeKey(s), s);

  const picked: BusinessUnitSection[] = [];
  for (const k of wanted) {
    const found = map.get(k);
    if (found) picked.push(found);
  }

  // fallback: ajoute les autres sections restantes (au cas où)
  const remaining = sections
    .filter((s) => !wanted.includes(normalizeKey(s)))
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return [...picked, ...remaining];
}

export default async function LocationEnginsContent({
  businessUnitId,
}: {
  businessUnitId: string;
}) {
  const sections = await getBusinessUnitSections(businessUnitId);
  const blocks = pickOrderedBlocks(sections);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl md:text-2xl font-semibold">
          Location de Grues et engins de chantier
        </h2>
        <p className="mt-3 text-white/75 leading-relaxed">
          En partenariat avec les acteurs majeurs du Levage, du Terrassement, du
          Transport et de la Manutention, NSYO vous propose une gamme variée
          d’engins à des tarifs compétitifs.
        </p>
        <p className="mt-2 text-white/75 leading-relaxed">
          Les tableaux ci-dessous présentent la liste non exhaustive des engins
          de notre parc.
        </p>
      </div>

      <div className={cn("grid gap-6", "grid-cols-1 lg:grid-cols-2")}>
        {blocks.length === 0 ? (
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-white/70">
            Aucune section trouvée pour ce pôle. Crée 4 sections (levage,
            terrassement, transport, manutention) dans l’admin puis ajoute les
            lignes + images.
          </div>
        ) : (
          blocks.map((s) => <SectionBlock key={s.id} s={s} />)
        )}
      </div>
    </div>
  );
}
