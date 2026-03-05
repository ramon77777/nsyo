import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSiteSettings } from "@/lib/data/settings";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-slate-900">
        <Header />
        <main>{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
