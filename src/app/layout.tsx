import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import JsonLd from "@/components/json-ld";
import GoogleTagManager from "@/components/google-tag-manager";
import CookieConsent from "@/components/cookie-consent";
import { siteConfig, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // metadataBase makes every relative canonical/OG URL absolute (required for
  // correct og:url, og:image, and <link rel="canonical">).
  metadataBase: siteUrl,
  title: {
    default: `${siteConfig.name} — Ship marketing pages fast`,
    template: "%s", // child pages set their own full titles
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  // Site-wide Open Graph + Twitter defaults; pages override per-route. The OG
  // image is supplied automatically by app/opengraph-image.tsx.
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    url: siteConfig.url,
    title: `${siteConfig.name} — Ship marketing pages fast`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitter,
    title: `${siteConfig.name} — Ship marketing pages fast`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* No-flash theme script: runs before first paint so the page never
            flickers light→dark. Honors a saved choice, else the system setting. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Skip link (WCAG 2.4.1): hidden until focused, lets keyboard users jump
            past the nav straight to the page content. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        {/* Site-wide Organization structured data (helps Google's knowledge panel). */}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteConfig.name,
            url: siteConfig.url,
            description: siteConfig.description,
          }}
        />
        {children}
        <Toaster />

        {/* Day 12: GTM is consent-gated (loads only after Accept) and non-blocking
            via next/script (Day 9). The banner collects the GDPR/CCPA decision. */}
        <GoogleTagManager />
        <CookieConsent />
      </body>
    </html>
  );
}
