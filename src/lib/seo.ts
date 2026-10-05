import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  noindex?: boolean;
};

export function pageMeta({
  title,
  description,
  path,
  type = "website",
  noindex
}: PageMetaInput): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title, // layout title.template appends " | UX4U"
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE_NAME, title: fullTitle, description, url: path },
    twitter: { card: "summary_large_image", title: fullTitle, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {})
  };
}
