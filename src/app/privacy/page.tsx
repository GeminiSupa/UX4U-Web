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
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects personal data for the studio website and product tools.`,
  path: "/privacy"
});

export default function PrivacyPage() {
  return (
    <LegalDoc eyebrow="Legal" title="Privacy Policy" updated="14 October 2026">
      <LegalSection title="Who we are">
        <p>
          {COMPANY_NAME} (“we”, “us”) is a software and growth studio registered in {COMPANY_CITY},{" "}
          {COMPANY_COUNTRY}. Controllers for personal data processed through {SITE_URL} and our related
          products are contacted at{" "}
          <a className="underline" href={`mailto:${COMPANY_EMAIL}`}>
            {COMPANY_EMAIL}
          </a>
          . Governing law and venue for privacy disputes sit with the courts of {COMPANY_JURISDICTION},
          without limiting rights you may have under the law of your country of residence.
        </p>
        <p>
          Pakistan does not yet have an enacted personal-data statute equivalent to the EU GDPR. The
          draft Personal Data Protection Bill is pending. Until then we follow the Constitution of
          Pakistan (Article 14 privacy principles), the Prevention of Electronic Crimes Act, 2016
          (PECA) where it applies to unauthorised access and misuse of data, and international
          practice (lawful purpose, transparency, minimisation, security, retention limits). If you
          are in the EU/UK or another jurisdiction with stricter rules, we apply the stricter
          standard where that law reaches our processing.
        </p>
      </LegalSection>

      <LegalSection title="What this policy covers">
        <p>This policy covers:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Visitors to the public marketing site at {SITE_URL}</li>
          <li>People who contact us (forms, email, WhatsApp)</li>
          <li>Authenticated users of our internal desk / dashboard tools</li>
          <li>
            Personal data that appears in lead lists and directories when you use our lead-generation
            product (public business contact data collected at your instruction)
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Data we collect">
        <p>
          <strong className="font-medium text-ink">Contact and project inquiries.</strong> Name,
          email, company, service interest, and message content you submit on /contact, plus any
          follow-up you send by email or WhatsApp.
        </p>
        <p>
          <strong className="font-medium text-ink">Account / desk access.</strong> Session cookies
          required to keep you signed in to /dashboard. Credentials are handled only for
          authentication; we do not sell account data.
        </p>
        <p>
          <strong className="font-medium text-ink">Analytics (optional).</strong> If you allow
          analytics in the consent banner, we load Vercel Web Analytics. It is cookieless: page
          path, referrer, browser/OS class, and a daily-resetting anonymous request hash. No
          advertising profiles, no cross-site tracking. Dashboard routes are excluded from analytics
          events where we control the client.
        </p>
        <p>
          <strong className="font-medium text-ink">Technical logs.</strong> Hosting and security logs
          (IP address, user agent, timestamps) may be processed by our infrastructure providers to
          keep the service available and secure.
        </p>
        <p>
          <strong className="font-medium text-ink">Lead-generation product data.</strong> When you
          run a search or scrape job, the tool may store business names, public websites, published
          emails/phones/WhatsApp links, city, category, and notes. That data is personal data where
          it identifies a natural person. You are the controller for how you use those lists; we are
          the processor for storage and tooling inside your account, unless we agree otherwise in
          writing.
        </p>
      </LegalSection>

      <LegalSection title="Why we process it">
        <ul className="list-disc space-y-1 pl-5">
          <li>Respond to inquiries and deliver studio services</li>
          <li>Operate and secure the website and dashboard</li>
          <li>Understand aggregate traffic (only with analytics consent)</li>
          <li>Provide the lead and directory features you request</li>
          <li>Meet legal obligations and defend legal claims</li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies and similar tech">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="font-medium text-ink">Essential:</strong> session cookie for dashboard
            login. Required for the product to work.
          </li>
          <li>
            <strong className="font-medium text-ink">Preference:</strong> your analytics choice stored
            in localStorage (`ux4u-consent`) so we do not ask on every visit.
          </li>
          <li>
            <strong className="font-medium text-ink">Analytics:</strong> loaded only after you click
            “Allow analytics”. Choose “Essential only” to refuse. You can clear site data in your
            browser to reset the choice.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Sharing">
        <p>
          We use infrastructure processors such as Vercel (hosting / optional analytics) and Supabase
          (database / auth storage) under their terms. We do not sell personal data. We may disclose
          information if required by Pakistani law or a valid legal process, or to protect rights,
          safety, and security.
        </p>
      </LegalSection>

      <LegalSection title="Retention">
        <p>
          Inquiry messages are kept while useful for the relationship and then deleted or archived.
          Analytics aggregates follow Vercel’s retention. Lead rows remain until you delete them or
          close the account. Session cookies expire when the session ends or ages out.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use HTTPS, access-controlled admin tools, and least-privilege database keys. No method
          of transmission or storage is perfectly secure; report issues to {COMPANY_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <ul className="list-disc space-y-1 pl-5">
          <li>Refuse or withdraw analytics via the consent banner / clearing site data</li>
          <li>Ask for a copy, correction, or deletion of inquiry data we hold about you</li>
          <li>Object to processing that is not required to provide a service you requested</li>
        </ul>
        <p>
          Write to {COMPANY_EMAIL}. We will respond within a reasonable time. If you are an EU/UK
          resident and believe we have not handled a request properly, you may complain to your
          local supervisory authority.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          The site and products are aimed at businesses and professionals. We do not knowingly
          collect data from children under 16.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy. The “Last updated” date above will change. Material changes
          affecting tracking will be reflected in the consent banner or a notice on the site.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
