export type Service = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  whatYouGet: string[];
  relatedWork: string[];
  relatedPost?: { slug: string; label: string };
  /** Thin pages stay noindex until owner supplies substance or related work. */
  indexed: boolean;
};

export const servicesCatalog: Service[] = [
  {
    slug: "product-development",
    title: "Custom Product Development for Startups",
    description:
      "UX4U builds full-stack products with accounts, roles, billing and a handover your team can run. Based in Islamabad.",
    h1: "Product development: from a concept to a working system",
    intro:
      "Most products stall between an idea and something a team opens every day. We scope the offer, build the product, and hand over a system your team can run.",
    whatYouGet: [
      "Scope and offer",
      "Name, pages, and brand",
      "Build through a usable launch",
      "Full-stack product",
      "Roles and permissions",
      "Billing or operations built in",
      "Handover a team can run"
    ],
    relatedWork: ["restromanage", "vakeel-diary"],
    relatedPost: {
      slug: "concept-is-not-a-business",
      label: "A concept is not a business yet"
    },
    indexed: true
  },
  {
    slug: "web-development",
    title: "Web Development Company in Islamabad",
    description:
      "UX4U designs and builds websites and storefronts that are structured for search and ready for ads. See live projects.",
    h1: "Websites and storefronts built to be found",
    intro:
      "We build the pages, the brand and the checkout together, so the site is ready for search and ads on day one.",
    whatYouGet: [
      "Pages and brand",
      "Product or program pages",
      "Account, order and support paths",
      "Structure ready for ads and search"
    ],
    relatedWork: ["unimondo", "usa-peptide-depot", "peptide-costa-rica", "battle-born"],
    relatedPost: {
      slug: "launch-is-the-start",
      label: "Launch is the start of the operating work"
    },
    indexed: true
  },
  {
    slug: "seo",
    title: "SEO Services in Islamabad and Pakistan",
    description:
      "SEO on pages that can rank, plus a monthly read on what to change. Technical fixes, page structure and content from UX4U.",
    h1: "SEO for pages that can actually rank",
    intro:
      "Search only works when the pages exist and can be found. We fix the structure first, then build the pages worth ranking.",
    whatYouGet: ["SEO on pages that can rank", "A monthly read on what to change"],
    relatedWork: ["restromanage", "usa-peptide-depot"],
    indexed: true
  },
  {
    slug: "meta-ads",
    title: "Meta Ads Management",
    description:
      "UX4U runs Meta campaigns and builds the creative around them, pointed at an offer and a page that can convert.",
    h1: "Meta ads built around your offer",
    intro:
      "We build campaigns and creative around one offer, then tune them against what the leads do.",
    whatYouGet: [
      "Meta campaigns and creative around them",
      "A monthly read on what to change"
    ],
    relatedWork: ["unimondo"],
    indexed: true
  },
  {
    slug: "lead-generation",
    title: "B2B Lead Generation Services",
    description:
      "A cleaned list of businesses to contact, built from public business pages, with outreach that says who you are.",
    h1: "Lead lists that become campaigns",
    intro:
      "A list of public emails is not a campaign. It is the raw material for one, and only if you say who you are.",
    whatYouGet: [
      "A cleaned list of businesses to contact, built from public business pages",
      "A monthly read on what to change"
    ],
    relatedWork: [],
    relatedPost: {
      slug: "what-a-lead-list-is-for",
      label: "What a lead list is for"
    },
    indexed: false
  },
  {
    slug: "business-automation",
    title: "Business Process Automation Services",
    description:
      "UX4U connects the tools you already pay for and removes repeated manual steps: follow-ups, handoffs and reports.",
    h1: "Automation that removes repeated handoffs",
    intro:
      "Work that should not need a person every time: follow-ups, handoffs, reports and tools talking to one another.",
    whatYouGet: [
      "Map repeated steps",
      "Connect tools you already pay for",
      "A quiet system instead of one more spreadsheet"
    ],
    relatedWork: [],
    relatedPost: {
      slug: "launch-is-the-start",
      label: "Launch is the start of the operating work"
    },
    indexed: false
  }
];

export function getService(slug: string) {
  return servicesCatalog.find((service) => service.slug === slug) || null;
}

export function indexedServices() {
  return servicesCatalog.filter((service) => service.indexed);
}
