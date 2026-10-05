import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Reveal } from "@/components/Reveal";
import { hostLabel, lines, method, services } from "@/lib/content";
import { ensureSeed, getOffers, getPosts, getProjects, getTeam } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "UX4U",
    title: "UX4U | Software and Growth Studio in Islamabad",
    description:
      "From a concept to a business that runs. Product software, web development, SEO, lead generation and automation from Islamabad.",
    url: "/"
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
    <>
      <Header />
      <main>
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-10 sm:px-5 sm:pt-14 lg:grid-cols-[1.4fr_0.8fr] lg:gap-12 lg:pt-20">
          <div className="hero-rise">
            <p className="text-xs uppercase tracking-[0.22em] text-moss">Software and growth studio · Islamabad</p>
            <h1 className="display mt-4 max-w-4xl text-4xl text-ink sm:mt-5 sm:text-6xl lg:text-7xl">
              From a concept to a business that runs.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/75">
              UX4U designs and builds the product, then stays for the part that makes it a company:
              the website, the search, the ads, the leads, and the automations your team uses on a Tuesday.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/contact" className="rounded-full bg-ink px-5 py-3 text-center text-sm text-paper">
                Tell us what you are building
              </Link>
              <Link href="/work" className="text-center text-sm text-ink/80 underline-offset-4 hover:underline">
                See the work
              </Link>
            </div>
          </div>
          <aside className="hero-rise-late border border-ink/10 bg-white/50 p-6 shadow-[0_24px_60px_-36px_rgba(22,24,21,0.45)]">
            <p className="text-xs uppercase tracking-[0.18em] text-ink/50">What we take on</p>
            <ul className="mt-4 space-y-3 text-sm">
              {services.map(([name]) => (
                <li key={name} className="flex items-center justify-between border-b border-ink/10 pb-3">
                  <span>{name}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-moss" />
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-ink/60">
              One studio. The build and the growth sit with the same people.
            </p>
          </aside>
        </section>

        <div className="overflow-hidden border-y border-ink/10 bg-lime/70 py-3">
          <div className="marquee-track flex w-max gap-10 px-6 text-xs uppercase tracking-[0.22em]">
            {[...services, ...services].map(([name], index) => (
              <span key={`${name}-${index}`} className="shrink-0">
                {name}
              </span>
            ))}
          </div>
        </div>

        <section className="border-y border-ink/10 bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {method.map(([index, title, copy], position) => (
              <Reveal key={index} delay={position * 80} className="h-full">
              <article className="h-full bg-ink px-5 py-8">
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
            <h2 className="font-serif text-3xl sm:text-5xl">Selected work</h2>
            <Link href="/work" className="text-sm underline">
              All projects
            </Link>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {projects.slice(0, 3).map((project, position) => (
              <Reveal key={project.id} delay={position * 90}>
              <Link
                href={`/work/${project.slug}`}
                className="work-card group flex min-h-64 flex-col justify-between overflow-hidden border border-ink/10 bg-white/60 shadow-[0_18px_40px_-32px_rgba(22,24,21,0.7)] transition hover:-translate-y-1"
              >
                {project.image_url ? (
                  <img
                    src={project.image_url}
                    alt={project.image_alt}
                    width={800}
                    height={450}
                    className="h-44 w-full object-cover object-top"
                  />
                ) : null}
                <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/45">{hostLabel(project.url)}</p>
                  <h3 className="mt-4 font-serif text-3xl">{project.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">{project.summary}</p>
                </div>
                <p className="mt-6 text-xs uppercase tracking-[0.14em] text-moss">{project.services}</p>
                </div>
              </Link>
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
          <div className="divide-y divide-ink/10 border-y border-ink/10">
            {offers.map((offer, position) => (
              <Reveal key={offer.id} delay={position * 60}>
              <article className="grid gap-3 py-6 sm:grid-cols-[12rem_1fr]">
                <h3 className="font-medium">{offer.name}</h3>
                <div>
                  <p className="text-sm leading-relaxed text-ink/75">{offer.summary}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {lines(offer.points).map((point) => (
                      <li key={point} className="rounded-full bg-white px-3 py-1 text-xs text-ink/70">
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

        <section className="border-y border-ink/10 bg-white/40">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
            <h2 className="font-serif text-3xl sm:text-4xl">The desk</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {team.map((person, position) => (
                <Reveal key={person.id} delay={position * 70}>
                <article className="flex gap-4 border border-ink/10 bg-paper p-4 transition hover:-translate-y-0.5 sm:p-5">
                  {person.photo_url ? (
                    <img
                      src={person.photo_url}
                      alt={`${person.name}, ${person.role}`}
                      className="h-20 w-20 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-ink font-serif text-2xl text-lime">
                      {person.name.slice(0, 1)}
                    </span>
                  )}
                  <div>
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
                </article>
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
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="border border-ink/10 p-5 hover:bg-white/60">
                <h3 className="font-serif text-2xl leading-tight">{post.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 sm:pb-20">
          <div className="flex flex-col justify-between gap-6 bg-moss px-5 py-8 text-paper sm:flex-row sm:items-end sm:px-6 sm:py-10">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-lime">info@ux4u.online</p>
              <h2 className="mt-3 max-w-lg font-serif text-3xl leading-none sm:text-4xl">
                Bring the concept. We will tell you what it takes to run it.
              </h2>
            </div>
            <Link href="/contact" className="rounded-full bg-lime px-5 py-3 text-sm font-medium text-ink">
              Write to the studio
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
