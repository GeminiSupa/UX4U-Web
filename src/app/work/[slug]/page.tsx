import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { hostLabel, lines, PROJECT_ORDER } from "@/lib/content";
import { ensureSeed, getProject, getProjects } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { getService } from "@/lib/services";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

function relatedServiceLinks(services: string) {
  const hay = services.toLowerCase();
  const picks: { slug: string; label: string }[] = [];
  const add = (slug: string, label: string) => {
    if (!picks.some((item) => item.slug === slug)) picks.push({ slug, label });
  };
  if (hay.includes("product") || hay.includes("full stack") || hay.includes("full-stack")) {
    add("product-development", "Product development");
  }
  if (hay.includes("web") || hay.includes("design")) add("web-development", "Web development");
  if (hay.includes("seo")) add("seo", "SEO");
  if (hay.includes("meta") || hay.includes("marketing") || hay.includes("ads")) {
    add("meta-ads", "Meta ads");
  }
  return picks.filter((item) => getService(item.slug)?.indexed);
}

export async function generateStaticParams() {
  return PROJECT_ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  const thin = !project.challenge && !project.result;
  const description = `${project.name}: ${project.summary} Built by UX4U (${project.services}).`.slice(
    0,
    155
  );
  return pageMeta({
    title: `${project.name} Case Study`,
    description,
    path: `/work/${project.slug}`,
    noindex: thin
  });
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureSeed().catch(() => false);
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const related = (await getProjects(true)).filter((item) => item.slug !== slug).slice(0, 2);
  const serviceLinks = relatedServiceLinks(project.services);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Work",
        item: `${SITE_URL}/work`
      },
      {
        "@type": "ListItem",
        position: 2,
        name: project.name,
        item: `${SITE_URL}/work/${project.slug}`
      }
    ]
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
        <JsonLd data={breadcrumb} />
        <p className="text-sm text-ink/50">
          <Link href="/work" className="hover:underline">
            Work
          </Link>
          {" / "}
          {project.name}
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-moss">{project.services}</p>
        <h1 className="display mt-4 text-4xl sm:text-6xl">{project.name}</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink/75">{project.summary}</p>

        {project.image_url ? (
          <img
            src={project.image_url}
            alt={project.image_alt}
            width={1200}
            height={640}
            className="mt-10 w-full border border-ink/10 object-cover object-top"
          />
        ) : null}

        <section className="mt-10">
          <h2 className="font-serif text-3xl">What we built</h2>
          <ul className="mt-4 space-y-2">
            {lines(project.features).map((feature) => (
              <li key={feature} className="border-l border-moss/40 pl-3 text-sm leading-relaxed text-ink/80">
                {feature}
              </li>
            ))}
          </ul>
        </section>

        {project.challenge ? (
          <section className="mt-10">
            <h2 className="font-serif text-3xl">The problem</h2>
            <p className="mt-4 text-base leading-relaxed text-ink/80">{project.challenge}</p>
          </section>
        ) : null}

        {project.result ? (
          <section className="mt-10">
            <h2 className="font-serif text-3xl">Result</h2>
            {project.result === "confidential" ? (
              <p className="mt-4 text-base leading-relaxed text-ink/80">
                Results are confidential at the client&apos;s request.
              </p>
            ) : (
              <p className="mt-4 text-base leading-relaxed text-ink/80">
                {project.result.metric} ({project.result.date}; {project.result.method})
              </p>
            )}
          </section>
        ) : null}

        {project.quote ? (
          <blockquote className="mt-10 border-l border-ink/20 pl-4">
            <p className="font-serif text-2xl leading-snug text-ink/85">&ldquo;{project.quote.text}&rdquo;</p>
            <footer className="mt-3 text-sm text-ink/60">
              {project.quote.name}, {project.quote.role}
            </footer>
          </blockquote>
        ) : null}

        <p className="mt-10">
          <a
            href={project.url}
            className="text-sm text-moss hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit {hostLabel(project.url)}
          </a>
        </p>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/45">Related services</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {serviceLinks.length ? (
                serviceLinks.map((item) => (
                  <Link key={item.slug} href={`/services/${item.slug}`} className="underline">
                    {item.label}
                  </Link>
                ))
              ) : (
                <Link href="/services" className="underline">
                  Services
                </Link>
              )}
            </div>
          </div>
          <Link href="/contact" className="rounded-full bg-ink px-5 py-3 text-center text-sm text-paper">
            Talk about a similar project
          </Link>
        </div>

        {related.length ? (
          <div className="mt-12 border-t border-ink/10 pt-6">
            <p className="text-xs uppercase tracking-[0.16em] text-ink/45">More work</p>
            {related.map((item) => (
              <Link key={item.id} href={`/work/${item.slug}`} className="mt-3 block font-serif text-2xl hover:underline">
                {item.name}
              </Link>
            ))}
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
