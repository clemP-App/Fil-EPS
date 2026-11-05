import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Footer, Header } from "@/components/SiteChrome";
import { SITE_NAME, siteUrl } from "@/lib/constants";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-source" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — Journal des publications académiques`,
    template: `%s — ${SITE_NAME}`,
  },
  description: "Journal numérique des publications d'éducation physique et sportive repérées sur les sites académiques français.",
  applicationName: SITE_NAME,
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
  openGraph: {
    locale: "fr_FR",
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "Les publications académiques d'EPS, rassemblées sans être recopiées.",
  },
  robots: { index: true, follow: true },
};

const themeScript = `try{var t=localStorage.getItem("veille-eps-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={sans.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <a className="skip-link" href="#contenu">Aller au contenu</a>
        <Header />
        <main id="contenu">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
