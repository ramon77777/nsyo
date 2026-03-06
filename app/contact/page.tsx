// app/contact/page.tsx
import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/layout/Container";
import { getPageBySlug, getContentBlocksByPageId, blockMap } from "@/lib/data/content";
import { supabaseServerAction } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TextValue = { text?: string };
type ListValue =
  | { items?: Array<string | { text?: string; label?: string; value?: string }> }
  | { items?: never };

function asText(v: unknown, fallback = ""): string {
  const t = (v as TextValue | null | undefined)?.text;
  return typeof t === "string" ? t : fallback;
}

function asList(v: unknown): Array<any> {
  const items = (v as ListValue | null | undefined)?.items;
  return Array.isArray(items) ? items : [];
}

function normalizeTel(input: string): string {
  // tel: n'aime pas trop les espaces/parenthèses
  return String(input ?? "").replace(/\s+/g, "").replace(/[()]/g, "");
}

function listTexts(items: any[]): string[] {
  // accepte: ["a", "b"] ou [{text:"..."}, ...] ou [{label,value}, ...]
  return items
    .map((it) => {
      if (typeof it === "string") return it.trim();
      if (it && typeof it === "object") {
        if (typeof it.text === "string") return it.text.trim();
        if (typeof it.value === "string") return it.value.trim();
      }
      return "";
    })
    .filter(Boolean);
}

function listPairs(items: any[]): Array<{ label: string; value: string }> {
  // accepte: [{label,value}, ...] ou [{text:".."}] => label vide
  return items
    .map((it) => {
      if (!it || typeof it !== "object") return null;
      const label = typeof it.label === "string" ? it.label.trim() : "";
      const value =
        typeof it.value === "string"
          ? it.value.trim()
          : typeof it.text === "string"
          ? it.text.trim()
          : "";
      if (!value) return null;
      return { label, value };
    })
    .filter(Boolean) as Array<{ label: string; value: string }>;
}

function encodeWhatsAppNumber(raw: string): string {
  // wa.me attend un numéro au format international sans +, sans espaces
  // ex: "+225 55 67 47 00" => "22555674700"
  return String(raw ?? "").replace(/[^\d]/g, "");
}

function buildMailto(to: string, subject: string, body: string): string {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return `mailto:${to}?subject=${s}&body=${b}`;
}

function buildWhatsAppHref(numberIntlNoPlus: string, message: string): string {
  const msg = encodeURIComponent(message);
  return `https://wa.me/${numberIntlNoPlus}?text=${msg}`;
}

function cleanText(v: unknown): string {
  return String(v ?? "").trim();
}

function safeStr(v: FormDataEntryValue | null): string {
  return cleanText(typeof v === "string" ? v : "");
}

/**
 * ✅ Server Action: enregistre une demande de devis dans Supabase.
 * Table attendue: quote_requests
 * Colonnes minimales recommandées:
 * - id uuid default gen_random_uuid()
 * - created_at timestamptz default now()
 * - name text
 * - email text
 * - phone text
 * - message text
 * - source text (ex: "contact")
 */
async function createQuoteRequestAction(formData: FormData): Promise<void> {
  "use server";

  const name = safeStr(formData.get("name"));
  const email = safeStr(formData.get("email"));
  const phone = safeStr(formData.get("phone"));
  const message = safeStr(formData.get("message"));

  if (!name || !message) {
    const msg = encodeURIComponent("Merci de renseigner au minimum votre nom et votre besoin.");
    redirect(`/contact?error=${msg}#demande`);
  }

  const supabase = await supabaseServerAction();

  const { error } = await supabase.from("quote_requests").insert({
    name,
    email,
    phone,
    message,
    source: "contact",
  });

  if (error) {
    const msg = encodeURIComponent(`Erreur Supabase: ${error.message}`);
    redirect(`/contact?error=${msg}#demande`);
  }

  redirect(`/contact?sent=1#demande`);
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const sent = sp.sent === "1";
  const errorMsg = cleanText(sp.error);

  // 1) Page "contact"
  const page = await getPageBySlug("contact");
  if (!page) {
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-4xl p-10">Page introuvable.</div>
      </main>
    );
  }

  // 2) Blocks -> map
  const blocks = await getContentBlocksByPageId(page.id);
  const b = blockMap(blocks);

  // HERO
  const kicker = asText(b["contact.hero.kicker"]?.value, "NSYO Ingénierie");
  const title = asText(b["contact.hero.title"]?.value, "Contact");
  const subtitle = asText(
    b["contact.hero.subtitle"]?.value,
    "Dites-nous ce dont vous avez besoin. Nous reviendrons vers vous rapidement."
  );

  // CTA
  const ctaPrimaryLabel = asText(b["contact.cta.primary.label"]?.value, "Envoyer un email");
  const ctaPrimaryHref = asText(b["contact.cta.primary.href"]?.value, "");
  const ctaSecondaryLabel = asText(b["contact.cta.secondary.label"]?.value, "← Retour à l’accueil");
  const ctaSecondaryHref = asText(b["contact.cta.secondary.href"]?.value, "/");

  // COORDONNÉES
  const coordsTitle = asText(b["contact.coords.title"]?.value, "Coordonnées");
  const emailPairs = listPairs(asList(b["contact.coords.emails"]?.value));
  const phonePairs = listPairs(asList(b["contact.coords.phones"]?.value));

  // Adresse / Horaires
  const addressTitle = asText(b["contact.address.title"]?.value, "Adresse");
  const addressLines = listTexts(asList(b["contact.address.lines"]?.value));

  const hoursTitle = asText(b["contact.hours.title"]?.value, "Horaires");
  const hoursLines = listTexts(asList(b["contact.hours.lines"]?.value));

  // Devis (card)
  const quoteTitle = asText(b["contact.quote.title"]?.value, "Devis");
  const quoteText = asText(
    b["contact.quote.text"]?.value,
    "Décrivez votre besoin (pôle, localisation, délais). Nous vous proposerons une solution et un planning."
  );
  const quoteBtnLabel = asText(b["contact.quote.button.label"]?.value, "Démarrer une demande");

  // ✅ Par défaut: scroll vers le formulaire (fonctionnel)
  const quoteBtnHref = asText(b["contact.quote.button.href"]?.value, "#demande");

  // Form (optionnel via CMS)
  const formTitle = asText(b["contact.form.title"]?.value, "Démarrer une demande");
  const formSubtitle = asText(
    b["contact.form.subtitle"]?.value,
    "Donnez-nous les infos principales. Vous pouvez aussi envoyer le message par email ou WhatsApp."
  );

  // Email / WhatsApp (pour les 3 options)
  const primaryIsExternal = /^https?:\/\//i.test(ctaPrimaryHref) || /^mailto:/i.test(ctaPrimaryHref);

  const defaultEmailTo = emailPairs?.[0]?.value ?? "";
  const whatsappRaw = asText(b["contact.coords.whatsapp"]?.value, ""); // (optionnel si tu veux stocker whatsapp séparément)
  const whatsappFromPhones =
    phonePairs.find((p) => /whats/i.test(p.label))?.value ?? ""; // si label contient WhatsApp
  const whatsappNumber = encodeWhatsAppNumber(whatsappRaw || whatsappFromPhones);

  // Message pré-rempli (pour email/whatsapp)
  const preSubject = "Demande de devis — NSYO";
  const preBody = `Bonjour NSYO,

Je souhaite démarrer une demande de devis.

Nom:
Téléphone:
Email:
Besoin (pôle, localisation, délais):

Merci.`;

  const mailtoHref = defaultEmailTo ? buildMailto(defaultEmailTo, preSubject, preBody) : "";
  const waHref = whatsappNumber ? buildWhatsAppHref(whatsappNumber, preBody) : "";

  return (
    <main className="bg-white">
      <section className="bg-slate-950 text-white border-b border-white/10">
        <Container>
          <div className="py-12 md:py-16">
            <div className="text-white/70 text-sm">{kicker}</div>
            <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-4 max-w-2xl text-white/75 leading-relaxed">{subtitle}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={ctaSecondaryHref || "/"}
                className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
              >
                {ctaSecondaryLabel}
              </Link>

              {ctaPrimaryHref ? (
                primaryIsExternal ? (
                  <a
                    href={ctaPrimaryHref}
                    className="inline-flex rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black hover:opacity-95"
                  >
                    {ctaPrimaryLabel}
                  </a>
                ) : (
                  <Link
                    href={ctaPrimaryHref}
                    className="inline-flex rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black hover:opacity-95"
                  >
                    {ctaPrimaryLabel}
                  </Link>
                )
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* COORDONNÉES */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">{coordsTitle}</h2>

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {emailPairs.length ? (
                  emailPairs.map((e, idx) => {
                    const label = e.label || "Email";
                    return (
                      <div key={`${e.value}-${idx}`}>
                        {label} :{" "}
                        <a
                          className="font-semibold text-slate-900 hover:underline"
                          href={`mailto:${e.value}`}
                        >
                          {e.value}
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <div>—</div>
                )}

                {phonePairs.map((p, idx) => {
                  const label = p.label || "Tél";
                  const tel = normalizeTel(p.value);
                  const href = tel ? `tel:${tel}` : "#";
                  return (
                    <div key={`${p.value}-${idx}`}>
                      {label} :{" "}
                      {tel ? (
                        <a className="font-semibold text-slate-900 hover:underline" href={href}>
                          {p.value}
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-900">{p.value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ADRESSE + HORAIRES */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">{addressTitle}</h2>

              <div className="mt-4 space-y-1 text-sm text-slate-700">
                {addressLines.length ? (
                  addressLines.map((line, i) => <div key={i}>{line}</div>)
                ) : (
                  <div>—</div>
                )}
              </div>

              <h3 className="mt-6 text-sm font-semibold text-slate-900">{hoursTitle}</h3>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                {hoursLines.length ? (
                  hoursLines.map((line, i) => <div key={i}>{line}</div>)
                ) : (
                  <div>—</div>
                )}
              </div>
            </div>

            {/* DEVIS */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-semibold text-slate-900">{quoteTitle}</h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{quoteText}</p>

              <Link
                href={quoteBtnHref || "#demande"}
                className="mt-5 inline-flex w-full justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                {quoteBtnLabel}
              </Link>

              <div className="mt-4 grid gap-2">
                {mailtoHref ? (
                  <a
                    href={mailtoHref}
                    className="inline-flex w-full justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Envoyer par email
                  </a>
                ) : (
                  <div className="text-xs text-slate-500">
                    (Email non configuré — ajoute au moins un email dans{" "}
                    <span className="font-mono">contact.coords.emails</span>)
                  </div>
                )}

                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Envoyer via WhatsApp
                  </a>
                ) : (
                  <div className="text-xs text-slate-500">
                    (WhatsApp non configuré — mets un numéro dans{" "}
                    <span className="font-mono">contact.coords.whatsapp</span> ou un téléphone avec label
                    “WhatsApp”)
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ✅ Formulaire “Démarrer une demande” (Option 1: enregistrement Supabase) */}
      <section id="demande" className="pb-16">
        <Container>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{formTitle}</h2>
                <p className="mt-2 text-sm text-slate-600">{formSubtitle}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {mailtoHref ? (
                  <a
                    href={mailtoHref}
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Email
                  </a>
                ) : null}
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>

            {errorMsg ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {errorMsg}
              </div>
            ) : null}

            {sent ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Demande enregistrée ✅ Nous vous recontactons rapidement.
              </div>
            ) : null}

            <form action={createQuoteRequestAction} className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="text-sm font-semibold text-slate-800">Nom *</label>
                <input
                  name="name"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Votre nom"
                />
              </div>

              <div className="md:col-span-1">
                <label className="text-sm font-semibold text-slate-800">Téléphone</label>
                <input
                  name="phone"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="(+225) ..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">Email</label>
                <input
                  name="email"
                  type="email"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="vous@email.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-800">Votre besoin *</label>
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="BTP, location d'engins, projets insdustriels…"
                />
                
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-2xl bg-amber-400 px-6 py-3 text-sm font-semibold text-black hover:opacity-95"
                >
                  Envoyer la demande
                </button>
              </div>
            </form>
          </div>
        </Container>
      </section>
    </main>
  );
}