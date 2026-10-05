import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { ensureSeed, getProjects } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getService, servicesCatalog } from "@/lib/services";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return servicesCatalog.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return pageMeta({
    title: service.title,
    description: service.description,
    path: `/services/${service.slug}`,
    noindex: !service.indexed
  });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureSeed().catch(() => false);
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const projects = await getProjects(true);
  const related = projects.filter((project) => service.relatedWork.includes(project.slug));

  const structured = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL
    },
    url: `${SITE_URL}/services/${service.slug}`
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
        <JsonLd data={structured} />
        <Link href="/services" className="text-sm text-ink/50">
          Services
        </Link>
        <h1 className="display mt-4 text-4xl sm:text-5xl">{service.h1}</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink/75">{service.intro}</p>

        <section className="mt-10">
          <h2 className="font-serif text-3xl">What you get</h2>
          <ul className="mt-4 space-y-2">
            {service.whatYouGet.map((item) => (
              <li key={item} className="border-l border-moss/40 pl-3 text-sm leading-relaxed text-ink/80">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {related.length ? (
          <section className="mt-10">
            <h2 className="font-serif text-3xl">Related work</h2>
            <div className="mt-4 grid gap-3">
              {related.map((project) => (
                <Link
                  key={project.id}
                  href={`/work/${project.slug}`}
                  className="border border-ink/10 p-4 hover:bg-white/60"
                >
                  <p className="font-serif text-2xl">{project.name}</p>
                  <p className="mt-2 text-sm text-ink/70">{project.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {service.relatedPost ? (
          <p className="mt-10 text-sm text-ink/70">
            Related note:{" "}
            <Link href={`/blog/${service.relatedPost.slug}`} className="underline">
              {service.relatedPost.label}
            </Link>
          </p>
        ) : null}

        <div className="mt-12">
          <Link href="/contact" className="rounded-full bg-ink px-5 py-3 text-sm text-paper">
            Start a project
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
