# Offerdy — Project Context

## Stack
- **Framework**: Next.js (App Router), TypeScript, Tailwind CSS v4
- **CMS**: Sanity (project ID: `ns0upb1t`) — all reads/writes via `writeClient`
- **Hosting**: Vercel — live at offerdy.com
- **Forms**: Formspree (with mailto fallback)

## Key Conventions
- Singleton Sanity docs: `_id == _type` (e.g. `configAbout`, `configGeneral`, `configContact`)
- Upsert pattern: `writeClient.createIfNotExists` + `.patch().set().commit()`
- After mutations: call `revalidatePath` to bust cache
- Server actions: `'use server'` files in `actions.ts`
- Client forms: `'use client'` + `useTransition` for async state
- **CSS in client components**: inject via `<style dangerouslySetInnerHTML={{ __html: CSS }}>` — new classes added to `globals.css` after dev server start are NOT hot-reloaded; component-scoped `<style>` tags always work and support `@media` queries
- **CSS in server components**: use 100% inline `style={{}}` props — no `<style>` tags, no event handlers
- **No emoji in UI elements** (buttons, nav headers) — renders as broken black squares on Windows; use inline SVG instead
- `isConfigured()` guard before every Sanity query, with static fallback data
- All public-facing UI text must be in **English** (international audience)
- **Images**: use `next/image` (`fill` + `sizes` for card/grid images, explicit `width`/`height` for fixed-size logos/avatars) — `next.config.ts` allows `remotePatterns: hostname:'**'` since admin can paste external image URLs from any domain. One exception: review detail hero image stays a plain `<img>` (`reviews/[slug]/page.tsx`) because it intentionally preserves natural aspect ratio (no crop), unlike the blog hero which uses `fill`+`cover`.
- **SEO config wiring**: `configSEO` and `configAuthor` (Sanity singletons) are read via `getConfigSeo()` / `getConfigAuthor()` in `src/sanity/queries.ts` and consumed in `layout.tsx` (`generateMetadata`) and blog/review detail pages (author byline + JSON-LD `Person`). Don't add new SEO/author admin fields without also wiring the read side — `configSEO`/`configAuthor` sat unused for a while before this was caught. Note: `configSEO.canonicalUrl` (the admin `/admin/config/seo` text field) is still **not** wired to anything — canonical tags are all hardcoded (see below) — so editing it in the admin has no effect.
- **Production domain is `https://www.offerdy.com`** — the bare `offerdy.com` 308-redirects to it. Every canonical tag / sitemap URL / JSON-LD `@id` must use the `www.` form (hardcoded as `https://www.offerdy.com` per-file, not read from `NEXT_PUBLIC_SITE_URL` which is set on Vercel but unused by code). Fixed 2026-07-04 after an audit found all URLs pointing to the bare (redirecting) domain — if adding a new page with `generateMetadata`/JSON-LD, copy the `www.` form from an existing page, not the Vercel env var name.
- **Favicon**: `src/app/icon.tsx` / `apple-icon.tsx` read `configGeneral.favicon` via `getFaviconUrl()`, falling back to a hardcoded navy/green icon if not configured. No static `favicon.ico` (removed — was the unused Next.js default).
- `/llms.txt` (`src/app/llms.txt/route.ts`) auto-generates a GEO summary (categories, recent reviews/posts) from live Sanity data — update if major content sections change.
- **Expired Coupon handling**: offers expired ≤30 days ago show under a "Recently Expired" badge (no CTA) instead of disappearing outright; `/coupon-codes` excludes expired codes from the main list rather than showing dead codes as if live.
- **Language split**: public-facing pages are 100% English; `/admin/*` stays Vietnamese. Don't "fix" Vietnamese strings inside `/admin`.

## Public Pages
| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ Live | Homepage |
| `/deals` | ✅ Live | All deals |
| `/deals/[slug]` | ✅ Live | Deal detail — Summary/Pros&Cons/FAQ, AI-generated via `generateDealContent.ts`, JSON-LD Product+FAQPage+Breadcrumb |
| `/stores` | ✅ Live | Store directory |
| `/stores/[slug]` | ✅ Live | Store detail + offers |
| `/categories` | ✅ Live | Category list |
| `/categories/[slug]` | ✅ Live | Category deals |
| `/reviews` | ✅ Live | Product reviews |
| `/reviews/[slug]` | ✅ Live | Review detail — FAQ + JSON-LD FAQPage, CTA nut affiliate/productUrl neu co |
| `/blog` | ✅ Live | Blog (redirects exist at /posts) |
| `/blog/[slug]` | ✅ Live | Blog post detail |
| `/posts` | ✅ Live | Same as /blog |
| `/search` | ✅ Live | Site search |
| `/about` | ✅ Live | Sanity-connected, SEO/GEO optimised |
| `/contact` | ✅ Live | Formspree + FAQ accordion |
| `/submit-deal` | ✅ Live | Formspree submission form |
| `/partner` | ✅ Live | Partner with us |
| `/terms` | ✅ Live | Sanity-editable legal page |
| `/privacy` | ✅ Live | Sanity-editable legal page |
| `/cookies` | ✅ Live | Sanity-editable legal page |
| `/affiliate-disclosure` | ✅ Live | Sanity-editable legal page |
| `/flash-sales` | ✅ Live | Live countdown timers, offers expiring soon |
| `/coupon-codes` | ✅ Live | 5-col grid, masked reveal → copy + open link, pagination; expired codes filtered out of the main list (see Expired Coupon handling below) |
| `/comparisons` | ✅ Live | Posts category=Comparison |
| `/tips-guides` | ✅ Live | Posts category=Tips & Guides |
| `/[slug]` | ✅ Live | CMS-managed custom pages |

## Admin Pages (`/admin/...`)
- **Dashboard** — inline-style stats cards (SVG icons, no emoji), 2 sections: Offers & Deals / Blog & Bài viết, config quick-links, recent activity table
- **Sidebar nav** — 5 collapsible groups (Offers & Deals · Blog & Bài viết · Trang web · Pháp lý · Cấu hình), CSS dot indicator per group, emoji-free (SVG chevron), auto-opens active group
- Deals, Stores, Categories, Offers, Posts, Reviews, Pages
- About, Contact, Submit Deal, Partner, Terms, Privacy, Cookies, Affiliate Disclosure
- Config: General, SEO, Social, Ads, Author, Content
- Import (`/admin/import`)
- Flash Sales, Coupon Codes, Comparisons, Tips & Guides admin sections
- Migration util: `/admin/migrate/footer` (one-time footer link patch)
- **`/admin/ai-review`** — approval queue for AI-generated drafts, 3 tabs: Stores / Offers / Deals. Preview via iframe `srcDoc`, Approve/Reject/Regenerate.
- **`/admin/merchant-health`** — 0-100 health score per store (Content 40% / SEO 20% / Affiliate 25% / Freshness 15%), sorted worst-first, links back to `/admin/stores`
- **`/admin/seo-audit`** — deterministic (non-AI) audit: missing/duplicate meta title/description, missing FAQ, missing images, short excerpts
- **`/admin/reports`** — "Platform Health" (avg score, broken links, stores needing attention) + AI Daily Report (Vietnamese summary + action items from Merchant Health + Sentry) + click analytics (top stores/offers, time-windowed) + Sentry unresolved issues
- 9 list pages (stores/offers/coupon-codes/deals/flash-sales/comparisons/posts/reviews/tips-guides) + merchant-health use real URL pagination (`?page=N`; stores/offers/coupon-codes also put filters in the URL) via shared `src/lib/adminPagination.ts` + `src/app/admin/_components/{AdminPagination,useAdminUrlState,useUrlPage}` — do not reintroduce "load all then slice client-side"

## AI Engines (Anthropic Claude Sonnet 5 + Vercel Cron)
9/9 built as of 2026-07-08 (scaled-down vs. the aspirational multi-agent/queue spec in `docs/03-workflows/*.md`, which assumes infra this project doesn't have — real affiliate network APIs, job queues):
- **Content** — `src/lib/ai/generateStoreContent.ts` / `generateOfferContent.ts` / `generateDealContent.ts`, structured output (`zodOutputFormat`), hard constraint: never invent numbers/promos/codes. Cron `/api/cron/ai-content-nightly` (batch, drafts only) + manual trigger APIs under `/api/ai/content/*`. Approval in `/admin/ai-review`.
- **AI Review Writer** (2026-07-10→11) — trong `/admin/reviews`, ca 2 mode Them moi va Chinh sua deu co panel "Viet bai bang AI": admin dan link san pham (+ link affiliate rieng, tu dong = link san pham cho den khi admin tu sua) → `scrapeProductLink` (cheerio, SSRF-safe qua `src/lib/safeFetch.ts`) lay title/description/anh/gia → admin duyet/bo chon anh → `generateReviewDraft` goi `src/lib/ai/generateReviewContent.ts` (viet tieng Anh, co retry 3 lan cho loi 429/5xx/529 Overloaded va loi validate FAQ thieu, tra ve `{error}` than thien thay vi crash) sinh: excerpt, content (5 phan, khong nhung pros/cons), `prosAndCons` rieng (3-5 pros/2-4 cons, render 2-cot xanh/do giong `/deals/[slug]`), 5-8 FAQ, so sao de xuat, gradient theo danh muc → upload anh len Sanity + thay placeholder `[IMAGE:n]`/`[CTA]` bang the that gan link affiliate → do vao form de admin sua truoc khi Luu (khong co hang doi duyet rieng, khac voi Store/Offer/Deal; mode edit khong bi doi slug/URL bai da co). Field moi tren `review`: `productUrl`, `affiliateUrl`, `faq`, `prosAndCons`, `metaTitle`, `metaDescription`. Trang chu (`/`) chi hien 2 hang review (`reviewsGridColumns * 2`), xem full o `/reviews`.
- **Import** — `/admin/import` (Excel/CSV, batched to stay under Vercel's 4.5MB body limit)
- **Image** — `src/lib/ogTemplate.tsx`, per-entity `opengraph-image.tsx` for `/stores/[slug]`, `/blog/[slug]`, `/reviews/[slug]` (no AI image gen, no API cost — pure `next/og`/Satori)
- **Health (Merchant)** — `src/lib/merchantHealth.ts` → `/admin/merchant-health`, computed live (not cached/precomputed)
- **Link Health** — `src/lib/checkOfferLink.ts`, manual (`/api/check-links`) + nightly cron `/api/cron/link-check-nightly`, writes `offer.linkStatus`/`linkCheckedAt`
- **SEO** — `/admin/seo-audit` (deterministic, no AI needed)
- **GEO** — Offer `usageTips`/`eligibilityNotes` + full Deal detail content (`/deals/[slug]`)
- **Analytics** — folded into AI Daily Report rather than a parallel system (click/conversion data feeds the same AI summary)
- **Daily Report** — `/api/cron/daily-report` → Sanity singleton `dailyReport` → shown atop `/admin/reports`
- Reviewer role is covered by the `/code-review` skill, not a dedicated engine.

**Sanity reference gotcha**: strong references (default) block deletion of the referenced doc. `offer.store` is intentionally strong (real data integrity) but store deletion now cascades to delete its offers in one transaction rather than failing silently — see `src/app/admin/stores/actions.ts`. Analytics/log-only references (e.g. `click.offer`/`click.store`) use `_weak: true` (exact field name — `weak` is rejected by Sanity) since referential integrity doesn't matter there. When adding a new reference field, decide which case it is up front instead of defaulting to strong and discovering a deletion deadlock later.

## Shared Components
- `src/app/admin/_legal/LegalForm.tsx` — shared admin form for all 4 legal pages
- `src/app/admin/_legal/actions.ts` — `saveLegalPage(configId, pagePath, data)` / `getLegalPage(configId)`
- `src/components/LegalPage.tsx` — shared public UI for legal pages
- `src/components/BlogPageContent.tsx` — shared blog/post grid used by tips-guides; shows `post.imageUrl` if set, else coverEmoji fallback; English-only strings

## Sanity Config IDs
`configGeneral`, `configSocial`, `configSEO`, `configAuthor`, `configContent`, `configAbout`, `configContact`,
`configSubmitDeal`, `configPartner`, `configTerms`, `configPrivacy`, `configCookies`, `configAffiliateDisclosure`

## Static Fallback Data
`src/data/` — deals, stores, categories, reviews, posts, siteSettings (used when Sanity not configured)

