import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SubmitButton } from "@/components/SubmitButton";
import { sendInquiry } from "@/lib/actions";
import { pageMeta } from "@/lib/seo";
import { RESPONSE_TIME, WHATSAPP } from "@/lib/site";

export const metadata = pageMeta({
  title: "Start a Project",
  description:
    "Tell UX4U what you are building. Share a concept, a half-built product, or a business that needs search, ads and automation. We reply from info@ux4u.online.",
  path: "/contact"
});

const field = "mt-2 w-full border border-ink/15 bg-white/70 px-3 py-3 text-sm";

const relatedWork = [
  ["RestroManage", "/work/restromanage"],
  ["Vakeel Diary", "/work/vakeel-diary"],
  ["UniMondo", "/work/unimondo"]
];

export default async function ContactPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const query = await searchParams;

  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-5 sm:py-14 lg:grid-cols-[0.8fr_1.1fr] lg:gap-12">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-moss">Contact</p>
          <h1 className="display mt-4 text-4xl sm:text-6xl">Tell us where you are.</h1>
          <p className="mt-6 text-lg leading-relaxed text-ink/75">
            A concept, a half-built product, or a business that needs search, ads, and a cleaner operation.
            Write what you have. We reply from info@ux4u.online.
          </p>
          {/* TODO(owner): confirmed response-time promise via RESPONSE_TIME in lib/site.ts */}
          {RESPONSE_TIME ? <p className="mt-4 text-sm text-ink/70">{RESPONSE_TIME}</p> : null}
          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="text-ink/45">Email</dt>
              <dd>
                <a className="underline" href="mailto:info@ux4u.online">
                  info@ux4u.online
                </a>
              </dd>
            </div>
            {WHATSAPP ? (
              <div>
                <dt className="text-ink/45">WhatsApp</dt>
                <dd>
                  <a className="underline" href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`}>
                    WhatsApp: {WHATSAPP}
                  </a>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-ink/45">Studio</dt>
              <dd>Islamabad</dd>
            </div>
          </dl>
          <p className="mt-8 text-sm text-ink/70">
            See related work:{" "}
            {relatedWork.map(([label, href], index) => (
              <span key={href}>
                {index > 0 ? ", " : ""}
                <Link href={href} className="underline">
                  {label}
                </Link>
              </span>
            ))}
          </p>
        </div>
        <div className="border border-ink/10 bg-white/50 p-5 sm:p-8">
          {query.sent ? (
            <p className="text-lg">
              Thanks. We have your message and will reply from info@ux4u.online.
              {RESPONSE_TIME ? ` ${RESPONSE_TIME}` : ""}
            </p>
          ) : (
            <form action={sendInquiry} className="grid gap-4">
              {query.error ? (
                <p className="border border-red-900/20 bg-red-50 px-3 py-2 text-sm">
                  Add your name, a real email, and a short note. If it still fails, email info@ux4u.online.
                </p>
              ) : null}
              <label className="text-sm">
                Name
                <input className={field} name="name" required />
              </label>
              <label className="text-sm">
                Email
                <input className={field} name="email" type="email" required />
              </label>
              <label className="text-sm">
                Company
                <input className={field} name="company" />
              </label>
              <label className="text-sm">
                What do you need
                <select className={field} name="service" defaultValue="Concept to launch">
                  <option>Concept to launch</option>
                  <option>Product build</option>
                  <option>Web development</option>
                  <option>SEO</option>
                  <option>Lead generation</option>
                  <option>Marketing and Meta ads</option>
                  <option>Business automation</option>
                </select>
              </label>
              <label className="text-sm">
                The situation
                <textarea className={field} name="message" rows={6} required placeholder="What exists today, and what should be running in three months." />
              </label>
              <SubmitButton label="Send" pendingLabel="Sending" dark />
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
