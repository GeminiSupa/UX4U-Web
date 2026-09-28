import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { hostLabel, lines, method, services } from "@/lib/content";
import { ensureSeed, getOffers, getPosts, getProjects, getTeam } from "@/lib/data";

export const dynamic = "force-dynamic";

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
        <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.4fr_0.8fr] lg:pt-20">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-moss">Islamabad studio</p>
            <h1 className="display mt-5 max-w-4xl text-5xl text-ink sm:text-7xl">
              From a concept to a business that runs.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/75">
              UX4U designs and builds the product, then stays for the part that makes it a company:
              the website, the search, the ads, the leads, and the automations your team uses on a Tuesday.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-full bg-ink px-5 py-3 text-sm text-paper">
                Tell us what you are building
              </Link>
              <Link href="/work" className="rounded-full border border-ink/15 px-5 py-3 text-sm">
                See the work
              </Link>
            </div>
          </div>
          <aside className="border border-ink/10 bg-white/40 p-6">
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

        <section className="border-y border-ink/10 bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {method.map(([index, title, copy]) => (
              <article key={index} className="bg-ink px-5 py-8">
                <p className="text-xs text-lime">{index}</p>
                <h2 className="mt-4 font-serif text-3xl">{title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-paper/70">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between gap-6">
            <h2 className="font-serif text-4xl sm:text-5xl">Selected work</h2>
            <Link href="/work" className="text-sm underline">
              All projects
            </Link>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {projects.slice(0, 3).map((project) => (
              <a
                key={project.id}
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-64 flex-col justify-between overflow-hidden border border-ink/10 bg-white/50 transition hover:-translate-y-0.5"
              >
                {project.image_url ? (
                  <img src={project.image_url} alt="" className="h-44 w-full object-cover object-top" />
                ) : null}
                <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/45">{hostLabel(project.url)}</p>
                  <h3 className="mt-4 font-serif text-3xl">{project.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">{project.summary}</p>
                </div>
                <p className="mt-6 text-xs uppercase tracking-[0.14em] text-moss">{project.services}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="font-serif text-4xl">Ways to start</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              Pick the shape of the engagement. We will narrow the scope on the first call, not after a 40-page proposal.
            </p>
          </div>
          <div className="divide-y divide-ink/10 border-y border-ink/10">
            {offers.map((offer) => (
              <article key={offer.id} className="grid gap-3 py-6 sm:grid-cols-[12rem_1fr]">
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
            ))}
          </div>
        </section>

        <section className="border-y border-ink/10 bg-white/40">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-serif text-4xl">The desk</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {team.map((person) => (
                <article key={person.id} className="border border-ink/10 p-5">
                  <p className="font-serif text-2xl">{person.name}</p>
                  <p className="mt-1 text-sm text-moss">{person.role}</p>
                  <p className="mt-4 text-sm leading-relaxed text-ink/70">{person.bio}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-4xl">Notes</h2>
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

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="flex flex-col justify-between gap-6 bg-moss px-6 py-10 text-paper sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-lime">info@ux4u.online</p>
              <h2 className="mt-3 max-w-lg font-serif text-4xl leading-none">
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
