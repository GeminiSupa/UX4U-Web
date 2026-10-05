import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { indexedServices } from "@/lib/services";

// Only list URLs that return 200 and are meant to be indexed.
// Case-study slugs are added when challenge or result exists (T17).
const paths = [
  "/",
  "/work",
  "/blog",
  "/contact",
  "/services",
  "/blog/launch-is-the-start",
  "/blog/what-a-lead-list-is-for",
  "/blog/concept-is-not-a-business",
  ...indexedServices().map((service) => `/services/${service.slug}`)
];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`
  }));
}
