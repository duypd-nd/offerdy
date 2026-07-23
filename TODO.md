# Offerdy — TODO

## Done ✅
- Maintenance pass (2026-07-23): upgraded 9 dependency groups to latest (Next 16.2.9→16.2.11, React 19.2.4→19.2.8, Sanity 6.2→6.6, Sentry, Tailwind, Anthropic SDK, `@types/node` 20→24); migrated the deprecated `middleware` convention to `proxy` (`src/middleware.ts` → `src/proxy.ts` via the official codemod, Basic Auth verified still returning 401 on production `/admin` and `/api/import`); pinned Node to `24.x` via `engines`; stopped `/comparisons` from being indexed while empty. ESLint 10 + TypeScript 7 tested and rejected — see "Tech debt / Infra"
- AI Review Writer (2026-07-10→11): dan link san pham trong `/admin/reviews` (Them moi lan Chinh sua) → AI viet bai review tieng Anh day du (excerpt/content/FAQ/prosAndCons/so sao/gradient), anh + CTA gan link affiliate, retry tu dong khi AI qua tai/loi validate, trang chu chi hien 2 hang review — xem `PROJECT_CONTEXT.md` → "AI Engines"
- Homepage, Deals, Stores, Categories, Reviews, Blog pages
- About page (SEO/GEO optimised, Sanity-connected admin form)
- Contact page (Formspree, FAQ accordion, Sanity admin)
- Submit a Deal page (Formspree, Sanity admin)
- Partner with Us page (Sanity admin)
- 4 legal pages: Terms, Privacy, Cookies, Affiliate Disclosure (shared LegalForm + LegalPage)
- Footer links fixed (all 16 links wired to real URLs)
- Migration util `/admin/migrate/footer` to patch Sanity footerColumns
- Flash Sales page (countdown timers, expiring offers)
- Coupon Codes page — 5-col grid, masked reveal → copy clipboard + open affiliate link, pagination (20/page), all English
- Comparisons page (posts category=Comparison)
- Tips & Guides page (posts category=Tips & Guides)
- 404 not-found page
- Admin sections for all above pages
- Excel/CSV import at `/admin/import`
- Admin sidebar nav — 5 collapsible groups, CSS dot indicators, inline SVG chevron (no emoji)
- Admin dashboard — redesigned with SVG stat cards, 5-group layout, recent activity table, inline styles (no CSS class dependency)
- Deployed to Vercel, live at offerdy.com
- SEO/GEO audit + fixes (2026-07-03/04):
  - Wired `configSEO`/`configAuthor` into `layout.tsx` + blog/review detail pages (were unused before)
  - Product/Offer JSON-LD on `/deals`, `/coupon-codes`; dateModified on blog/review JSON-LD
  - `/deals`, `/coupon-codes` pagination now uses real URLs (`?page=N`), crawlable per-page
  - Migrated ~20 `<img>` instances to `next/image` (fill+sizes)
  - Added metadata to `/categories`, `/categories/[slug]`; added `/llms.txt`; `lastModified` on sitemap
  - Fixed favicon (`icon.tsx`/`apple-icon.tsx` now read Sanity `configGeneral.favicon`, was hardcoded before)
  - Logo size increased in Header/Footer; user uploaded new clean logo (no glow) + favicon via Studio
- TODO/context audit (2026-07-04): cross-checked every "Pending" item against live Sanity data + code + production, found and fixed a real bug — canonical URLs, sitemap, and JSON-LD across the whole site pointed to `https://offerdy.com` (redirects 308 to `www.offerdy.com` in prod); replaced with `https://www.offerdy.com` in all 28 affected files
- Performance/SEO audit (2026-07-04): ISR on 7 routes (`/`, `/stores`, `/stores/[slug]`, `/blog/[slug]`, `/reviews/[slug]`, `/categories/[slug]`, `/[slug]`), `unstable_cache` for `/deals` + `/coupon-codes` data fetches, TTFB ~700-800ms → ~120-650ms
- `/author` page (E-E-A-T) — real author bio (Duy Pham), wired into blog/review byline + JSON-LD `Person`
- Admin: full URL-based pagination for all 9 admin list pages + merchant-health (`src/lib/adminPagination.ts`)
- **9/9 AI Engines built** (2026-07-05→08, scaled-down vs. `docs/03-workflows/*.md` aspirational spec — see `PROJECT_CONTEXT.md` → "AI Engines" for details): Content (Store/Offer/Deal drafts, `/admin/ai-review`), Import, Image (per-entity OG images), Merchant Health (`/admin/merchant-health`), Link Health (nightly cron), SEO audit (`/admin/seo-audit`), GEO (Deal detail pages at `/deals/[slug]`, Offer usage tips), Analytics (folded into Daily Report), Daily Report (`/admin/reports`)
- Expired Coupon handling — "Recently Expired" badge instead of disappearing; `/coupon-codes` filters dead codes out of the main list
- Fixed 2 silent-failure bugs in admin delete (offer/store) caused by Sanity strong references (click log now uses `_weak`, store delete now cascades to its offers) + added error toasts to every delete button in admin (errors were previously swallowed silently)
- Fixed `linkStatus` field-doesn't-exist-vs-"unchecked" GROQ bug that was undercounting platform health score
- Translated remaining Vietnamese strings on public-facing pages to English
- Review article polish (2026-07-11): fixed unstyled `<img>`/`<figure>` inside AI-generated review `content` HTML (was rendering full-width, unaligned — added `.article-body img/figure` CSS), fixed CTA button contrast bug caused by that same fix overriding `.article-cta`, capped hero image to 520px centered, removed duplicate AI-appended affiliate disclosure paragraph (site already shows one via `globalConfig.articleDisclaimer`)
- Review Excel import — added `productUrl`/`affiliateUrl`/`pros`/`cons`/`faq`/`metaTitle`/`metaDescription` columns to the Reviews sheet at `/admin/import` (previously only `title`/`excerpt`/`stars`/`tag`/`author`/`emoji`/`publishedAt`/`imgBg`/`content`/`externalImageUrl` were importable)
- Review coupon code feature (2026-07-11): new `couponCode` field on `review` schema + admin form; when set, renders `ReviewCouponBox` — a prominent teal "exclusive deal" ticket box (dashed code, click-to-copy, "Get Code & Shop" CTA) on the review page; hidden entirely when empty

## Pending 🔲

### Deploy
- [x] Deploy to Vercel
- [x] Set env vars on Vercel: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_TOKEN`, `NEXT_PUBLIC_SITE_URL`
- [x] Add production domain to Sanity CORS origins

### SEO / Visibility
- [x] Submit sitemap to Google Search Console after deploy — verified, 37 pages submitted
- [x] Fill in `/admin/config/seo` and `/admin/config/author` — confirmed populated in Sanity
- [x] Verify canonical URLs resolve correctly on production — **found broken (2026-07-04)**: every canonical tag, sitemap URL, and JSON-LD `@id`/`url` hardcoded `https://offerdy.com` (no www), but production 308-redirects that bare domain to `https://www.offerdy.com`. Fixed by replacing all 46 occurrences across 28 files with `https://www.offerdy.com`. Typecheck + `npm run build` both pass clean. **Live spot-check done 2026-07-23**: `/`, `/deals`, `/reviews`, `/stores` all emit `<link rel="canonical" href="https://www.offerdy.com/...">` (www form, correct). Only remaining step is a GSC sitemap re-submission, which is a manual action in the Search Console UI — note that `sitemap.xml` now serves 340 URLs, not the 37 recorded earlier.

### Content
- [ ] Populate Sanity with more real deals, stores, offers — in progress by user (queried live 2026-07-23: **275 published stores, 830 offers, 21 deals, 10 reviews, 6 posts**; counts change continuously, re-query Sanity for exact numbers rather than trusting this line)
- [ ] Write real `/comparisons` posts (category=Comparison) — still 0 posts, page shows empty state; needs real product/store facts, deferred pending user input. **No longer an SEO liability**: since `2ea03a5` the page auto-serves `noindex,follow` and drops itself from `sitemap.xml` while empty, and auto-reverses on the first published post — no code change needed when content lands.
- [x] **Store logos — DONE** (verified live 2026-07-23: 275/275 published stores have a real Sanity CDN asset, 0 missing). Was "228/361 missing" as of 2026-07-04; store count also dropped 361 → 275 in the meantime. Clearbit is dead and the Google-favicon fallback was declined — the logos that landed are real uploads, so keep that bar for any new store.
- [ ] Affiliate network — user has **not yet chosen a network or obtained real API credentials**. Advised (discussion only, no code): avoid CJ/Rakuten (hard to get approved as a new site), consider Sovrn Commerce/Skimlinks (no per-merchant approval) or ShareASale/FlexOffers. Do not invent affiliate data or write integration code until the user has real credentials — see `feedback_real_content_only` memory.
- [x] Configure About, Contact, legal pages via admin UI — confirmed all have real content (About, Contact, Terms, Privacy, Cookies, Affiliate Disclosure)
- [x] Run `/admin/migrate/footer` once on production — confirmed already applied, live `footerColumns` in Sanity matches the migration data exactly

### UX / Polish
- [ ] Flash Sales public page — verify countdown timer renders correctly across timezones
- [x] `/about` and `/author` internal linking — **verified fixed** (2026-07-23: grepped live homepage HTML, both `href="/about"` and `href="/author"` present). The old note claiming they were unreachable except by direct URL is no longer true.
- [x] Coupon Codes — store logo image support (shows `store.imageUrl` if set, else abbr avatar)
- [x] Comparisons / Tips & Guides / Blog — featured image on post cards (`imageUrl` → `<img>`, else coverEmoji)
- [x] BlogPageContent.tsx — all English strings (no Vietnamese)
- [x] Search page — coupon codes + flash sales in results with SVG type icons

### Nice-to-have
- [x] `/posts` slug — confirmed alias to `/blog` works (live)
- [x] Monetisation: affiliate link tracking — `AffiliateLink` component + GA4 `affiliate_click` event, verified end-to-end on production
- [ ] Monetisation: ad slots (Google AdSense) — deferred until site has traffic
- [x] Analytics integration — GA4 (`G-0H313ZSF8K`) via GTM (`GTM-K3N8W8B8`), verified in Realtime

### Tech debt / Infra (audited 2026-07-23)
- [ ] **`xlsx@0.18.5` has 2 unpatched high advisories** (Prototype Pollution `GHSA-4r6h-8v6p-xvw6`, ReDoS `GHSA-5pgg-2g8v-p4x9`) — `npm audit` says "No fix available" because SheetJS left npm and self-hosts now. Used by `/admin/import`. **Urgency is low, not zero**: the route sits behind Basic Auth (`src/proxy.ts`), so an attacker needs admin credentials *and* a crafted spreadsheet. Options when picked up: migrate to `exceljs`, or install SheetJS from its official CDN tarball.
- [ ] **ESLint 10 and TypeScript 7 are blocked by Next 16.2.11** — both tested and reverted 2026-07-23. ESLint 10: `eslint-plugin-react` (bundled inside `eslint-config-next`, not removable) calls `context.getFilename()`, removed in v10 → crashes before linting any file. TypeScript 7: `tsc --noEmit` passes but `next build` dies in the build worker (`The "id" argument must be of type string`). Re-test after a Next minor bump; don't retry blindly.
- [ ] **55 lint problems (30 errors, 25 warnings)** — pre-existing, confirmed present before the 2026-07-23 dependency upgrade (re-ran lint on the old stack to be sure). **Mostly low value**: all 14 `no-html-link-for-pages` errors are in `/admin/*` (behind auth, not indexed, so no SEO/UX impact). Only genuinely worth fixing is `react-hooks/purity` in `src/components/StoreOfferList.tsx:92` — `Date.now()` during render of a `'use client'` component risks a hydration mismatch at a day boundary. The twin in `src/app/deals/[slug]/page.tsx:59` is harmless (server component, `revalidate = 60`).
> **Note (not a task)** — Node is pinned to `24.x` via `engines.node` (commit `8d5b679`), which **overrides** the Vercel dashboard setting. To move Node, bump `engines`, `@types/node`, and the local runtime together; `@types/node` must never lead the runtime.

### Governance docs
- [x] **RESOLVED** — the governance rewrite (`AGENTS.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md`, `Website.code-workspace`, `docs/` tree) was committed at `f4a7470`. Verified 2026-07-23: all four files plus 30 files under `docs/` are tracked, working tree clean. No open decision left here.
