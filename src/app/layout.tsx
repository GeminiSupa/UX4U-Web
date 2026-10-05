import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL, SOCIAL_PROFILES } from "@/lib/site";
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
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "UX4U | Software and Growth Studio in Islamabad",
    description:
      "From a concept to a business that runs. Product software, web development, SEO, lead generation and automation from Islamabad."
  },
  twitter: { card: "summary_large_image" }
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "UX4U",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: "info@ux4u.online",
  address: { "@type": "PostalAddress", addressLocality: "Islamabad", addressCountry: "PK" },
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
      </body>
    </html>
  );
}
