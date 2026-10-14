import { LegalDoc, LegalSection } from "@/components/LegalDoc";
import { pageMeta } from "@/lib/seo";
import {
  COMPANY_CITY,
  COMPANY_COUNTRY,
  COMPANY_EMAIL,
  COMPANY_JURISDICTION,
  COMPANY_NAME,
  SITE_NAME,
  SITE_URL
} from "@/lib/site";

export const metadata = pageMeta({
  title: "Terms and Conditions",
  description: `Terms for using the ${SITE_NAME} website, studio services, and lead-generation tools.`,
  path: "/terms"
});

export default function TermsPage() {
  return (
    <LegalDoc eyebrow="Legal" title="Terms and Conditions" updated="14 October 2026">
      <LegalSection title="Agreement">
        <p>
          These Terms govern access to {SITE_URL}, related dashboards, and studio services offered by{" "}
          {COMPANY_NAME}, a company registered in {COMPANY_CITY}, {COMPANY_COUNTRY}. By using the
          site or products you agree to these Terms and our{" "}
          <a className="underline" href="/privacy">
            Privacy Policy
          </a>
          . If you use the tools on behalf of a company, you confirm you are authorised to bind that
          company.
        </p>
      </LegalSection>

      <LegalSection title="Studio services">
        <p>
          Project work (software, web, SEO, marketing, automation, consulting) is scoped in a
          separate proposal, statement of work, or written email confirmation. Fees, timelines,
          deliverables, and IP ownership for client projects are set there. These website Terms do
          not override a signed project contract.
        </p>
      </LegalSection>

      <LegalSection title="Website use">
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not attempt to break, scrape abusively, or overload the public site</li>
          <li>Do not impersonate {SITE_NAME} or misuse our branding</li>
          <li>Content on the marketing site is for information; it is not legal or investment advice</li>
        </ul>
      </LegalSection>

      <LegalSection title="Lead generation and directory tools">
        <p>
          Our desk tools may collect business contact details that are already published on public
          websites or open map listings (for example addresses, published emails, phone numbers, or
          WhatsApp links on a business contact page). The tools are designed for lawful B2B outreach
          using publicly available information.
        </p>
        <p>You agree that you will:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Use collected data only for legitimate business purposes and in line with applicable law
            (including PECA in Pakistan, spam and telecom rules, and privacy laws of the countries
            where the contacted people or businesses are located)
          </li>
          <li>Not use the tools to harvest private accounts, bypass access controls, or obtain data that is not publicly published</li>
          <li>Not send unsolicited marketing where consent or a lawful basis is required and you do not have it</li>
          <li>Honour unsubscribe / do-not-contact requests promptly</li>
          <li>Remain responsible for the accuracy of your targeting, your messages, and your compliance programme</li>
        </ul>
        <p>
          We do not guarantee completeness or accuracy of scraped or directory data. Listings can be
          outdated or wrong. You must verify before relying on them for contracts or regulated
          decisions.
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          Dashboard access is for authorised users only. Keep credentials confidential. We may
          suspend access for misuse, security risk, or non-payment under a separate commercial
          agreement.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          Site design, copy, and software remain {COMPANY_NAME} property unless assigned in a
          project agreement. You may not copy our marketing site or product UI for competing
          services without written permission.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers">
        <p>
          The website and tools are provided “as is”. To the fullest extent permitted by Pakistani
          law, we disclaim implied warranties of merchantability and fitness for a particular
          purpose. We do not warrant uninterrupted availability.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          To the extent permitted by law, {COMPANY_NAME} is not liable for indirect, incidental, or
          consequential loss, lost profits, or loss of data arising from site or tool use. Our
          aggregate liability for claims arising from the free public website is limited to PKR
          10,000. Liability for paid studio or product contracts is limited as stated in that
          contract.
        </p>
      </LegalSection>

      <LegalSection title="Indemnity">
        <p>
          You will indemnify {COMPANY_NAME} against claims arising from your misuse of lead data,
          unlawful outreach, or breach of these Terms, except to the extent caused by our wilful
          misconduct.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These Terms are governed by the laws of {COMPANY_COUNTRY}. Courts in {COMPANY_JURISDICTION}{" "}
          have exclusive jurisdiction, subject to mandatory consumer protections that cannot be
          waived.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions:{" "}
          <a className="underline" href={`mailto:${COMPANY_EMAIL}`}>
            {COMPANY_EMAIL}
          </a>
          . {COMPANY_NAME}, {COMPANY_CITY}, {COMPANY_COUNTRY}.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
