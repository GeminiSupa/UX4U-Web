import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SiteChrome } from "@/components/SiteChrome";
import { TiltCard } from "@/components/TiltCard";
import { pageMeta } from "@/lib/seo";
import { indexedServices } from "@/lib/services";
import { card, cardBody, cardPad, cardTitle } from "@/lib/ui";

export const metadata = pageMeta({
  title: "Services: Product, Web, SEO, Ads & Automation",
  description:
    "Product development, web development, SEO, lead generation, Meta ads and business automation from one studio in Islamabad.",
  path: "/services"
});

export default function ServicesPage() {
  const live = indexedServices();

  return (
    <SiteChrome>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-14">
        <p className="text-xs uppercase tracking-[0.22em] text-moss">Services</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">What we take on.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/75">
          Product development, web development, SEO, Meta ads and the operating work around them — from one desk in
          Islamabad.
        </p>
        <div className="mt-10 grid auto-rows-fr gap-5 md:grid-cols-2">
          {live.map((service, index) => (
            <Reveal key={service.slug} delay={index * 70} className="h-full">
              <TiltCard as="a" href={`/services/${service.slug}`} className={`${card} min-h-[12rem]`}>
                <div className={cardPad}>
                  <h2 className={cardTitle}>{service.h1}</h2>
                  <p className={cardBody}>{service.intro}</p>
                  <p className="mt-auto pt-5 text-xs uppercase tracking-[0.14em] text-moss">Explore →</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </main>
    </SiteChrome>
  );
}
