# Offerdy — TODO

## Done ✅
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
- [x] Verify canonical URLs resolve correctly on production — **found broken (2026-07-04)**: every canonical tag, sitemap URL, and JSON-LD `@id`/`url` hardcoded `https://offerdy.com` (no www), but production 308-redirects that bare domain to `https://www.offerdy.com`. Fixed by replacing all 46 occurrences across 28 files with `https://www.offerdy.com`. Typecheck + `npm run build` both pass clean. **Still needs**: push + deploy, then re-submit sitemap in GSC (URLs changed) and spot-check `view-source` on a couple of live pages.

### Content
- [ ] Populate Sanity with more real deals, stores, offers — in progress by user (as of 2026-07-04: 361 stores, 21 deals, 8 reviews, 6 posts; counts change continuously, re-query Sanity for exact numbers rather than trusting this line)
- [ ] Write real `/comparisons` posts (category=Comparison) — still 0 posts, page shows empty state; needs real product/store facts, deferred pending user input
- [ ] **228/361 stores (63% as of 2026-07-04) still missing a real logo** — Clearbit (the service the old Excel template suggested) is dead, no DNS resolution. User declined the low-quality fallback (Google favicon service, 48x48px) and wants real high-res logos instead — do not auto-fetch a low-quality substitute without asking again.
- [ ] Affiliate network — user has **not yet chosen a network or obtained real API credentials**. Advised (discussion only, no code): avoid CJ/Rakuten (hard to get approved as a new site), consider Sovrn Commerce/Skimlinks (no per-merchant approval) or ShareASale/FlexOffers. Do not invent affiliate data or write integration code until the user has real credentials — see `feedback_real_content_only` memory.
- [x] Configure About, Contact, legal pages via admin UI — confirmed all have real content (About, Contact, Terms, Privacy, Cookies, Affiliate Disclosure)
- [x] Run `/admin/migrate/footer` once on production — confirmed already applied, live `footerColumns` in Sanity matches the migration data exactly

### UX / Polish
- [ ] Flash Sales public page — verify countdown timer renders correctly across timezones
- [ ] `/about` and `/author` are not linked from the main nav or footer (footer content is admin-managed via Sanity `footerColumns`, not hardcoded) — reduces their E-E-A-T value since they're only reachable by direct URL
- [x] Coupon Codes — store logo image support (shows `store.imageUrl` if set, else abbr avatar)
- [x] Comparisons / Tips & Guides / Blog — featured image on post cards (`imageUrl` → `<img>`, else coverEmoji)
- [x] BlogPageContent.tsx — all English strings (no Vietnamese)
- [x] Search page — coupon codes + flash sales in results with SVG type icons

### Nice-to-have
- [x] `/posts` slug — confirmed alias to `/blog` works (live)
- [x] Monetisation: affiliate link tracking — `AffiliateLink` component + GA4 `affiliate_click` event, verified end-to-end on production
- [ ] Monetisation: ad slots (Google AdSense) — deferred until site has traffic
- [x] Analytics integration — GA4 (`G-0H313ZSF8K`) via GTM (`GTM-K3N8W8B8`), verified in Realtime

### Governance docs (open decision, not yet resolved)
- [ ] `AGENTS.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md` (partial), `Website.code-workspace`, and the new `docs/` tree have been sitting modified/untracked in the working tree since 2026-07-07 — a "vision" governance rewrite drafted alongside the AI Engine work but deliberately **not committed**, pending the user's decision to keep or discard. Ask before committing.
