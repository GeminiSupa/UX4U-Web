import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { CookieConsent } from "@/components/CookieConsent";
import { JsonLd } from "@/components/JsonLd";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { WhatsAppFab } from "@/components/WhatsAppButton";
import {
  COMPANY_CITY,
  COMPANY_COUNTRY,
  COMPANY_EMAIL,
  SITE_NAME,
  SITE_URL,
  SOCIAL_PROFILES,
  WHATSAPP
} from "@/lib/site";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif"
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UX4U | Software and Growth Studio in Islamabad",
    template: "%s | UX4U"
  },
  description:
    "UX4U is an Islamabad studio that builds your product and website, then runs the search, ads and automations that bring in customers.",
  keywords: [
    "UX4U",
    "web development Islamabad",
    "product software Pakistan",
    "SEO Islamabad",
    "lead generation agency",
    "Meta ads Pakistan",
    "business automation",
    "growth studio"
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: "UX4U | Software and Growth Studio in Islamabad",
    description:
      "From a concept to a business that runs. Product software, web development, SEO, lead generation and automation from Islamabad.",
    url: SITE_URL
  },
  twitter: {
    card: "summary_large_image",
    title: "UX4U | Software and Growth Studio in Islamabad",
    description:
      "Product software, web development, SEO, lead generation and automation from Islamabad."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
  },
  alternates: { canonical: "/" }
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "UX4U",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: COMPANY_EMAIL,
  ...(WHATSAPP ? { telephone: `+${WHATSAPP.replace(/\D/g, "")}` } : {}),
  address: {
    "@type": "PostalAddress",
    addressLocality: COMPANY_CITY,
    addressCountry: "PK",
    addressRegion: COMPANY_COUNTRY
  },
  ...(SOCIAL_PROFILES.length ? { sameAs: SOCIAL_PROFILES } : {})
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "UX4U",
  url: SITE_URL
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} font-sans antialiased`}>
        <JsonLd data={organization} />
        <JsonLd data={website} />
        {children}
        <WhatsAppFab />
        <CookieConsent />
        <SiteAnalytics />
      </body>
    </html>
  );
}
