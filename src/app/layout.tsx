import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
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
  metadataBase: new URL("https://ux4u.online"),
  title: {
    default: "UX4U — From concept to a business that runs",
    template: "%s — UX4U"
  },
  description:
    "UX4U builds the product, the site, the search, the ads, and the automations. Software development, SEO, lead generation, and marketing.",
  openGraph: {
    title: "UX4U",
    description: "From a concept to a business that is actually running.",
    url: "https://ux4u.online",
    siteName: "UX4U",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
