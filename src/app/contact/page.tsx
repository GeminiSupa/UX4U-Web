import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SubmitButton } from "@/components/SubmitButton";
import { sendInquiry } from "@/lib/actions";

export const metadata: Metadata = { title: "Contact" };

const field = "mt-2 w-full border border-ink/15 bg-white/70 px-3 py-3 text-sm";

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
          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="text-ink/45">Email</dt>
              <dd>
                <a className="underline" href="mailto:info@ux4u.online">
                  info@ux4u.online
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-ink/45">Studio</dt>
              <dd>Islamabad</dd>
            </div>
          </dl>
        </div>
        <div className="border border-ink/10 bg-white/50 p-5 sm:p-8">
          {query.sent ? (
            <p className="text-lg">Received. We will reply at the address you gave.</p>
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
