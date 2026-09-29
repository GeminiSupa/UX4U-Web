import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { hostLabel, lines } from "@/lib/content";
import { ensureSeed, getProjects } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Work" };

export default async function WorkPage() {
  await ensureSeed().catch(() => false);
  const projects = await getProjects(true);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-14">
        <p className="text-xs uppercase tracking-[0.22em] text-moss">Work</p>
        <h1 className="display mt-4 max-w-3xl text-4xl sm:text-6xl">Products and sites we have taken to market.</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">
          A sample of live work, with the homepage of each product.
        </p>
        <div className="mt-12 space-y-6">
          {projects.map((project, index) => (
            <article key={project.id} className="overflow-hidden border border-ink/10 bg-white/40">
              {project.image_url ? (
                <img
                  src={project.image_url}
                  alt={`${project.name} homepage`}
                  className="h-52 w-full object-cover object-top sm:h-96"
                />
              ) : null}
              <div className="grid gap-6 p-5 lg:grid-cols-[14rem_1fr]">
              <div>
                <p className="text-xs text-ink/40">0{index + 1}</p>
                <h2 className="mt-3 font-serif text-3xl">{project.name}</h2>
                <a href={project.url} className="mt-2 block text-sm text-moss hover:underline" target="_blank" rel="noreferrer">
                  {hostLabel(project.url)}
                </a>
                <p className="mt-4 text-xs uppercase tracking-[0.14em] text-ink/50">{project.services}</p>
              </div>
              <div>
                <p className="text-base leading-relaxed text-ink/80">{project.summary}</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {lines(project.features).map((feature) => (
                    <li key={feature} className="border-l border-moss/40 pl-3 text-sm text-ink/75">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
