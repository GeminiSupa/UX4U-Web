# UX4U: SEO and Design Fix Instructions (for Cursor / Antigravity)

Place this file in the repo root and tell the agent: "Follow UX4U_CURSOR_FIX_INSTRUCTIONS.md, task by task."

Audit date: 5 Oct 2026. Every "Observed" line was seen on the live site (home, /work, /blog, /blog/launch-is-the-start, /contact, /dashboard, /robots.txt, /sitemap.xml). Observed text is rendered HTML, so the source code may build it from variables: search for a distinctive fragment, not the whole string.

---

## 0. Rules for the agent

1. Before anything: read `package.json` and list `app/` (or `pages/`). These instructions assume Next.js App Router with TypeScript. If the project uses the Pages Router or plain JS, keep the exact strings and behavior and adapt the syntax. If `tsconfig.json` has no `@/*` alias, use relative imports.
2. Do one task at a time, in order. After each task run `npm run build`; if it passes, commit with the message `seo: <task id> <title>`.
3. Change only what a task lists. Do not restyle, rename routes, or rewrite copy that is not listed.
4. Never invent facts: no client quotes, metrics, awards, phone numbers, street addresses, social URLs, author names, dates or testimonials. Where a task says OWNER INPUT and the value is missing, skip that part, leave a `// TODO(owner): ...` comment, and list it in the final report.
5. Final report, per task: files changed, done / skipped, and what is blocked on the owner.

---

## 1. Owner inputs (the owner answers these; the agent asks if they are missing)

| # | Input | Needed by |
| --- | --- | --- |
| 1 | Which domain serves this app in production: `ux4u.online` (must be pointed at this Vercel project and show this site) or `ux4u.vercel.app` for now | T01 to T08 |
| 2 | Real author (one of the four team members) and publish date for each of the 3 journal posts | T19 |
| 3 | A response-time promise that is true, for example "within one working day", or "none" | T15 |
| 4 | A phone or WhatsApp number to publish, or "none" | T15 |
| 5 | Public profile URLs: LinkedIn, GitHub, X, Google Business Profile (any that exist) | T08 |
| 6 | Per project: one verified result (number, date, how measured), a client quote with name and role and permission, or "confidential" | T17 |
| 7 | Team photos and profile links, or "none yet" | T16 |
| 8 | Keep the three peptide projects in the first three positions, or move them after the others (default in T14: move them after) | T14 |

---

## 2. Decisions that override the earlier ChatGPT audit

- **Dashboard:** the earlier audit says to use both a robots.txt Disallow and noindex. Do not. A crawler blocked by robots.txt never sees the noindex tag. Use noindex, remove the public link, keep authentication. No `Disallow` for `/dashboard`.
- **Sitemap:** list only URLs that return 200 today. The earlier sample lists `/services/*` and `/about`, which do not exist yet. Add each path in the same commit that creates its page.
- **No `lastModified: new Date()`** in the sitemap. It claims every page changed on every build. Omit `lastModified`.
- **Keep the H1** `From a concept to a business that runs.` Do not reword it.
- **Layout must not set a canonical.** A canonical set in `layout.tsx` is inherited by every page that forgets its own and would point all of them at the homepage. Canonicals are set per page only.
- Ignore the "8.5+ target" scores and the 90-day plan. They are not tasks.

---

## 3. Tasks

Types: CONFIG (settings), CODE (new code), COPY (exact text edit), PAGE (new route).

### Group A: Foundations

#### T01 [P0, CONFIG + CODE] One production domain

**Observed:** every page has `og:url` = `https://ux4u.online` while the pages are served from `https://ux4u.vercel.app`. A search snippet suggests `ux4u.online` may currently serve an older, different site.

**Owner prerequisite (not code):** Vercel, Project, Settings, Domains: add `ux4u.online` and set it as primary. Open `https://ux4u.online/` and confirm the title is `UX4U — From concept to a business that runs`. If it is not, stop and tell the owner; do not run T02 to T08 against that domain.

**Create `lib/site.ts`:**

```ts
// Must be the domain that actually serves this app in production.
export const SITE_URL = 'https://ux4u.online'
export const SITE_NAME = 'UX4U'
// OWNER INPUT #5: real profile URLs only (LinkedIn, GitHub, X). Leave empty if none.
export const SOCIAL_PROFILES: string[] = []
```

If owner input #1 says `ux4u.vercel.app`, set `SITE_URL = 'https://ux4u.vercel.app'` and skip the redirect below.

**Add to `next.config.js` / `.mjs` / `.ts`** (merge into the existing config and any existing `redirects()`), only after `ux4u.online` serves this app:

```js
async redirects() {
  return [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'ux4u.vercel.app' }],
      destination: 'https://ux4u.online/:path*',
      permanent: true,
    },
  ]
},
```

**Verify:** `curl -sI https://ux4u.vercel.app/work` returns `308` and `location: https://ux4u.online/work`.

**After deploy (owner):** add `ux4u.online` as a property in Google Search Console and submit `https://ux4u.online/sitemap.xml` (T03).

---

#### T02 [P0, CODE] robots.txt

**Observed:** `/robots.txt` returns 404.

**Create `app/robots.ts`:**

```ts
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
```

Do not add `Disallow: /dashboard` (see section 2). Delete any `public/robots.txt` if one appears, so there is a single source.

**Verify:** `curl -s <SITE_URL>/robots.txt` shows `User-Agent: *`, `Allow: /` and a `Sitemap:` line.

---

#### T03 [P0, CODE] sitemap.xml

**Observed:** `/sitemap.xml` returns 404.

**Create `app/sitemap.ts`.** If the posts come from a data file, MDX or CMS, map over that list instead of hardcoding the three slugs.

```ts
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Only list URLs that return 200 today. Add a path in the same commit that creates its page.
const paths = [
  '/',
  '/work',
  '/blog',
  '/contact',
  '/blog/launch-is-the-start',
  '/blog/what-a-lead-list-is-for',
  '/blog/concept-is-not-a-business',
]

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
  }))
}
```

Never add `/dashboard`, `/dashboard/login` or `/api/*`.

**Verify:** `curl -s <SITE_URL>/sitemap.xml` lists 7 URLs, all on `SITE_URL`.

---

#### T04 [P0, COPY + CODE] Site-wide metadata in `app/layout.tsx`

**Observed (home):**
- title: `UX4U — From concept to a business that runs`
- description: `UX4U builds the product, the site, the search, the ads, and the automations. Software development, SEO, lead generation, and marketing.`
- `og:title` and `twitter:title`: `UX4U`
- `og:description` and `twitter:description`: `From a concept to a business that is actually running.`
- `og:url`: `https://ux4u.online` on every page
- `twitter:card`: `summary`; no `og:image`

**Locate:** `grep -rn "From concept to a business that runs" app lib components` and `grep -rn "og:url\|openGraph" app lib components`.

**Remove:** the whole existing `metadata` export (or `<Head>` / `<meta>` tags) holding those values, including any hardcoded `og:url`.

**Replace with** (in `app/layout.tsx`):

```ts
import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'UX4U | Software and Growth Studio in Islamabad',
    template: '%s | UX4U',
  },
  description:
    'UX4U is an Islamabad studio that builds your product and website, then runs the search, ads and automations that bring in customers.',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'UX4U | Software and Growth Studio in Islamabad',
    description:
      'From a concept to a business that runs. Product software, web development, SEO, lead generation and automation from Islamabad.',
  },
  twitter: { card: 'summary_large_image' },
}
```

Do **not** set `alternates` or `openGraph.url` here (section 2). Do **not** set `openGraph.images` manually (T07 handles images).

**Homepage `app/page.tsx`:** add

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'UX4U',
    title: 'UX4U | Software and Growth Studio in Islamabad',
    description:
      'From a concept to a business that runs. Product software, web development, SEO, lead generation and automation from Islamabad.',
    url: '/',
  },
}
```

(A page's `openGraph` replaces the layout's one completely, which is why `siteName` and `type` are repeated.)

**Verify:** the home HTML has exactly one `<title>` = `UX4U | Software and Growth Studio in Islamabad`, one canonical = `<SITE_URL>/`, and `og:url` = `<SITE_URL>/`.

---

#### T05 [P1, CODE + COPY] Per-page metadata helper and the three index pages

**Observed:** `/work`, `/blog` and every blog post reuse the homepage description and `og:title` = `UX4U`. `/contact` has no description and no Open Graph tags. Page titles are `Work — UX4U`, `Journal — UX4U`, `Contact — UX4U` (hardcoded with the suffix).

**Create `lib/seo.ts`:**

```ts
import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/site'

type PageMetaInput = {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
  noindex?: boolean
}

export function pageMeta({ title, description, path, type = 'website', noindex }: PageMetaInput): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`
  return {
    title, // layout title.template appends " | UX4U"
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE_NAME, title: fullTitle, description, url: path },
    twitter: { card: 'summary_large_image', title: fullTitle, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  }
}
```

**Locate:** `grep -rn "Work — UX4U\|Journal — UX4U\|Contact — UX4U" app`. **Remove** each old `title` / `metadata` for these pages. **Replace with:**

`/work` (`app/work/page.tsx`):

```ts
export const metadata = pageMeta({
  title: 'Work: Products and Sites We Have Taken to Market',
  description:
    'Six live products and sites built or grown by UX4U: restaurant software, a legal practice app, a study-abroad consultancy and online stores.',
  path: '/work',
})
```

`/blog` (`app/blog/page.tsx`):

```ts
export const metadata = pageMeta({
  title: 'Journal: How We Think About the Work',
  description:
    'Short notes from the UX4U studio on launching products, building lead lists and turning a concept into a business that runs.',
  path: '/blog',
})
```

`/contact` (`app/contact/page.tsx`):

```ts
export const metadata = pageMeta({
  title: 'Start a Project',
  description:
    'Tell UX4U what you are building. Share a concept, a half-built product, or a business that needs search, ads and automation. We reply from info@ux4u.online.',
  path: '/contact',
})
```

(`/contact` may be a client component because of the form. If so, move the `metadata` export into a server `app/contact/layout.tsx` that renders `{children}`.)

**Verify:** each of the four public pages has a different title, description, canonical and `og:url`.

---

#### T06 [P1, CODE + COPY] Blog post metadata

**Observed:** post title `Launch is the start of the operating work — UX4U`; description and `og:title` copied from the homepage.

**Locate:** `app/blog/[slug]/page.tsx` (or wherever posts render). **Remove** the hardcoded `— UX4U` title suffix and any static `metadata`. **Replace with** `generateMetadata`. If posts live in a data file or CMS, add a `description` field there with the values below and read it; otherwise use this map:

```ts
import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'

const POSTS: Record<string, { title: string; description: string }> = {
  'launch-is-the-start': {
    title: 'Launch is the start of the operating work',
    description:
      'The week after go-live decides whether a product becomes a daily habit or a forgotten folder. What we do after launch to keep it running.',
  },
  'what-a-lead-list-is-for': {
    title: 'What a lead list is for',
    description:
      'A list of public emails is not a campaign. It is the raw material for one, and only if you say who you are. How we build and use lead lists.',
  },
  'concept-is-not-a-business': {
    title: 'A concept is not a business yet',
    description:
      'A concept is not a business yet. The gap is an offer someone can pay for, a place to pay it, and a person who follows up.',
  },
}

// Next.js 15: params is a Promise. Use `{ params }: { params: Promise<{ slug: string }> }` and `const { slug } = await params`.
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = POSTS[params.slug]
  if (!post) return {}
  return pageMeta({
    title: post.title,
    description: post.description,
    path: `/blog/${params.slug}`,
    type: 'article',
  })
}
```

**Verify:** the three posts have three different descriptions, none equal to the homepage description.

---

#### T07 [P1, CODE] Share image (Open Graph and Twitter)

**Observed:** no `og:image` on any page; `twitter:card` = `summary`.

**Create `app/opengraph-image.tsx`** (Next.js 14+; on 13.x import `ImageResponse` from `next/server`). Use the site's existing background and text colors from `globals.css` in place of the placeholders below.

```tsx
import { ImageResponse } from 'next/og'

export const alt = 'UX4U: software and growth studio in Islamabad'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#0b0b0c', // replace with the site's background color
          color: '#ffffff', // replace with the site's text color
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.7 }}>UX4U · Software and growth studio · Islamabad</div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>
          From a concept to a business that runs.
        </div>
      </div>
    ),
    size,
  )
}
```

**Create `app/twitter-image.tsx`** as a copy of the same file (duplicate it; do not re-export).

**Remove** any manual `images: [...]` entries in metadata (for example `/og-default.png`).

**Verify:** `curl -s <SITE_URL>/ | grep -o '<meta property="og:image"[^>]*>'` returns a URL, and that URL returns a 1200x630 PNG.

---

#### T08 [P1, CODE] Organization and WebSite structured data

**Observed:** no structured data on any page.

**Create `components/JsonLd.tsx`:**

```tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
```

**In `app/layout.tsx`, inside `<body>` before `{children}`:**

```tsx
import { JsonLd } from '@/components/JsonLd'
import { SITE_URL, SOCIAL_PROFILES } from '@/lib/site'

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'UX4U',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: 'info@ux4u.online',
  address: { '@type': 'PostalAddress', addressLocality: 'Islamabad', addressCountry: 'PK' },
  ...(SOCIAL_PROFILES.length ? { sameAs: SOCIAL_PROFILES } : {}),
}

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'UX4U',
  url: SITE_URL,
}

// in JSX:
// <JsonLd data={organization} />
// <JsonLd data={website} />
```

Do not add `telephone`, a street address, ratings or reviews unless the owner supplies real ones.

**Verify:** paste the homepage URL into Google's Rich Results Test or the Schema.org validator; no errors.

---

#### T09 [P1, CODE + COPY] Dashboard: remove public link, add noindex

**Observed:** every page footer has a link `Studio desk` to `/dashboard`, which redirects anonymous visitors to `/dashboard/login` (login page title is the homepage title).

**Locate:** `grep -rn "Studio desk\|/dashboard" app components`.

**Remove:** the footer element that renders the text `Studio desk` and its link to `/dashboard`. Keep the route itself.

**Add `app/dashboard/layout.tsx`** (server component; if a dashboard layout already exists and is a client component, create a server wrapper above it):

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Studio desk',
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

**Check (do not change unless it fails):** anonymous requests to `/dashboard/*` and to every API route the dashboard uses must be rejected server-side. `grep -rn "app/api" -l` and confirm each handler checks the session.

**Verify:** no public page HTML contains `/dashboard`; `/dashboard/login` HTML contains `noindex`.

---

#### T10 [P1, CODE] Hardcoded Vercel hostname sweep

**Observed:** in my fetch, internal links and image URLs appeared as `https://ux4u.vercel.app/...`. That may only be how the fetch tool resolved relative paths, so this task is a check, not a known defect.

**Run:** `grep -rn "ux4u.vercel.app" app components lib public content 2>/dev/null`.

- **Found hardcoded:** replace each internal link with a relative path (`https://ux4u.vercel.app/work` becomes `/work`, `https://ux4u.vercel.app/logo.png` becomes `/logo.png`). If an absolute URL is genuinely needed, use `SITE_URL` from `lib/site.ts`.
- **Nothing found:** do nothing and report "no hardcoded Vercel host".

**Verify:** `curl -s <SITE_URL>/ | grep -c "ux4u.vercel.app"` returns `0`.

---

### Group B: Edits on existing pages

#### T11 [P1, COPY] Hero: descriptor and one primary CTA

**Observed hero:** eyebrow `Islamabad studio`; H1 `From a concept to a business that runs.`; two equal CTAs `Tell us what you are building` (to `/contact`) and `See the work` (to `/work`).

**Locate:** `grep -rn "Islamabad studio\|See the work" app components`.

- **Find** `Islamabad studio` (hero eyebrow only). **Replace with** `Software and growth studio · Islamabad`.
- **Do not change** the H1 or the paragraph under it.
- **CTA hierarchy:** keep `Tell us what you are building` as the only filled/button-styled element in the hero. Change `See the work` from a button to a text link (no fill, no border, underline on hover) using the project's existing text-link style. Same label, same `/work` target.

**Verify:** the hero contains exactly one button-styled element.

---

#### T12 [P2, COPY] Header navigation

**Observed header:** `Work`, `Journal`, `Contact`, `Start a project`. `Contact` and `Start a project` both go to `/contact`.

**Locate:** `grep -rn "Start a project" app components`.

- **Remove** the `Contact` text item from the header (desktop and the mobile `Menu`).
- **Result:** `Work · Journal · [Start a project]`. Keep the logo link to `/`.
- When service pages go live (T18), add `Services` (to `/services`) before `Work`.

---

#### T13 [P1, COPY] Footer

**Observed footer:** logo, tagline `Software, search, marketing, and the operations that keep a business running after the launch.`, `info@ux4u.online`, `Studio desk`.

- **Remove** `Studio desk` (done in T09).
- **Keep** the logo, the tagline and the email unchanged.
- **Add** a row of plain links: `Work`, `Journal`, `Contact` (to `/work`, `/blog`, `/contact`), and the text `Islamabad, Pakistan`.
- If `SOCIAL_PROFILES` in `lib/site.ts` is non-empty, add them as links; otherwise add nothing.

---

#### T14 [P1, COPY + CODE] Work: order, link behavior, alt text

**Observed (`/work`):** order is 01 RestroManage, 02 UniMondo, 03 USA Peptide Depot, 04 Peptide Costa Rica, 05 Vakeel Diary, 06 Battle Born Peptide. The homepage "Selected work" shows RestroManage, UniMondo, USA Peptide Depot. Cards link straight to the client sites. Image alt texts are `<Name> homepage`.

**Locate:** `grep -rn "RestroManage" app components lib`.

1. **Order (owner input #8; default shown).** In the projects data array, reorder to: `restromanage`, `vakeel-diary`, `unimondo`, `usa-peptide-depot`, `peptide-costa-rica`, `battle-born`. Renumber the displayed `01` to `06` to match. The homepage "Selected work" must show the first three of this order: RestroManage, Vakeel Diary, UniMondo.
2. **External links.** Add `target="_blank" rel="noopener noreferrer"` to the links for `restromanage.com`, `unimondo.uk`, `usapeptidedepot.com`, `peptidecostarica.net`, `vakeeldiary.com`, `battlebornpeptide.com`. (T17 later replaces these card links with internal case-study links.)
3. **Alt text.** Open each image: `public/work/restromanage.jpg`, `unimondo.jpg`, `usa-peptide-depot.jpg`, `peptide-costa-rica.jpg`, `vakeel-diary.jpg`, `battle-born.jpg`. Replace the alt `<Name> homepage` with `<Name> homepage: <one sentence describing what the screenshot visibly shows>`. Describe only what you can see in the file. Make sure each image has width and height (or `fill` with a sized parent) so the layout does not jump while loading.

---

#### T15 [P1, COPY] Contact page expectations

**Observed:** H1 `Tell us where you are.`; paragraph `A concept, a half-built product, or a business that needs search, ads, and a cleaner operation. Write what you have. We reply from info@ux4u.online.`; fields Name, Email, Company, `What do you need*` (Concept to launch, Product build, Web development, SEO, Lead generation, Marketing and Meta ads, Business automation), The situation, `Send`. No response time, no booking, no phone, no related work.

**Do not change** the H1, the paragraph or the fields.

1. **Response time (owner input #3).** If the owner confirmed one, add a line directly after the paragraph, exact text: `We reply within one working day.` (use the owner's wording). If not confirmed, skip.
2. **Submit states.** Confirm the form shows a visible success message and a visible error message. If the success state is missing or silent, show: `Thanks. We have your message and will reply from info@ux4u.online.` (append the response-time line only if step 1 applies).
3. **Related work.** Under the form add: `See related work:` followed by links `RestroManage`, `Vakeel Diary`, `UniMondo` to `/work` (change to `/work/restromanage`, `/work/vakeel-diary`, `/work/unimondo` after T17).
4. **Phone / WhatsApp (owner input #4).** If provided, add under the email: `WhatsApp: <number>` linking to `https://wa.me/<digits only>`. If none, skip.

---

#### T16 [P2, COPY + CODE] Team section

**Observed (homepage "The desk"):** four text-only entries: Omer Farooq (CEO, full-stack developer), Muhammad Maaz Akram (AI automation engineer), Muhammad Abu Bakar Siddique (Design and marketing), Muhammad Ali (SEO, Meta ads, marketing). The initials circle `O`, `M`, `M`, `M` stands in for photos.

**Do not change** names, roles or descriptions.

- Add optional `photo?: string` and `profileUrl?: string` to each team entry's data. Render the photo (alt = `<Name>, <role>`) and a profile link only when the value exists. Fill them only from owner input #7. If none supplied, leave the initials and report "skipped, no input".

---

### Group C: New pages and content

#### T17 [P0, PAGE] Case-study pages

**Observed:** `/work` is one list. Each project has only a summary, a feature list and an outbound link. No results, no per-project URL.

**Create** `app/work/[slug]/page.tsx` with `generateStaticParams` over the existing projects array. Slugs: `restromanage`, `unimondo`, `usa-peptide-depot`, `peptide-costa-rica`, `vakeel-diary`, `battle-born`. Reuse the existing data (name, domain, tags, summary, feature bullets). Add these optional fields to each project (OWNER INPUT #6), rendered only when present:

```ts
challenge?: string
result?: { metric: string; date: string; method: string } | 'confidential'
quote?: { text: string; name: string; role: string }
```

**Page layout, top to bottom:**
1. Breadcrumb: `Work / <Name>`
2. Tags (existing, e.g. `Product, full stack, SEO`)
3. H1: `<Name>`
4. Summary paragraph (existing summary text)
5. `What we built`: the existing feature bullets
6. `The problem`: only if `challenge` exists
7. `Result`: only if `result` exists. If `'confidential'`: `Results are confidential at the client's request.`
8. Client quote: only if `quote` exists, with name and role
9. Secondary link: `Visit <domain>` with `target="_blank" rel="noopener noreferrer"`
10. `Related services` links (after T18) and the button `Talk about a similar project` to `/contact`

**Metadata:** `pageMeta({ title: '<Name> Case Study', description: '<Name>: <summary> Built by UX4U (<tags>).' (trim to 155 characters), path: '/work/<slug>' })`.

**Structured data:** BreadcrumbList JSON-LD (`Work` to `/work`, then `<Name>`).

**Index control:** a project page with neither `challenge` nor `result` is thin. For those, pass `noindex: true` to `pageMeta` and leave the slug out of `app/sitemap.ts`. Add the slug to the sitemap, and drop `noindex`, in the same commit that supplies its `challenge` or `result`.

**Links:** on `/work` and the homepage "Selected work", change each card link from the external site to `/work/<slug>`. Remove the `target="_blank"` added in T14 for those cards.

**Do not** invent a challenge, result, quote or number.

---

#### T18 [P0, PAGE] Service pages

**Observed:** the site sells six things but has no page per service. Source text for each is on the homepage ("Ways to start") and `/work`.

**Create:**
- `app/services/page.tsx` (hub): title `Services`, description `Product development, web development, SEO, lead generation, Meta ads and business automation from one studio in Islamabad.`, path `/services`. It lists only the service pages that are live.
- `app/services/[slug]/page.tsx` driven by a `lib/services.ts` array with the entries below.

**Page layout:** H1, 2 to 3 sentence intro, `What you get` bullets, `Related work` cards linking to `/work/<slug>`, optional related journal post, button `Start a project` to `/contact`.

| Slug | `<title>` (before ` \| UX4U`) | Meta description | H1 | Intro (draft, from existing site copy) | What you get (from existing site copy) | Related work |
| --- | --- | --- | --- | --- | --- | --- |
| `product-development` | Custom Product Development for Startups | UX4U builds full-stack products with accounts, roles, billing and a handover your team can run. Based in Islamabad. | Product development: from a concept to a working system | Most products stall between an idea and something a team opens every day. We scope the offer, build the product, and hand over a system your team can run. | Scope and offer; Name, pages, and brand; Build through a usable launch; Full-stack product; Roles and permissions; Billing or operations built in; Handover a team can run | `restromanage`, `vakeel-diary` |
| `web-development` | Web Development Company in Islamabad | UX4U designs and builds websites and storefronts that are structured for search and ready for ads. See live projects. | Websites and storefronts built to be found | We build the pages, the brand and the checkout together, so the site is ready for search and ads on day one. | Pages and brand; Product or program pages; Account, order and support paths; Structure ready for ads and search | `unimondo`, `usa-peptide-depot`, `peptide-costa-rica`, `battle-born` |
| `seo` | SEO Services in Islamabad and Pakistan | SEO on pages that can rank, plus a monthly read on what to change. Technical fixes, page structure and content from UX4U. | SEO for pages that can actually rank | Search only works when the pages exist and can be found. We fix the structure first, then build the pages worth ranking. | SEO on pages that can rank; A monthly read on what to change | `restromanage`, `usa-peptide-depot` |
| `meta-ads` | Meta Ads Management | UX4U runs Meta campaigns and builds the creative around them, pointed at an offer and a page that can convert. | Meta ads built around your offer | We build campaigns and creative around one offer, then tune them against what the leads do. | Meta campaigns and creative around them; A monthly read on what to change | `unimondo` |
| `lead-generation` | B2B Lead Generation Services | A cleaned list of businesses to contact, built from public business pages, with outreach that says who you are. | Lead lists that become campaigns | A list of public emails is not a campaign. It is the raw material for one, and only if you say who you are. | A cleaned list of businesses to contact, built from public business pages; A monthly read on what to change | none (see hold rule) |
| `business-automation` | Business Process Automation Services | UX4U connects the tools you already pay for and removes repeated manual steps: follow-ups, handoffs and reports. | Automation that removes repeated handoffs | Work that should not need a person every time: follow-ups, handoffs, reports and tools talking to one another. | Map repeated steps; Connect tools you already pay for; A quiet system instead of one more spreadsheet | none (see hold rule) |

**Related journal post:** `lead-generation` links to `/blog/what-a-lead-list-is-for`; `product-development` links to `/blog/concept-is-not-a-business`; `business-automation` and `web-development` link to `/blog/launch-is-the-start`.

**Hold rule:** a service page with no related work (`lead-generation`, `business-automation`) ships with `noindex: true`, is left out of the sitemap and the hub list, until the owner supplies one real example or a written process for it. A service page needs at least one related project or one owner-written paragraph of substance before it is indexed.

**Per live page:** add its path to `app/sitemap.ts`; use `pageMeta` for metadata; add `Service` JSON-LD (`name`, `provider` = the Organization from T08, `areaServed` omitted unless the owner states markets). After the first service page is live, add `Services` to the header (T12) and the footer (T13).

---

#### T19 [P1, COPY + CONTENT] Journal: byline, date, depth, links

**Observed:** three posts of roughly 100 words each, no author, no date. Slugs: `launch-is-the-start`, `what-a-lead-list-is-for`, `concept-is-not-a-business`.

**Do:**
1. **Byline (owner input #2).** Show `By <Author> · <Date>` under each post title and in the journal index, with `<time dateTime="YYYY-MM-DD">`. Skip if the owner has not supplied them. Never use a made-up author or date.
2. **Related links.** End each post with two links: one service page (T18) and one case study (T17), as in the mapping in T18. Use descriptive link text, not "read more".
3. **Expand the posts only with real material from the owner.** Add these sections to each; the owner supplies the substance (examples from RestroManage, Vakeel Diary, UniMondo). Do not pad with generic text.
   - `launch-is-the-start`: what breaks in the first week (orders, case updates, ad leads, low stock); a launch-week checklist; what the owner's dashboard should show on day one; when to bring in search and ads.
   - `what-a-lead-list-is-for`: which public business pages a list is built from; how it is cleaned (duplicates, dead emails, wrong category); what the first message must say about who you are; what not to do; how replies are measured.
   - `concept-is-not-a-business`: one section each for the three gaps (an offer someone can pay for, a place to pay it, a person who follows up), each with a portfolio example; what must exist on day one.
4. **Article JSON-LD** (only when author and date exist): `Article` with `headline`, `author`, `datePublished`, `mainEntityOfPage` = the post URL.

---

## 4. Verification script (run after deploy, or against `http://localhost:3000` with `BASE` changed)

```bash
BASE=https://ux4u.online

echo "== robots"; curl -s -o /dev/null -w "%{http_code}\n" $BASE/robots.txt
echo "== sitemap"; curl -s $BASE/sitemap.xml | grep -o "<loc>[^<]*</loc>"

for p in "" /work /blog /contact /blog/launch-is-the-start; do
  echo "== $BASE$p"
  curl -s "$BASE$p" | grep -oE '<title>[^<]*</title>|<meta name="description" content="[^"]*"|<link rel="canonical" href="[^"]*"|<meta property="og:url" content="[^"]*"|<meta property="og:image" content="[^"]*"|<meta name="robots" content="[^"]*"'
done

echo "== vercel host leaks (expect 0)"; curl -s $BASE/ | grep -c "ux4u.vercel.app"
echo "== dashboard link on public pages (expect 0)"; curl -s $BASE/ | grep -c 'href="/dashboard'
echo "== dashboard noindex"; curl -s $BASE/dashboard/login | grep -o '<meta name="robots" content="[^"]*"'
echo "== old host redirect"; curl -sI https://ux4u.vercel.app/work | grep -iE "^HTTP|^location"
```

**Pass conditions:**
- robots returns `200`; the sitemap lists only URLs that return `200`.
- Every public page has a different title, description and canonical; each `og:url` equals its own page URL on `SITE_URL`.
- Every public page has an `og:image`.
- No `ux4u.vercel.app` in the HTML; no `/dashboard` link on public pages; `/dashboard/login` has `noindex`.
- `https://ux4u.vercel.app/work` returns `308` with a `location` on `ux4u.online`.

---

## 5. Do not touch

- Homepage H1, the paragraph under it, and the four-step section (Concept, Build, Acquire, Operate) and their copy.
- The "Ways to start" cards and their bullets.
- Contact form fields, labels and the service options list.
- Team names, roles and descriptions.
- Logo files (`/logo.png`, `/logo-on-dark.png`).
