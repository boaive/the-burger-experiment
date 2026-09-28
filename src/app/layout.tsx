// First import, before any component module: CSS order follows import order.
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Caprasimo, DM_Mono, Schibsted_Grotesk } from "next/font/google";
import { BoaiveCTA } from "@/components/layout/BoaiveCTA";
import { InlineScript } from "@/components/InlineScript";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { site } from "@/content/site";

const caprasimo = Caprasimo({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-caprasimo",
  display: "swap",
});

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.thesis}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.studio }],
  creator: site.studio,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    url: "/",
    title: `${site.name} — ${site.thesis}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.thesis}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#f2e9da",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Runs before first paint: marks JS availability and the motion preference for CSS. */
const bootScript = `(function(){var d=document.documentElement;d.classList.add('js');try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('reduced-motion')}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${caprasimo.variable} ${schibsted.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body>
        <InlineScript html={bootScript} />
        <SkipLink />
        <SiteHeader />
        {children}
        <BoaiveCTA />
        <SiteFooter />
        <RevealObserver />
      </body>
    </html>
  );
}
