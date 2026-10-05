import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { pageMeta } from "@/lib/seo";
import { indexedServices } from "@/lib/services";

export const metadata = pageMeta({
  title: "Services",
  description:
    "Product development, web development, SEO, lead generation, Meta ads and business automation from one studio in Islamabad.",
  path: "/services"
});

export default function ServicesPage() {
  const live = indexedServices();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
        <p className="text-xs uppercase tracking-[0.22em] text-moss">Services</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">What we take on.</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink/75">
          Product development, web development, SEO, Meta ads and the operating work around them — from one desk in
          Islamabad.
        </p>
        <div className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
          {live.map((service) => (
            <Link key={service.slug} href={`/services/${service.slug}`} className="block py-6">
              <h2 className="font-serif text-2xl sm:text-3xl">{service.h1}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{service.intro}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
