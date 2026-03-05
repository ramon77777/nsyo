import Container from "./Container";

export default function Footer({ settings }: { settings: Record<string, any> }) {
  const emails = settings["contact.emails"]?.items ?? [];
  const phones = settings["contact.phones"]?.items ?? [];
  const whatsapp = settings["contact.whatsapp"]?.text ?? "";
  const address = settings["contact.address"] ?? {};
  const hours = settings["contact.hours"] ?? {};

  return (
    <footer className="bg-slate-950 text-white/80 border-t border-white/10">
      <Container>
        <div className="py-10 grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-white font-semibold">NSYO</div>
            <p className="mt-2 text-sm">
              Solutions professionnelles pour vos projets industriels, urbains et immobiliers.
            </p>
            <div className="mt-4 space-y-1 text-sm">
              {emails.map((e: string) => <div key={e}>{e}</div>)}
              {phones.map((p: string) => <div key={p}>{p}</div>)}
              {whatsapp ? <div>WhatsApp : {whatsapp}</div> : null}
            </div>
          </div>

          <div>
            <div className="text-white font-semibold">Adresse</div>
            <div className="mt-2 text-sm space-y-1">
              <div>{address.line1}</div>
              <div>{address.line2}</div>
              <div>{address.city} — {address.country}</div>
            </div>
            <div className="mt-4 text-sm space-y-1">
              <div className="text-white font-semibold">Horaires</div>
              <div>{hours.weekdays}</div>
              <div>{hours.saturday}</div>
              <div>{hours.sunday}</div>
            </div>
          </div>

          <div>
            <div className="text-white font-semibold">CTA</div>
            <p className="mt-2 text-sm">{settings["cta.primary"]?.text}</p>
            <div className="mt-4 text-xs text-white/50">
              © {new Date().getFullYear()} NSYO. Tous droits réservés.
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
