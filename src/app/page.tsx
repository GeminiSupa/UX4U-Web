import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SiteChrome } from "@/components/SiteChrome";
import { TiltCard } from "@/components/TiltCard";
import { JsonLd } from "@/components/JsonLd";
import { hostLabel, lines, method, services } from "@/lib/content";
import { ensureSeed, getOffers, getPosts, getProjects, getTeam } from "@/lib/data";
import { btnAccent, btnPrimary, card, cardBody, cardMeta, cardPad, cardTitle } from "@/lib/ui";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UX4U | Product Software, Web Dev, SEO & Growth Studio — Islamabad",
  description:
    "Cutting-edge product design, web development, SEO, Meta ads, lead generation and business automation. From concept to a business that runs — UX4U, Islamabad.",
  keywords: [
    "web development Islamabad",
    "product design Pakistan",
    "SEO agency Islamabad",
    "lead generation",
    "Meta ads",
    "business automation",
    "software studio",
    "UX4U"
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "UX4U | Software and Growth Studio in Islamabad",
    description:
      "From a concept to a business that runs. Product software, web development, SEO, lead generation and automation from Islamabad.",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "UX4U studio" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "UX4U | Software and Growth Studio in Islamabad",
    description:
      "Product software, web development, SEO, lead generation and automation — from concept to a business that runs."
  },
  robots: { index: true, follow: true }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does UX4U build?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Product software, websites, SEO, Meta ads, lead generation systems and business automations — from concept through ongoing operation."
      }
    },
    {
      "@type": "Question",
      name: "Where is UX4U based?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "UX4U is a software and growth studio registered in Islamabad, Pakistan, working with clients locally and internationally."
      }
    },
    {
      "@type": "Question",
      name: "How do I start a project?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Write to info@ux4u.online or use the contact form. We reply within one working day with a clear next step."
      }
    }
  ]
};

const professionalService = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: SITE_NAME,
  url: SITE_URL,
  image: `${SITE_URL}/logo.png`,
  description:
    "Product software, web development, SEO, lead generation, Meta ads and business automation from Islamabad.",
  areaServed: ["Pakistan", "United States", "Worldwide"],
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Islamabad",
    addressCountry: "PK"
  }
};

export default async function HomePage() {
  await ensureSeed().catch(() => false);
  const [projects, offers, team, posts] = await Promise.all([
    getProjects(true),
    getOffers(true),
    getTeam(true),
    getPosts(true)
  ]);

  return (
    <SiteChrome>
      <JsonLd data={faqSchema} />
      <JsonLd data={professionalService} />
      <main>
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-10 sm:px-5 sm:pt-14 lg:grid-cols-[1.4fr_0.8fr] lg:gap-12 lg:pt-20">
          <div className="hero-rise">
            <p className="text-xs uppercase tracking-[0.22em] text-moss">
              Software · growth · automation · Islamabad
            </p>
            <h1 className="display mt-4 max-w-4xl text-4xl text-ink sm:mt-5 sm:text-6xl lg:text-7xl">
              From a concept to a business that runs.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/75">
              UX4U designs and builds the product, then stays for the part that makes it a company:
              the website, the search, the ads, the leads, and the automations your team uses on a Tuesday.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/contact" className={btnPrimary}>
                Tell us what you are building
              </Link>
              <Link href="/work" className="text-center text-sm text-ink/80 underline-offset-4 hover:underline">
                See the projects
              </Link>
            </div>
          </div>
          <aside className="hero-rise-late glass-panel float-slow rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-ink/50">What we take on</p>
            <ul className="mt-4 space-y-3 text-sm">
              {services.map(([name]) => (
                <li key={name} className="flex items-center justify-between border-b border-ink/10 pb-3">
                  <span>{name}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-ink/60">One studio. The build and the growth sit with the same people.</p>
          </aside>
        </section>

        <section className="tech-band border-y border-ink/20 text-paper">
          <div className="relative z-[1] mx-auto grid max-w-6xl gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {method.map(([index, title, copy], position) => (
              <Reveal key={index} delay={position * 80} className="h-full">
                <article className="h-full bg-ink/80 px-5 py-8 backdrop-blur-sm">
                  <p className="text-xs text-lime">{index}</p>
                  <h2 className="mt-4 font-serif text-3xl">{title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-paper/70">{copy}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-serif text-3xl sm:text-5xl">Selected projects</h2>
            <Link href="/work" className="text-sm underline">
              All projects
            </Link>
          </div>
          <div className="mt-8 grid auto-rows-fr gap-5 lg:grid-cols-3">
            {projects.slice(0, 3).map((project, position) => (
              <Reveal key={project.id} delay={position * 90} className="h-full">
                <TiltCard as="a" href={`/work/${project.slug}`} className={`${card} work-card min-h-[22rem]`}>
                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt={project.image_alt}
                      width={800}
                      height={450}
                      className="h-48 w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-48 items-end bg-gradient-to-br from-ink via-moss to-cyan p-5">
                      <span className="font-serif text-2xl text-lime">{project.name}</span>
                    </div>
                  )}
                  <div className={cardPad}>
                    <div>
                      <p className={cardMeta}>{hostLabel(project.url)}</p>
                      <h3 className={`mt-3 ${cardTitle}`}>{project.name}</h3>
                      <p className={cardBody}>{project.summary}</p>
                    </div>
                    <p className="mt-6 text-xs uppercase tracking-[0.14em] text-moss">{project.services}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-12 sm:px-5 sm:pb-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl">Ways to start</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              Pick the shape of the engagement. We will narrow the scope on the first call, not after a 40-page proposal.
            </p>
          </div>
          <div className="space-y-3">
            {offers.map((offer, position) => (
              <Reveal key={offer.id} delay={position * 60}>
                <article className={`${card} grid gap-3 !shadow-lift p-5 sm:grid-cols-[12rem_1fr] sm:p-6`}>
                  <h3 className="font-medium">{offer.name}</h3>
                  <div>
                    <p className="text-sm leading-relaxed text-ink/75">{offer.summary}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {lines(offer.points).map((point) => (
                        <li key={point} className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs text-ink/70">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-y border-ink/10 bg-white/30 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
            <h2 className="font-serif text-3xl sm:text-4xl">The desk</h2>
            <div className="mt-8 grid auto-rows-fr gap-5 sm:grid-cols-2">
              {team.map((person, position) => (
                <Reveal key={person.id} delay={position * 70} className="h-full">
                  <TiltCard as="article" className={`${card} min-h-[11rem]`}>
                    <div className={`${cardPad} !flex-row gap-4`}>
                      {person.photo_url ? (
                        <img
                          src={person.photo_url}
                          alt={`${person.name}, ${person.role}`}
                          className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-white/80"
                        />
                      ) : (
                        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-ink font-serif text-2xl text-lime ring-2 ring-cyan/30">
                          {person.name.slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-serif text-2xl">{person.name}</p>
                        <p className="mt-1 text-sm text-moss">{person.role}</p>
                        <p className="mt-3 text-sm leading-relaxed text-ink/70">{person.bio}</p>
                        {person.profile_url ? (
                          <a
                            href={person.profile_url}
                            className="mt-3 inline-block text-sm underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Profile
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-serif text-3xl sm:text-4xl">Notes</h2>
            <Link href="/blog" className="text-sm underline">
              Journal
            </Link>
          </div>
          <div className="mt-8 grid auto-rows-fr gap-5 md:grid-cols-3">
            {posts.slice(0, 3).map((post, position) => (
              <Reveal key={post.id} delay={position * 70} className="h-full">
                <TiltCard as="a" href={`/blog/${post.slug}`} className={`${card} min-h-[12rem]`}>
                  <div className={cardPad}>
                    <h3 className={cardTitle}>{post.title}</h3>
                    <p className={cardBody}>{post.excerpt}</p>
                    <p className="mt-auto pt-5 text-xs uppercase tracking-[0.14em] text-cyan">Read note →</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 sm:pb-20">
          <div className="cta-slab flex flex-col justify-between gap-6 px-5 py-8 text-paper sm:flex-row sm:items-end sm:px-8 sm:py-12">
            <div className="relative z-[1]">
              <p className="text-xs uppercase tracking-[0.18em] text-lime">info@ux4u.online</p>
              <h2 className="mt-3 max-w-lg font-serif text-3xl leading-none sm:text-4xl">
                Bring the concept. We will tell you what it takes to run it.
              </h2>
            </div>
            <Link href="/contact" className={`relative z-[1] ${btnAccent}`}>
              Write to the studio
            </Link>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
