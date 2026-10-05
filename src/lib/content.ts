export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  /** TODO(owner): public profile URL when available */
  profile_url?: string;
  sort_order: number;
  published: boolean;
};

export type ProjectResult =
  | { metric: string; date: string; method: string }
  | "confidential";

export type Project = {
  id: string;
  name: string;
  slug: string;
  url: string;
  summary: string;
  features: string;
  services: string;
  image_url: string;
  image_alt: string;
  /** TODO(owner): verified challenge / result / quote only */
  challenge?: string;
  result?: ProjectResult;
  quote?: { text: string; name: string; role: string };
  sort_order: number;
  published: boolean;
};

/** Default public work order (peptides after the others). */
export const PROJECT_ORDER = [
  "restromanage",
  "vakeel-diary",
  "unimondo",
  "usa-peptide-depot",
  "peptide-costa-rica",
  "battle-born"
] as const;

const SLUG_BY_NAME: Record<string, string> = {
  RestroManage: "restromanage",
  UniMondo: "unimondo",
  "USA Peptide Depot": "usa-peptide-depot",
  "Peptide Costa Rica": "peptide-costa-rica",
  "Vakeel Diary": "vakeel-diary",
  "Battle Born Peptide": "battle-born"
};

export function projectSlug(name: string, url = "") {
  if (SLUG_BY_NAME[name]) return SLUG_BY_NAME[name];
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("restromanage")) return "restromanage";
    if (host.includes("unimondo")) return "unimondo";
    if (host.includes("usapeptidedepot")) return "usa-peptide-depot";
    if (host.includes("peptidecostarica")) return "peptide-costa-rica";
    if (host.includes("vakeeldiary")) return "vakeel-diary";
    if (host.includes("battleborn")) return "battle-born";
  } catch {
    /* ignore */
  }
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sortProjects<T extends { name: string; url?: string; slug?: string; sort_order?: number }>(
  projects: T[]
) {
  const rank = new Map(PROJECT_ORDER.map((slug, index) => [slug, index]));
  return [...projects].sort((a, b) => {
    const aSlug = a.slug || projectSlug(a.name, a.url || "");
    const bSlug = b.slug || projectSlug(b.name, b.url || "");
    const aRank = rank.get(aSlug as (typeof PROJECT_ORDER)[number]);
    const bRank = rank.get(bSlug as (typeof PROJECT_ORDER)[number]);
    if (aRank !== undefined || bRank !== undefined) {
      return (aRank ?? 999) - (bRank ?? 999);
    }
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export type Offer = {
  id: string;
  name: string;
  summary: string;
  points: string;
  sort_order: number;
  published: boolean;
};

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  published: boolean;
  created_at: string;
};

export const services = [
  ["Product software", "Full-stack systems for the way a company actually works: accounts, roles, billing, and the daily screen."],
  ["Web development", "Sites and storefronts with a clear offer, fast pages, and a path from the first visit to a paid yes."],
  ["SEO", "Structure, pages, and search intent so the business shows up for the work it wants."],
  ["Lead generation", "Public business contacts, cleaned into a list your team can actually use."],
  ["Marketing", "Positioning, Meta ads, and the message that matches the product."],
  ["Business automation", "The repeated work — follow-ups, handoffs, reports — moved into a system."]
] as const;

export const method = [
  ["01", "Concept", "Who it is for, what they pay for, and what has to exist on day one."],
  ["02", "Build", "The product, the site, and the brand, in the same conversation."],
  ["03", "Acquire", "Search, ads, and a lead list pointed at the offer."],
  ["04", "Operate", "Automations and a dashboard the team uses after launch, not a folder of files."]
] as const;

export const seedTeam: TeamMember[] = [
  {
    id: "seed-omer",
    name: "Omer Farooq",
    role: "CEO, full-stack developer",
    bio: "Sets the build and stays in the code. Product scope, architecture, and the path from a rough idea to something a customer can use.",
    photo_url: "",
    sort_order: 1,
    published: true
  },
  {
    id: "seed-maaz",
    name: "Muhammad Maaz Akram",
    role: "AI automation engineer",
    bio: "Connects the tools a business already has and removes the manual steps between them.",
    photo_url: "",
    sort_order: 2,
    published: true
  },
  {
    id: "seed-bakar",
    name: "Muhammad Abu Bakar Siddique",
    role: "Design and marketing",
    bio: "The look of the product and the story around it, so the offer is obvious before anyone reads a feature list.",
    photo_url: "",
    sort_order: 3,
    published: true
  },
  {
    id: "seed-ali",
    name: "Muhammad Ali",
    role: "SEO, Meta ads, marketing",
    bio: "Search and paid social. Gets the right pages in front of the people already looking, and tunes the ads that fill the gap.",
    photo_url: "",
    sort_order: 4,
    published: true
  }
];

export const seedProjects: Project[] = [
  {
    id: "seed-restro",
    name: "RestroManage",
    slug: "restromanage",
    url: "https://restromanage.com",
    summary: "Restaurant operations on the phones and tablets a venue already owns. No POS terminal to buy.",
    features: [
      "Point of sale for dine-in, takeaway, and the counter",
      "Online ordering and a branded storefront",
      "QR ordering at the table, straight to the kitchen",
      "Floor plan, reservations, and reminders",
      "Kitchen display in place of paper tickets",
      "Inventory, staff attendance, and multi-location menus",
      "Live sales reporting",
      "Accounting sync for the books the venue already uses"
    ].join("\n"),
    services: "Product, full stack, SEO",
    image_url: "/work/restromanage.jpg",
    image_alt:
      "RestroManage homepage: restaurant interior behind a tablet showing a floor plan, new order for table 7, and ticket list",
    sort_order: 1,
    published: true
  },
  {
    id: "seed-vakeel",
    name: "Vakeel Diary",
    slug: "vakeel-diary",
    url: "https://vakeeldiary.com",
    summary: "Practice management for Pakistani advocates. Cases, hearings, and fees in one place instead of a paper diary.",
    features: [
      "Case and matter history",
      "Hearing dates, deadlines, and reminders",
      "Client records and documents",
      "PKR billing, payments, and invoices",
      "Roles for a solo chamber or a small firm"
    ].join("\n"),
    services: "Product, full stack, design",
    image_url: "/work/vakeel-diary.jpg",
    image_alt:
      "Vakeel Diary homepage: laptop on a desk showing a dark dashboard with hearing calendar, matters, and PKR invoices",
    sort_order: 2,
    published: true
  },
  {
    id: "seed-uni",
    name: "UniMondo",
    slug: "unimondo",
    url: "https://unimondo.uk",
    summary: "A study-in-Europe consultancy, from the first call through admissions and visa-ready departure.",
    features: [
      "Country and university shortlists",
      "Program pages with deadlines and tuition bands",
      "A staged application journey a student can follow",
      "Intake that carries GPA and IELTS into the file",
      "Counselor-led pages instead of a generic brochure"
    ].join("\n"),
    services: "Web, design, marketing",
    image_url: "/work/unimondo.jpg",
    image_alt:
      "UniMondo homepage: university courtyard photo under the headline Your future knows no borders and a Get Started button",
    sort_order: 3,
    published: true
  },
  {
    id: "seed-usa",
    name: "USA Peptide Depot",
    slug: "usa-peptide-depot",
    url: "https://usapeptidedepot.com",
    summary: "A research-catalogue storefront with lot paperwork, domestic shipping, and a checkout that stays in its lane.",
    features: [
      "Product catalogue with lot-specific documentation",
      "Research-use notices kept visible",
      "US fulfillment, tracking, and a free-shipping threshold",
      "A reconstitution calculator for laboratory volumes",
      "Account, order, and support paths"
    ].join("\n"),
    services: "Web, full stack, SEO",
    image_url: "/work/usa-peptide-depot.jpg",
    image_alt:
      "USA Peptide Depot homepage: Research catalogue. Domestic shipping. headline beside a cluster of frosted vials",
    sort_order: 4,
    published: true
  },
  {
    id: "seed-cr",
    name: "Peptide Costa Rica",
    slug: "peptide-costa-rica",
    url: "https://peptidecostarica.net",
    summary: "A regional storefront for the same kind of catalogue, written and shipped for Costa Rica.",
    features: [
      "Local catalogue and product pages",
      "Checkout and shipping for that market",
      "Brand and page structure separate from the US store"
    ].join("\n"),
    services: "Web, design",
    image_url: "/work/peptide-costa-rica.jpg",
    image_alt:
      "Peptide Costa Rica homepage: tropical hillside building over water with the headline A catalogue written for Costa Rica",
    sort_order: 5,
    published: true
  },
  {
    id: "seed-bb",
    name: "Battle Born Peptide",
    slug: "battle-born",
    url: "https://battlebornpeptide.com",
    summary: "Another branded catalogue and checkout, with its own name, offer, and product pages.",
    features: [
      "Brand-specific storefront",
      "Product pages and checkout",
      "Structure ready for ads and search"
    ].join("\n"),
    services: "Web, marketing",
    image_url: "/work/battle-born.jpg",
    image_alt:
      "Battle Born Peptide homepage: desert dusk landscape with a black pump bottle and the headline Built for the high desert",
    sort_order: 6,
    published: true
  }
];

export const seedOffers: Offer[] = [
  {
    id: "seed-offer-concept",
    name: "Concept to launch",
    summary: "For a business that is still an idea. We leave you with an offer, a product or site, and a way to take the first customers.",
    points: ["Scope and offer", "Name, pages, and brand", "Build through a usable launch", "A short plan for the first leads"].join("\n"),
    sort_order: 1,
    published: true
  },
  {
    id: "seed-offer-product",
    name: "Product build",
    summary: "A working system: accounts, the daily workflow, and the screens a team will still open in six months.",
    points: ["Full-stack product", "Roles and permissions", "Billing or operations built in", "Handover the team can run"].join("\n"),
    sort_order: 2,
    published: true
  },
  {
    id: "seed-offer-growth",
    name: "Growth desk",
    summary: "After the product exists. Search, Meta ads, and a cleaned list of businesses to contact.",
    points: ["SEO on the pages that can rank", "Meta campaigns and the creative around them", "Lead lists from public business pages", "A monthly read on what to change"].join("\n"),
    sort_order: 3,
    published: true
  },
  {
    id: "seed-offer-auto",
    name: "Automation",
    summary: "The work that should not need a person every time: follow-ups, handoffs, reports, and the tools talking to each other.",
    points: ["Map the repeated steps", "Connect the tools you already pay for", "A quiet system instead of another spreadsheet"].join("\n"),
    sort_order: 4,
    published: true
  }
];

export const seedPosts: Post[] = [
  {
    id: "seed-post-concept",
    title: "A concept is not a business yet",
    slug: "concept-is-not-a-business",
    excerpt: "The gap is the unglamorous middle: an offer someone can pay for, a place to pay it, and a person who follows up.",
    body: `Most ideas arrive as a name and a feeling. A business starts when a specific person can understand the offer, pay for it, and get the thing without the founder sitting in the middle of every step.

That is the work we take from the first conversation. What is being sold. Who it is for. What has to exist on the first day, and what can wait. Then the product or the site, the pages people will actually find, and the follow-up that happens when you are not at the desk.

RestroManage did not start as a homepage. It started as the Friday-night problem in a kitchen. Vakeel Diary started as a paper diary and a missed hearing. The site came after the workflow was real.

If you are earlier than that, say so. We would rather scope a smaller first version than pretend a logo is a company.`,
    published: true,
    created_at: "2026-03-12T00:00:00.000Z"
  },
  {
    id: "seed-post-leads",
    title: "What a lead list is for",
    slug: "what-a-lead-list-is-for",
    excerpt: "A list of public emails is not a campaign. It is the raw material for one, and only if you say who you are.",
    body: `We collect business details that a company has already published: the address on the contact page, the WhatsApp link in the footer, the name next to “owner” on the about page. We do not open private accounts, and we do not invent a person who is not on the site.

The list is useful when it is tied to an offer. Plumbers in one city, for a product those plumbers can use. Clinics, for a booking system. The spreadsheet by itself does not sell anything.

When we email from that list, the message carries our name, a reply address, a postal address, and a way to say stop. Anything else is how a mailbox gets shut down, and how a brand gets a reputation it did not want.

Inside the studio dashboard, the Leads tab is that tool for UX4U. Paste sites, read the public pages, keep the rows, export them.`,
    published: true,
    created_at: "2026-04-02T00:00:00.000Z"
  },
  {
    id: "seed-post-operate",
    title: "Launch is the start of the operating work",
    slug: "launch-is-the-start",
    excerpt: "The week after go-live is when a product either becomes a habit or becomes a folder.",
    body: `A launch day feels finished. The next morning someone still has to take the order, update the case, answer the ad lead, and notice that stock is low.

We stay for that part. Automations for the repeated handoff. A dashboard the owner will actually open. Search and ads once there is a page worth sending people to. The team here covers that spread on purpose: product, automation, design, and the campaigns.

If you already have a product and the messy middle is the problem, start there. You do not need a new brand to make the current one run.`,
    published: true,
    created_at: "2026-05-20T00:00:00.000Z"
  }
];

export function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function hostLabel(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
