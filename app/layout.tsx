import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSiteSettings } from "@/lib/data/settings";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col bg-white text-slate-900">
        {/* Header */}
        <Header />

        {/* Contenu principal */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <Footer settings={settings} />
      </body>
    </html>
  );
}