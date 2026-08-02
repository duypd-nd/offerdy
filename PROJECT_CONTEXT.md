# Offerdy — Project Context

## Stack
- **Framework**: Next.js (App Router), TypeScript, Tailwind CSS v4
- **CMS**: Sanity (project ID: `ns0upb1t`) — all reads/writes via `writeClient`
- **Hosting**: Vercel — live at offerdy.com
- **Node**: pinned to `24.x` via `engines.node` in `package.json` — this **overrides** the Vercel dashboard setting, so bump it here (together with `@types/node`) rather than in Project Settings
- **Forms**: Formspree (with mailto fallback)
- **QR codes**: `qrcode` (admin only, dynamically imported — see "Social kit")

## Key Conventions
- Singleton Sanity docs: `_id == _type` (e.g. `configAbout`, `configGeneral`, `configContact`)
- Upsert pattern: `writeClient.createIfNotExists` + `.patch().set().commit()`
- After mutations: call `revalidatePath` to bust cache
- Server actions: `'use server'` files in `actions.ts`
- Client forms: `'use client'` + `useTransition` for async state
- **CSS in client components**: inject via `<style dangerouslySetInnerHTML={{ __html: CSS }}>` — new classes added to `globals.css` after dev server start are NOT hot-reloaded; component-scoped `<style>` tags always work and support `@media` queries
- **CSS in server components**: use 100% inline `style={{}}` props — no `<style>` tags, no event handlers
- **No emoji in UI elements** (buttons, nav headers) — renders as broken black squares on Windows; use inline SVG instead
- `isConfigured()` guard before every Sanity query. Static demo data (`src/data/*.ts`: Amazon/Nike/etc.) is a **local-dev-only** fallback — used **only** when `!isConfigured()` (no Sanity env). When Sanity IS configured (production), queries return the real result even if empty (`data ?? []` / `null`), and errors return empty too — they must **never** fall back to static demo data, or the live site shows fake brand partnerships (this happened once when store data was cleared; fixed 2026-07-24). If you add a new query fn, follow this pattern: `if (!isConfigured()) return staticX; try { return data ?? [] } catch { return [] }`. See `feedback_real_content_only` principle.
- All public-facing UI text must be in **English** (international audience)
- **Images**: use `next/image` (`fill` + `sizes` for card/grid images, explicit `width`/`height` for fixed-size logos/avatars) — `next.config.ts` allows `remotePatterns: hostname:'**'` since admin can paste external image URLs from any domain. One exception: review detail hero image stays a plain `<img>` (`reviews/[slug]/page.tsx`) because it intentionally preserves natural aspect ratio (no crop), unlike the blog hero which uses `fill`+`cover`.
- **SEO config wiring**: `configSEO` and `configAuthor` (Sanity singletons) are read via `getConfigSeo()` / `getConfigAuthor()` in `src/sanity/queries.ts` and consumed in `layout.tsx` (`generateMetadata`) and blog/review detail pages (author byline + JSON-LD `Person`). Don't add new SEO/author admin fields without also wiring the read side — `configSEO`/`configAuthor` sat unused for a while before this was caught. Note: `configSEO.canonicalUrl` (the admin `/admin/config/seo` text field) is still **not** wired to anything — canonical tags are all hardcoded (see below) — so editing it in the admin has no effect.
- **Production domain is `https://www.offerdy.com`** — the bare `offerdy.com` 308-redirects to it. Every canonical tag / sitemap URL / JSON-LD `@id` must use the `www.` form (hardcoded as `https://www.offerdy.com` per-file, not read from `NEXT_PUBLIC_SITE_URL` which is set on Vercel but unused by code). Fixed 2026-07-04 after an audit found all URLs pointing to the bare (redirecting) domain — if adding a new page with `generateMetadata`/JSON-LD, copy the `www.` form from an existing page, not the Vercel env var name.
- **Favicon**: `src/app/icon.tsx` / `apple-icon.tsx` read `configGeneral.favicon` via `getFaviconUrl()`, falling back to a hardcoded navy/green icon if not configured. No static `favicon.ico` (removed — was the unused Next.js default).
- `/llms.txt` (`src/app/llms.txt/route.ts`) auto-generates a GEO summary (categories, recent reviews/posts) from live Sanity data — update if major content sections change.
- **Expired Coupon handling**: offers expired ≤30 days ago show under a "Recently Expired" badge (no CTA) instead of disappearing outright; `/coupon-codes` excludes expired codes from the main list rather than showing dead codes as if live.
- **Language split**: public-facing pages are 100% English; `/admin/*` stays Vietnamese. Don't "fix" Vietnamese strings inside `/admin`.
- **Third-party scripts go through `next/script`, and an inline one needs an `id`** — without it Next can't track or optimise the script. GTM (`GTM-K3N8W8B8`) uses `strategy="afterInteractive"`, which the Next docs name specifically for tag managers; the trade-off is that it starts after hydration rather than immediately, so a visitor who leaves within a few hundred ms may go unrecorded. Two things that are **not** exceptions to fix: the `<script type="application/ld+json">` blocks are the pattern Next itself recommends and must stay raw `<script>`, and the GTM `<noscript>` iframe must stay the first thing in `<body>`. The root layout has **no manual `<head>`** — App Router builds it from `generateMetadata` (fixed 2026-08-01; the old `<head>` existed only to hold the GTM snippet).

## Public Pages
| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ Live | Homepage |
| `/deals` | ✅ Live | All deals — filter by category via `?category=<slug>` |
| `/links` | ✅ Live | **Link-in-bio** for Instagram/TikTok (neither allows clickable links in captions, so the bio points here permanently instead of being re-edited per post). Mobile-first, no header/footer, 12 latest deals + **search box** (see "Product codes" below). `noindex` + kept out of `sitemap.ts` on purpose — it duplicates `/deals` and would compete with it in search. Styles are the `.lb-*` block in `globals.css`; the wordmark is **text, not the Sanity logo** (that logo is dark-on-transparent and vanishes on this dark background). The grid + search live in the client component `src/components/LinkInBioDeals.tsx`; the page passes it **all** deals (not a slice) so search covers the whole catalogue with zero API calls — the page stays `○ Static` |
| `/d/[code]` | ✅ Live | **Short link by product code** — `offerdy.com/d/1000` → 302 to `/deals/<slug>`, **click-tracked** (see "Short-link tracking" below). Route handler (`route.ts`), not a page: the result is always a redirect, so there's nothing to render and no duplicate of `/deals/<slug>`. Unknown/malformed code → `/links` (not 404 — a visitor from a social post who mistyped a digit is worth keeping). 302 not 301 for two reasons: a deal's slug changes when its title is edited (a cached 301 would pin the short link to a dead slug), **and** a cached 301 stops sending later visits through this route, freezing the click count while people are still clicking |
| `/deals/[slug]` | ✅ Live | Deal detail — Summary/Pros&Cons/FAQ, AI-generated via `generateDealContent.ts`, JSON-LD Product+FAQPage+Breadcrumb. Shows the product code, and a **Share / Copy link** pair (`ShareDeal.tsx`) that shares the tracked `/d/<code>` short link rather than the long slug URL — so a visitor forwarding a deal to a friend becomes a measurable number instead of an invisible one |
| `/stores` | ✅ Live | Store directory |
| `/stores/[slug]` | ✅ Live | Store detail + offers |
| `/categories` | ✅ Live | Category list |
| `/categories/[slug]` | ✅ Live | Category deals |
| `/reviews` | ✅ Live | Product reviews |
| `/reviews/[slug]` | ✅ Live | Review detail — FAQ + JSON-LD FAQPage, CTA nut affiliate/productUrl neu co, `ReviewCouponBox` (teal ticket-style exclusive coupon, chi hien khi review co `couponCode`) |
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
- **Dashboard** — work first, inventory second. Top two rows are **Hôm nay** (GA4 pageviews, affiliate clicks today/7d, unresolved Sentry issues) and **Cần xử lý** (7 cards: AI review queue, expired offers, expiring ≤7d, broken links, missing description, unverified, pending coupon alerts). Every "Cần xử lý" card deep-links to the already-filtered list (`/admin/offers?status=…`). Below that: the original counter cards (Offers & Deals / Blog & Bài viết), config quick-links, recent activity. Counts come from `src/lib/adminWorkQueue.ts` — **one** GROQ query, `useCdn: false`, never throws (returns zeros on failure, because the sidebar consumes it on every admin page)
- **Sidebar nav** — 5 collapsible groups (Offers & Deals · Blog & Bài viết · Trang web · Pháp lý · Cấu hình), CSS dot indicator per group, emoji-free (SVG chevron), auto-opens active group. Carries **badges** (AI review queue, pending coupon alerts, broken links) fed from `adminWorkQueue`; a collapsed group shows the sum of its children so folding a group never hides work. Badges render only when `> 0`
- Deals, Stores, Categories, Offers, Posts, Reviews, Pages
- About, Contact, Submit Deal, Partner, Terms, Privacy, Cookies, Affiliate Disclosure
- Config: General, SEO, Social, Ads, Author, Content
- Import (`/admin/import`)
- Flash Sales, Coupon Codes, Comparisons, Tips & Guides admin sections
- **`/admin/social-kit`** — pick a deal → generated caption (editable) + `/d/` vs `/g/` link toggle + `?s=` post tag + QR code (SVG/PNG download). See "Social kit" below.
- Migration utils: `/admin/migrate/footer` (one-time footer link patch — ⚠️ it calls `revalidatePath` **during render**, which Next 16 now rejects at runtime; if it's ever needed again it must move to a server action like `deal-codes` did), `/admin/migrate/deal-codes` (assigns missing product codes; read-only page + `assignDealCodes()` server action behind a button, idempotent)
- **`/admin/ai-review`** — approval queue for AI-generated drafts, 3 tabs: Stores / Offers / Deals. Preview via iframe `srcDoc`, Approve/Reject/Regenerate.
- **`/admin/merchant-health`** — 0-100 health score per store (Content 40% / SEO 20% / Affiliate 25% / Freshness 15%), sorted worst-first, links back to `/admin/stores`
- **`/admin/seo-audit`** — deterministic (non-AI) audit: missing/duplicate meta title/description, missing FAQ, missing images, short excerpts
- **`/admin/reports`** — "Platform Health" (avg score, broken links, stores needing attention) + AI Daily Report (Vietnamese summary + action items from Merchant Health + Sentry) + click analytics (top stores/offers, time-windowed) + Sentry unresolved issues + short-link/source breakdown. Has a **staleness banner** and a **"Tạo lại ngay"** button — see "Daily report staleness" below
- **`/admin/offers` filters** — `?status=` accepts `active`, `inactive`, `expired`, `expiring` (≤7 days), `broken` (`linkStatus == "broken"`), `nodesc`, `unverified`; `?sort=` accepts `newest` (default, `store->_createdAt desc`), `clicks`, `expiring`, `title`; `?size=` accepts 20/50/100. The table shows **Click** and **Hạn** columns and flags rows with `🔗 link hỏng` / `📝 thiếu mô tả` (the flag is suppressed when the list is already filtered by that exact problem). Search matches `title`, `couponCode` **and** `offerText`. `unverified` uses `verified == false`, never `!= true` — offers predating the field have no `verified` at all
- 9 list pages (stores/offers/coupon-codes/deals/flash-sales/comparisons/posts/reviews/tips-guides) + merchant-health use real URL pagination (`?page=N`; stores/offers/coupon-codes also put filters in the URL) via shared `src/lib/adminPagination.ts` + `src/app/admin/_components/{AdminPagination,useAdminUrlState,useUrlPage}` — do not reintroduce "load all then slice client-side"

## AI Engines (Anthropic Claude Sonnet 5 + Vercel Cron)
9/9 built as of 2026-07-08 (scaled-down vs. the aspirational multi-agent/queue spec in `docs/03-workflows/*.md`, which assumes infra this project doesn't have — real affiliate network APIs, job queues):
- **Content** — `src/lib/ai/generateStoreContent.ts` / `generateOfferContent.ts` / `generateDealContent.ts`, structured output (`zodOutputFormat`), hard constraint: never invent numbers/promos/codes. Cron `/api/cron/ai-content-nightly` (batch, drafts only) + manual trigger APIs under `/api/ai/content/*`. Approval in `/admin/ai-review`.
- **AI Review Writer** (2026-07-10→11) — trong `/admin/reviews`, ca 2 mode Them moi va Chinh sua deu co panel "Viet bai bang AI": admin dan link san pham (+ link affiliate rieng, tu dong = link san pham cho den khi admin tu sua) → `scrapeProductLink` (cheerio, SSRF-safe qua `src/lib/safeFetch.ts`) lay title/description/anh/gia → admin duyet/bo chon anh → `generateReviewDraft` goi `src/lib/ai/generateReviewContent.ts` (viet tieng Anh, co retry 3 lan cho loi 429/5xx/529 Overloaded va loi validate FAQ thieu, tra ve `{error}` than thien thay vi crash) sinh: excerpt, content (5 phan, khong nhung pros/cons), `prosAndCons` rieng (3-5 pros/2-4 cons, render 2-cot xanh/do giong `/deals/[slug]`), 5-8 FAQ, so sao de xuat, gradient theo danh muc → upload anh len Sanity + thay placeholder `[IMAGE:n]`/`[CTA]` bang the that gan link affiliate → do vao form de admin sua truoc khi Luu (khong co hang doi duyet rieng, khac voi Store/Offer/Deal; mode edit khong bi doi slug/URL bai da co). Field moi tren `review`: `productUrl`, `affiliateUrl`, `faq`, `prosAndCons`, `metaTitle`, `metaDescription`, `couponCode`. Trang chu (`/`) chi hien 2 hang review (`reviewsGridColumns * 2`), xem full o `/reviews`. Da bo doan disclosure trung lap AI tu chen vao cuoi `content` (site da co disclaimer chung o `globalConfig.articleDisclaimer`).
- **Review coupon box** (2026-07-11) — field `couponCode` (string, tuy chon) tren `review`, sua o `/admin/reviews` (o rieng, de trong = an). Neu co gia tri, `/reviews/[slug]` render `src/components/ReviewCouponBox.tsx` — "ticket" gradient teal/xanh ngoc, 2 vet khuyet tron 2 ben, ma code bam-de-copy (dashed border cam, tooltip "Copied!"), nut "Get Code & Shop" tro toi `affiliateUrl || productUrl`. CSS `.rv-coupon*` trong `globals.css`.
- **Review Excel import** — them 7 cot vao sheet Reviews tai `/admin/import`: `productUrl`, `affiliateUrl`, `pros`/`cons` (moi dong 1 y trong o), `faq` (cap Q/A cach nhau 1 dong trong, dung chung parser voi form admin), `metaTitle`, `metaDescription`. Backend `importReviews()` trong `src/app/api/import/route.ts`.
- **Import — Deals sheet** (2026-07-24) — 4th import sheet (`importDeals()` in `route.ts`). Matches by `slug(title)`: existing deal patched, new title created ("both" model). Filled cell overwrites, blank is a no-op — so content can be added to the 21 existing deals with just `title` + the 5 AI content columns (`summary`/`metaTitle`/`metaDescription`/`faq`/`pros`+`cons`) while price/store stay untouched. New deals require `store`/`priceSale`/`priceOrig`/`discount` (1–99). Basic fields ARE writable (a deal's outbound link is `dealUrl`, not a protected affiliate field); `category` resolves a reference by name-or-slug; `imageUrl` uses the SSRF-safe uploader.
- **Import — store content columns** (2026-07-24) — the Stores sheet carries full store copy, not just basics: 7 `about_*` columns + `metaTitle`/`metaKeywords`/`metaDescription` + `faq`/`pros`/`cons`. `about_*` is assembled by the **same `renderAboutHtml()`** as `approveAiDraft`, so imported and AI-written stores are byte-identical; card icons/titles live in `ABOUT_CARDS` (`route.ts`), not in columns. Existing stores are now **patched** (they used to be reuse-id-and-ignore-everything), but **only** on content fields — `affiliateLink` and the basics are deliberately excluded. Semantics: filled cell overwrites, blank cell is a no-op, content read once per store from the first row carrying it, `about_*` beats raw `store_about`. **`about_intro` must start lowercase with a verb** — it renders after `<strong>{Store}</strong> ` as one sentence.
- **Import — offer content columns** (2026-08-01) — `offer_description` / `offer_usage_tips` / `offer_eligibility` on the Stores sheet, mapping to the offer's `description` / `usageTips` / `eligibilityNotes`. They exist to close a hole, not to add fields: the import wrote **no** `description` for offers and there was no column that could, so every Excel-imported offer permanently satisfied the nightly cron's `!defined(description)` filter — the operator could fill the sheet perfectly and AI would still draft over it every night. Same semantics as the store content columns and `product_url`: filled cell overwrites, blank cell is a no-op, and all three apply to **existing** offers too (matched by `couponCode`, else `offer_title`), which is the path for back-filling offers imported before this. That existing-offer branch now commits `product_url` and content **together** instead of one request each.
- **Import** — `/admin/import` (Excel/CSV, batched to stay under Vercel's 4.5MB body limit). Parsing/template generation uses **`exceljs`** (migrated off `xlsx`/SheetJS 2026-07-24 — it had 2 unpatchable high advisories and SheetJS left npm). exceljs is **dynamically imported** inside the handlers in `ImportClient.tsx` so its ~912KB browser bundle stays a lazy chunk. **Gotcha when touching this code**: exceljs returns date cells as `Date` objects where `xlsx` returned Excel serial numbers — `cellToPrimitive()` normalises them to `yyyy-mm-dd` strings, which is what both `expiresAt` (`new Date(...)`) and `publishedAt` (`normalizePublishedAt()`) in `src/app/api/import/route.ts` expect. The serial-number branch of `normalizePublishedAt()` is now defensive-only; don't "clean it up" without re-checking the client contract.
- **Image** — `src/lib/ogTemplate.tsx`, per-entity `opengraph-image.tsx` for `/stores/[slug]`, `/blog/[slug]`, `/reviews/[slug]`, `/deals/[slug]` (no AI image gen, no API cost — pure `next/og`/Satori). Deals use a separate `DealOgImage` layout (large product shot + price + discount badge) because for a deal it's the *price* that earns the click, not a 76px logo. **Gotcha that silently killed this engine for a month**: setting `openGraph.images` in a route's `generateMetadata` overrides its `opengraph-image.tsx` file — the Next docs claim file-based metadata wins, but the opposite was verified on this project's own production. Stores and reviews were emitting raw Sanity URLs and their generated cards were never used. **Never set `openGraph.images`/`twitter.images` on a route that has an `opengraph-image.tsx`.**
- **Health (Merchant)** — `src/lib/merchantHealth.ts` → `/admin/merchant-health`, computed live (not cached/precomputed)
- **Link Health** — `src/lib/checkOfferLink.ts`, manual (`/api/check-links`) + nightly cron `/api/cron/link-check-nightly`, writes `offer.linkStatus`/`linkCheckedAt`
- **SEO** — `/admin/seo-audit` (deterministic, no AI needed)
- **GEO** — Offer `usageTips`/`eligibilityNotes` + full Deal detail content (`/deals/[slug]`)
- **Analytics** — folded into AI Daily Report rather than a parallel system (click/conversion data feeds the same AI summary)
- **Daily Report** — `/api/cron/daily-report` → Sanity singleton `dailyReport` → shown atop `/admin/reports`. Also receives the **social short-link data** (opens, merchant clicks, per-source opens→clicks, most-opened products) so the morning summary can say which channel converts, not just which gets views. The prompt tells the model to state plainly that there is not enough data below ~20 opens for a source rather than ranking channels on noise — small numbers are exactly where a confident-sounding channel recommendation would be invented.
  - ⚠️ `CLICK_ANALYTICS_QUERY` must keep `kind != "shortlink"` on `recentClicks`. It was **missing** when short-link tracking shipped, so the daily report's affiliate click counts would have silently included short-link opens (fixed 2026-07-25; the `/admin/reports` copy of the filter was correct from the start).
- Reviewer role is covered by the `/code-review` skill, not a dedicated engine.

## AI review queue (`/admin/ai-review`) — what triggers AI, and bulk approval
Two things run the content engine, both automatic: the Vercel cron `/api/cron/ai-content-nightly` at `0 18 * * *` (18:00 UTC = **01:00 giờ VN**), and the tail of every Excel import, which drafts inline — **stores only**, whether newly created or already present without a `description` — capped at `IMPORT_AI_STORE_CAP` (default 8) so a 50-row batch can't exceed the Vercel function timeout. Anything past the cap simply waits for that night's cron.

**The selection rule is the whole story**: a record is a candidate only when its content field is empty **and** `aiReviewStatus == "none"` — `!defined(description)` for store and offer, `!defined(summary)` for deal. So AI never overwrites anything, and a record you have approved or rejected is never revisited. The operator-facing consequence: to stop AI writing for a record, give it content, or take it out of the `"none"` state.

- ⚠️ **`store_description` is not the field being checked.** It maps to `shortDescription`; the cron looks at `description`, which is written only by the `about_*` group (or raw `store_about`). A sheet filled with `store_description` alone leaves the store a candidate forever — this is the single most confusing part of the whole flow.
- ⚠️ Schema `initialValue` does **not** apply to API-created documents, so `route.ts` sets `aiReviewStatus: 'none'` explicitly on every created store/offer/deal. Drop that line and the cron silently stops seeing new records (`undefined == "none"` is false in GROQ).
- Drafts live in a separate `aiDraft` field and never touch the live fields; approval copies them across and unsets `aiDraft`.

**Bulk approval** (2026-08-01) — the queue routinely holds 40 stores and 150 offers, and used to approve one at a time. Each tab now has a per-row checkbox plus a select-all, and the green button switches to `✓ Duyệt N mục đã chọn`.
- Patches are grouped into a Sanity **transaction, in chunks of 50** — approving 150 offers costs **3 API requests, not 150**, which matters against the 250k/month Free cap. A transaction is all-or-nothing, so a failed chunk reports the real number written plus a reason instead of claiming success.
- The record open in the editor is approved through the single-item action so hand edits survive; every other ticked record is written from its stored `aiDraft`.
- ⚠️ The select-all checkbox must keep its **indeterminate** state. Without it, a partial selection shows an empty box, and clicking it wipes the selection with nothing on screen to explain why.
- All three panels stay mounted and are toggled with CSS. Rendering them conditionally rebuilt each panel from its initial props, so switching tabs and back made records you had just approved reappear as pending. The tab counts come from state for the same reason.

## Product codes (`deal.code`, #1000+)
Short human identifier per deal, so a social post can say "product #1005" and the viewer has two ways in: type it into the `/links` search box, or open `offerdy.com/d/1005`.

- Helpers: `src/lib/dealCode.ts` — `DEAL_CODE_START` (1000), `formatDealCode()`, `parseDealCode()`. Dependency-free on purpose (imported by a client component).
- **Starts at 1000** so every code is 4 digits and can never be misread as the `#` column in `/admin/deals` — that column is a display position that shifts with sort/filter/pagination, *not* a code.
- **Codes only ever increase and are never reused.** `nextDealCode()` (`src/sanity/queries.ts`) = `max(code) + 1`, deliberately not `count + START`: deleting a deal would otherwise pull the counter back and hand a live code to a different product, while the old number is still sitting in a published caption.
- **`code` is `readOnly` in the Studio and must never be edited.** A code that has been posted is a permanent public address.
- Assigned at creation on **every** write path — `createDeal()` (`src/app/admin/deals/actions.ts`) and `importDeals()` (`src/app/api/import/route.ts`). Sanity's `initialValue` does **not** apply to API-created docs, so a new path that forgets this silently produces a deal that no code can reach. The importer takes one code before the loop and increments in-memory: re-querying per row can miss a just-created doc (eventual consistency) and hand out a duplicate.
- Displayed on `/links` cards (`.lb-code`), the deal detail page (`.dd-code`, in the `.dd-store` line), and the `Mã` column in `/admin/deals` (whose search box matches code as well as title).
- Backfill: `/admin/migrate/deal-codes`. Run after any import that predates this feature. The 21 deals live on 2026-07-25 got #1000–#1020, oldest first.
- ⚠️ Concurrency: two truly simultaneous creates can collide (Sanity has no sequence). Fine for one operator + a sequential importer; if a second writer ever appears, switch to a counter document with `patch().inc()`.

## Offer deep links (`offer.productUrl`)
Sends a shopper to the **product** the offer is actually about, instead of the shop's front page. Until 2026-07-26 all 86 offers pointed at the store homepage — an offer titled "27.5 Inch Full Suspension Mountain Bike – 74% Off" dropped the visitor on the front page to go find it themselves. GoAffPro still attributes the sale via cookie, so nothing was *lost*; conversion was.

- `src/lib/affiliateUrl.ts` — `resolveOfferUrl()` (priority: product URL → offer `link` → store `affiliateLink` → store `website` → `#`), `applyTrackingParams()`, `validateProductUrl()`.
- ⚠️ **The ref code is never hardcoded.** Each GoAffPro shop is its own programme and the codes differ — `?ref=offerdy` at Consistentderma, but `?ref=xyupasuk` at Paws at Peace and `?ref=exheowpy` at 8Belle. The params are read from that store's own `affiliateLink` and copied onto the product URL, so `productUrl` is stored **bare** and stays correct if a shop ever reissues its code.
- ⚠️ **Params are only copied when the hosts match** (`www.` ignored). Shop A's ref on shop B's domain earns nothing; silently attaching it would look like tracking while tracking nothing. A cross-domain paste keeps the URL untouched and the importer warns — it usually means the wrong shop's link was pasted.
- A product URL that already carries a param keeps its own value; existing query strings and fragments survive (`?variant=42` → `?variant=42&ref=offerdy`).
- **Resolved once, in the query layer** (`resolveOfferLinks()` over all four offer projections in `src/sanity/queries.ts`), so `offer.link` handed to any component is already final. Store page, `/coupon-codes`, `/flash-sales` and the JSON-LD in `dealSchema.ts` all inherit it — no call site can forget to attach the ref. For `/coupon-codes` the resolution runs **after** `unstable_cache`: the cache holds raw Sanity rows, and joining a ref is cheap and pure.
- `StoreOfferList` previously computed **one** `destinationUrl` for the whole store and ignored `offer.link` entirely; it now takes each offer's own resolved link and keeps the store link only as a fallback.
- Filled via the `product_url` column on the Stores sheet at `/admin/import`. ⚠️ The importer had to gain an **update** path for this: a duplicate offer used to be reported "already exists, skipped", which would have made the column useless for every offer already in the dataset. It now patches `productUrl` on the matched offer (matched by `store+couponCode`, or `store+title` when there is no code). Filled cell overwrites, empty cell is a no-op — same rule as the store content columns.
- Link checking follows the destination: the nightly cron and `/admin/link-checker` both check `coalesce(productUrl, link)`. Product pages 404 far more often than homepages (SKU pulled, sold out), and a deep link to a dead page is worse than no deep link.

### Suggesting the URLs — `/admin/deep-links`
Finding 86 product URLs by hand was the real bottleneck, so `src/lib/productCatalog.ts` reads each shop's **own public catalogue** and matches it against the offer titles. The URLs are published by the merchant, not invented — but the page still only ever **suggests**: writing is a button the operator presses.

- **Two strategies, both needed.** Shopify `/products.json?limit=250` works for 9 of the 28 shops; the rest are WooCommerce/WordPress and are read from their product sitemap. Measured 2026-07-26: **21/28 shops readable**. The failures are the shops' own limits, not bugs — `venatos.com` is a frozen Shopify store ("Store unavailable", 402), `buypetplr`/`buytrustly`/`seeandbuy12` simply don't list products in their sitemaps, `graywhaletechnology`/`geekkeyboard` have no usable sitemap. The manual paste box covers them.
- ⚠️ **Tell a child sitemap from a product page by the `.xml` suffix, not by the word "product" in the URL.** Filtering on the word alone made `https://fulcrumsurf.com/product/employment/` look like a sitemap; fetching it returned HTML with no `<loc>`, so two perfectly readable shops were reported as unreadable.
- ⚠️ **Exclude `product_cat` / `product-tag` / `product-brand` sitemaps.** They contain the word "product" but list **category** pages — without this, "50% Off Pet Food" was suggested `/product-category/pet-food/`, which looks right and isn't a product page.
- ⚠️ **35 of 86 offers are store-wide** ("10% Off On Your Order at X", "Free Shipping") and have no product to point at. `meaningfulTokens()` strips promotional vocabulary and treats fewer than 2 remaining words as store-wide, suggesting nothing. Full coverage is therefore neither reachable nor desirable — a suggestion for these would necessarily be wrong.
- ⚠️ **A model code in the offer title is a requirement, not one token among many.** `MODEL_CODE` matches mixed letter+digit tokens (`pd1200`, `m800`, `t2596m`); if the offer has one, a product must carry it or it is disqualified outright. Found the hard way: "PD1200 RO Water Filter – Save $219" was suggested — and accepted — `/products/fcr100`, the *FCR100+ Replacement RO Membrane Cartridge*, on 75% agreement from the generic words "ro/water/filter". A shopper expecting $219 off a filter system lands on a cheap spare part. Frizzlife has PD1000-N/PD800-N/PD600-N but no PD1200 at all, so the correct output was **no suggestion**.
- **Matching is per-token, deliberately not `src/lib/fuzzy.ts`** — that helper only matches a single word (a whole phrase matches only as a literal substring). Score = matched meaningful tokens ÷ total meaningful tokens, floor 0.5, ties broken toward the shorter product name.
- **Only a 100% match is pre-selected**; anything less must be chosen by hand. A convenient default is the fastest way to get a wrong link saved without anyone reading it.
- Repeated scanning can trip a shop's WAF — `minerkuber.com` answered 200 and then 403 to *any* user agent during testing. Transient, not a code fault; scan again later.
- `/admin/deep-links` also lists offers that already have a link with a **Gỡ** button, because an empty Excel cell is a no-op and Sanity Studio would otherwise be the only way to remove a bad URL.

### Measuring it — and what cannot be measured
- Every offer click is stamped `deepLink: true|false` **at click time**, inside `trackOfferClick` (`src/actions/trackClick.ts`). It cannot be derived later: `productUrl` is filled in gradually, so asking "does this offer have a deep link?" tomorrow would mislabel every click that happened before the link existed. Read server-side rather than passed as a prop because the Get Deal/Get Code button lives in four places and one forgotten prop would corrupt the data invisibly.
- ⚠️ **This is click share, not conversion rate, and the reports card says so on the page.** The purchase happens inside GoAffPro and is invisible here, and offers have no impression count to serve as a denominator. Two honest limits stated in the UI: the split only means anything once both groups have real volume, and clicks recorded before the field existed belong to neither group.
- Coverage (`X / Y offers linked`) is shown on the same card in `/admin/reports`, so the work doesn't quietly stall after the first session.

### ⚠️ Link checking: "no answer" is not "dead"
`checkUrl()` returns `indeterminate: true` on timeout or network error, and **only an HTTP status ≥ 400 is ever written as `linkStatus: 'broken'`**. An indeterminate result updates `linkCheckedAt` only, so the queue advances while the previous verdict stands.

This was a live bug found on 2026-07-26, and the numbers say it best:

```
https://cycleaddons.com/             -> 200 in 559ms
https://cycleaddons.com/?ref=offerdy -> 200 in 8861ms   (old timeout: 8s)
```

The shop is perfectly alive; only the ref'd URL is slow, because GoAffPro inserts a tracking hop. Yet three offers on Cycleaddons — **the store with the most clicks on the site** — were labelled broken, along with one on Pupino (which answers 200 to every method). Consequences: Merchant Health docked the store, `/admin/reports` reported dead links that weren't, and worst of all the new safety valve below would have **switched off deep links on exactly that store**. Timeout raised 8s → 15s at the same time: an affiliate link travels through a redirect chain and is inherently slower than a normal link. `/admin/link-checker` now shows indeterminate results in a separate amber block instead of listing them as broken.

### Safety valve for dead product pages
`resolveOfferUrl()` drops back to the store link when `offer.linkStatus === 'broken'` **and** the offer has a `productUrl` — the nightly checker tests `coalesce(productUrl, link)`, so a broken status on such an offer means the *product page* is what failed. Better a live shop front page than a 404. When there is no `productUrl` the status refers to the shop link itself and nothing better exists to fall back to, so behaviour is unchanged. `unchecked` is explicitly not treated as broken.

## Sanity: two clients, two quotas
See the comment block atop `src/sanity/queries.ts`. Short version: **public reads go through `readClient` (CDN)**, and `writeClient` (direct API) is reserved for writes and the few reads that must be fresh.

- The dashboard numbers that forced this (2026-07-26): **API Requests 251.5k / 250k — exceeded**, while **API CDN Requests sat at 89 / 1,000,000**. Every public page read had been going to the small bucket and none to the large one.
- Symptom it produced: `api.sanity.io` returned 402 for everything, `getStoreBySlug` caught the error and returned `null`, so **new store pages became 404 on production** while `/deals` still looked fine off cache. A quota problem presented itself as a routing problem.
- Only three call sites keep the direct API: `nextDealCode` (a stale `max(code)` would hand out a **duplicate product code**, and a code already posted to social cannot be corrected), plus the daily-report and click-analytics reads where the operator presses "Tạo lại ngay" and must see the result immediately.
- ⚠️ **Free plan has no pay-as-you-go** (Growth does). On Free, hitting the cap stops service outright, exactly as it did here. The project auto-downgrades to Free when the Growth trial ends.
- Headroom after the fix: ~251k/month of reads against the 1M CDN allowance ≈ 25%. Raising `revalidate` above 60s was considered and **rejected as premature** — it trades content freshness for capacity that is not scarce. Revisit only if CDN usage approaches ~700k/month.
- **Admin reads also go through the CDN** (24 of the 25 `/admin` pages, 57 fetch calls). It was not just an outage workaround: admin browsing was a recurring API cost, and on Free — no pay-as-you-go — that is what causes the next outage. Staleness is normally invisible because the admin components update their own React state after a mutation instead of refetching — **but only until someone presses F5**, which is where the exception below came from.
- ⚠️ **`/admin/migrate/deal-codes` is the only page reading through `writeClient`.** It reads `max(code)` to assign product codes; a 60-second-stale answer would hand the **same code to two deals**, and a code already published in a caption cannot be corrected. Correctness beats availability there — and instead of a 500 it now renders an explanation naming `plan_limit_reached`.
- ⚠️ **`/admin/ai-review` also bypasses the CDN** (2026-08-01), via `client.withConfig({ useCdn: false })` rather than `writeClient` — a read path should not carry a write token. Reported as "approving offers succeeds but they are still there after a reload": the writes were correct (0 pending, 180 approved) and the CDN was simply still serving the pre-write answer. It looked like only offers were affected because the stores had been approved minutes earlier and the CDN had caught up by then — same bug, different timing. On a **queue**, a stale read is not cosmetic: it invites approving the same thing twice, or concluding the write failed. Cost of the fix is 3 API requests per page view.
- Writes still need the API but never break the user journey: `trackShortLink` and `AffiliateLink` swallow their own errors by design, so during the outage `/d/`, `/g/` and every Get Deal button kept working — only the click statistics were lost.

## Reviews: affiliate ref and coupon resolved at render
`/reviews/[slug]` attaches the shop's tracking params to the CTA by domain (`getStoreRefForUrl`) and falls back to that shop's coupon code when the review has none.

- ⚠️ Why it was needed: `buyUrl` used to be plain `affiliateUrl || productUrl`. A review created through `/admin/reviews` gets a ref'd URL from the form, but one created through **Excel import** carries a bare link — so the CTA inside a published review earned **nothing**, with nothing on screen to reveal it.
- The coupon fallback also means the Reviews import sheet needs no coupon column at all. Verified live: the Katyayani review has an empty `couponCode` and the page still renders that shop's real code (`duy`).

## Store page: offers with a code come first
`OFFERS_BY_STORE_QUERY` sorts by `select(defined(couponCode) && couponCode != "" => 0, 1) asc`, then `order desc`, then newest.

- **Why the code outranks the operator's `order`**: a code is the only thing a shopper can use **without clicking a link**, and GoAffPro credits the order through the code itself — so a coded offer is worth more than a link-only one regardless of entry sequence. On The KedStore the single coded offer sat at `order: 2` and was being shown third.
- ⚠️ **`order` is not discarded** — it still decides the sequence *within* each group (coded / not coded). VisoOne Eyewear shows this: four coded offers ordered 5→4→3→2, then the uncoded one.
- ⚠️ The trade-off, accepted deliberately: `order` can no longer pin an **uncoded** offer above a coded one. That follows directly from "coded offers on top by default".
- All 326 offers carry a non-zero `order`, so this field is live data, not an unused default — which is exactly why it stays as the secondary key rather than being dropped.
- Note: `OFFERS_QUERY` / `getOffers()` in `queries.ts` is **not used by any page** (dead code, same class as the deleted `StoreDealsFilter`). Left in place for now; it did not need the same sort.

## Coupon code casing
Codes are stored and displayed **exactly as typed** — no form normalises case any more. Some checkout systems treat a discount code as case-sensitive, so silently changing `MyCode` to `MYCODE` can produce a code that simply does not work, and nothing on screen would reveal it.

- ⚠️ **The three admin forms used to disagree**, which is how the data split: `/admin/offers` kept the typed case while `/admin/coupon-codes` and `/admin/reviews` forced `.toUpperCase()`. A code entered through one door looked different from the same code entered through another. All three now preserve what you type.
- Data cleanup 2026-07-26: 13 offers stored `offerdy` and were normalised to `OFFERDY` (the operator confirmed uppercase is the real code). **3 offers keep `duy`** deliberately — a different word, and nobody has confirmed whether that shop issued it upper or lower case.
- ⚠️ Still broken in the data, left for the operator: `Cocon de Lune` stores `OFFERDYOFFERDYC`, plainly a paste accident. Not auto-corrected because the intended value cannot be inferred with certainty.

## Product images: the real gallery, and no duplicates
- ⚠️ **Three image URLs can be one photo.** Measured on cycleaddons.com (2026-07-26) the scraper returned three "images" that were the same picture: the direct URL, the same file via the Jetpack CDN (`i0.wp.com/<host>/…`), and that again with `?fit=1024,1024&ssl=1`. `new Set(urls)` cannot see this, so the operator got three identical checkboxes. `src/lib/imageIdentity.ts` keys images by **filename with CDN prefix, query string and CMS size suffix stripped** (`-1024x1024`, `_500x`, `_grande`). The size suffix is only cut immediately before the extension, so a real name like `iphone_2x_case.jpg` survives.
- ⚠️ **Read the gallery from the platform API, not the DOM.** Shop themes lazy-load, so `<img src>` is empty — cycleaddons.com has 16 image files on the page and **not one** `<img>` carrying `src`. `galleryImages()` uses Shopify `/products/<handle>.js` and the WooCommerce Store API `/wp-json/wc/store/v1/products?slug=<slug>`, both of which return a clean ordered list. Result: **1 → 8 distinct images** for that scooter, 6 for Tennail, 1 for Tarujskincare (all that shop has).
- Gallery images go **first**, then JSON-LD/`og:image` as fallback, then dedupe — so the survivor of a duplicate group is the real product photo, not the social card.
- The deal modal shows the gallery as thumbnails to pick from, since a deal uses one image; reviews already had checkboxes.

## Reviews auto-attach the affiliate ref and coupon code
- The **Link Affiliate** field used to be a byte-for-byte copy of the product URL, so links inside a published review carried **no tracking at all** — clicks earned nothing. It now gets the shop's params via the same domain match as deals (`applyStoreRefToDealUrl`), and `couponCode` is filled from that store's live code. Both only when the field is untouched/empty.
- ⚠️ Fixed a pre-existing gap found here: `/admin/reviews`'s query did **not** select `couponCode`, so editing an existing review showed the field blank and saving would wipe a code that was already set.

## Adding a deal from a pasted URL (`fetchDealFromUrl`)
Paste the product link, press **⤓ Lấy từ link**, and the form fills itself. Reuses `scrapeProductPage` (already serving `/admin/reviews`), so it shares the same SSRF-safe fetch and the same JSON-LD/OpenGraph reading.

- Measured on three of the project's own shops (2026-07-26): **title 3/3, image 3/3, sale price 2/3** — a WooCommerce shop with no JSON-LD `offers` yields no price.
- ⚠️ **The original price is never guessed.** Shops publish the current price, not what it was before; that figure decides the "% off" printed on every post and OG card. The operator types it, and the discount computes itself from the two numbers (`calcDiscount`, already there).
- ⚠️ **Only empty fields are filled, never over what the operator typed** — and the note under the field states exactly what was filled and what was left alone. Silent overwriting of a corrected title would be worse than no autofill.
- Price formatting lives in `src/lib/scrapedPrice.ts`, not in `actions.ts`: a `'use server'` module may only export async functions, so a synchronous helper there would break the build. Split out, it is also testable. `$399` not `$399.00`, real decimals kept, and an **unknown currency prints its code** (`SEK 49`) rather than defaulting to `$` — a wrong currency symbol is wrong price information.
- The deals list has a **Tiếp thị** column (`✓ StoreName 🏷` / `⚠ không khớp`). The modal's warning only appears while typing, so a saved deal earning no commission had nothing to reveal it; this shows the whole list at a glance.
- Each row with a code has a **📣** button to `/admin/social-kit?code=<code>`. Adding a deal and posting it are one continuous task; before this the operator had to navigate there and search the code again. An unknown or missing code falls back to the newest deal rather than an empty state.

## Deal ↔ store cross-links, and coupon codes on `/links`
Two content groups that never referenced each other now do, both riding the domain match from `dealStoreMatch.ts`.

- **Deal page → store page**: the shop name was plain text; it is now a link to `/stores/<slug>` (`resolveDealLink` also returns `storeSlug`). A visitor looking at one product reaches the page holding *all* of that shop's codes.
- **Store page → its deals**: a "Deals at {store}" section, matched by `getDealsByStore(store.name)`. ⚠️ This only became possible today — that helper matches on the deal's **store name**, which was blank on all 22 deals until it started auto-filling from the domain. The helper and `StoreDealsFilter.tsx` had been **dead code** all along.
- ⚠️ **`StoreDealsFilter.tsx` was deleted rather than revived.** It was stale: no `dealId` passed to `AffiliateLink` (the untracked-click bug fixed elsewhere) and emoji instead of images. The new section deliberately uses **internal links to our own deal pages** and adds no second affiliate CTA — the store page already carries them above.
- **`/links` shows working coupon codes** directly (`LinkInBioCodes`), 6 rows, **one per shop**: real data has one shop with two codes (Frizzlife), and repeating a shop on a 6-row page costs another brand its slot. Codes render **exactly as stored** — production has both `OFFERDY` and `offerdy`, and some checkouts are case-sensitive, so normalising could break a code. Not sorted by clicks: at current volume that would be sorting by noise.

## Tests (`npm test`)
47 assertions over the pure logic that carries the most risk: affiliate URL building, deal↔store matching, product-title matching, and the AI caption guardrails. **Every case corresponds to a bug that actually happened** — the per-shop ref codes, the cross-domain refusal, the `javascript:` scheme, the `PD1200`→`FCR100` mismatch, the model announcing a coupon without giving it.

- Files: `tests/*.test.ts` using Node's built-in `node:test` + `node:assert`. **No test framework dependency.**
- ⚠️ Run via `scripts/run-tests.mjs`, not `node --test tests/` directly. Node reads TypeScript fine, but Node's ESM demands **full file extensions** in imports (`./affiliateUrl.ts`), while the codebase uses extensionless `@/lib/...` bundler-style aliases. Changing the source to suit Node would risk the Next build, so the script bundles each test with esbuild (alias `@` → `src`, `packages: external`) into `node_modules/.cache/offerdy-tests` and runs `node --test` on the output. Tests therefore import exactly the way `src/` files import each other.
- Bundling only — **nothing is mocked**, the tests exercise the real modules in `src/`.
- `src/lib/productMatch.ts` exists as a separate file for this reason: the pure matching logic was split out of `productCatalog.ts` so testing it needs no network, no Sanity client and no env vars.
- The suite was validated by deliberately breaking the cross-domain guard in `applyTrackingParams` — it failed the right test and passed again once reverted. Two regressions were introduced *by hand* during the 2026-07-26 session (generic narrowing, a misplaced `?? []`); this suite exists so that stops depending on luck.
- Still uncovered and worth adding: the importer's create/patch decisions, `merchantHealth` scoring, and `shortLinkSource` UA detection.

## Deal URLs get the shop's ref automatically (`applyStoreRefToDealUrl`)
The operator pastes a **bare** product link into a deal; the shop's tracking params are attached from the matched store's `affiliateLink`. Same host-matching as the coupon feature above, same reasoning as `offer.productUrl`: no match → returned untouched, never a fabricated ref.

- **Applied in the query layer** (`withDealRef` / `withDealRefs` over `getDeals`, `getAllDeals`, `getDealBySlug`, `getDealRefByCode`), so every outbound path inherits it: the Get Deal button, deal cards on `/deals` and the homepage, JSON-LD, and above all the **`/g/<code>` redirect** — the link used in social posts, where a missing ref would cost commission at the busiest click point.
- **`dealUrl` is stored bare, not rewritten in Sanity.** Change a shop's ref once on the store and every deal for that shop follows; bake it into each `dealUrl` and you must edit each deal by hand, with the ones you miss silently losing commission.
- ⚠️ The two helpers are **deliberately transparent generics** (`<T>(x: T) => Promise<T>`). Constraining them to `{ dealUrl?: string }` makes TypeScript narrow the query result down to that single field and breaks every consumer. Also keep `?? []` where it already was — `withDealRefs(null)` returns `null` unchanged, which would quietly reintroduce the demo-data fallback bug the project fixed earlier.
- **The shop's name fills `deal.store` when that field is empty** — all 22 deals had it blank, so the deal card, the detail page, the OG image and the JSON-LD `brand` said nothing about where the product is sold. The name is already implied by the domain, so no one needs to type it. Filled with `||` (an empty string counts as blank) and **never** over an operator-entered value.
- The deal modal in `/admin/deals` previews the result live under the URL field: green with the exact final URL when a store matches, green "already has tracking params" when the pasted link brought its own, **amber warning when the domain matches no store** — that case earns no commission at all, and without the hint nothing on screen would reveal it, since the ref is never stored.

## Shop coupon on a deal (`getDealCoupon`)
A deal links out to a shop; if that shop has a live coupon code, showing it makes the deal materially more attractive — and on Instagram/TikTok a **code** is the only offer that survives, because captions there cannot carry a clickable link while a code is just text the reader can retype. GoAffPro also attributes orders through the code itself, so a shopper who uses it credits us even without clicking a link.

- **The deal↔store link is derived, not declared.** `src/lib/dealStoreMatch.ts` matches the host of `dealUrl` against each store's `website` **and** `affiliateLink` (`www.` ignored, both fields checked because they are not always the same host). No reference field and no per-deal picking — a manual step on every new deal would simply be skipped. No match, or a matched store with no code → `null`, and nothing renders. Guessing would print another shop's code on the page.
- Data as of 2026-07-26: **20/28 stores have at least one coupon**, so this fires for most deals. `getDealCoupon()` caches the 28-row host list for 300s and matches in TS — GROQ cannot extract a URL's hostname.
- ⚠️ **The code is store-wide, not product-specific, and every surface says so.** Many shops exclude already-discounted items. The deal page reads "This is a store-wide code, not tied to this particular product — worth trying at checkout"; the footer adds "some items may be excluded". A code that fails at checkout costs more trust than showing nothing, so the wording never promises more than is known.
- Three surfaces: the deal page (reuses `ReviewCouponBox`, which gained optional copy props so the review page's wording is untouched), the deal OG image (white `CODE x` ticket, same idea as the store card), and captions in `/admin/social-kit`.
- ⚠️ **`{coupon}` is a separate placeholder from `{code}`.** `{code}` is the Offerdy **product** number (#1020) used to find the listing via the `/links` search box; `{coupon}` is the shop's **discount** code typed at checkout. Merging them would break the CTA rule (link-less platforms *must* carry `{code}`) and would have readers typing a product number into a discount field. The prompt states the distinction explicitly because the model conflated the two on the first attempt ("search code {code}" as the discount).
- ⚠️ **Found by testing live: the model talked about the code without giving it.** First run produced *"There's also a store-wide code at checkout if you want to check it out"* — announcing that a code exists while withholding it, which is worse than silence because it creates an expectation it doesn't satisfy. Fixed on both layers, per the project's usual split: the prompt now requires the literal `{coupon}` token, and `findUnsafeText()` rejects any variant that mentions a coupon/promo/discount code without including `{coupon}`. Re-tested live: 2/2 variants carried the code, correctly distinguishing "search #1013" from "checkout takes offerdy"; with no coupon available, 0/2 mentioned one and no placeholder leaked.

## Attribution (`ofd_src` cookie)
The only reason the platform can say *which social account earns money* rather than just *which gets views*.

- The problem it solves: `/d/1005` knows the visitor came from Instagram, but the "Get Deal" click happens on a **different request** with no usable signal left (an in-app webview sends no referer, and the internal referer is only our own deal page). Without joining the two steps you can only ever measure views per source, never clicks-to-merchant per source.
- `/d/` and `/g/` write a first-party cookie (`src/lib/attribution.ts`, `source|campaign|entryCode`, 7 days, `httpOnly`, `SameSite=Lax`). `SameSite` must be **Lax, not Strict** — Strict withholds the cookie on the very first cross-site navigation, which is exactly the hop being measured. Every `trackClick` server action reads it and stamps `source`/`campaign`/`entryCode` onto the click doc.
- **Last-touch, with a deliberate exception**: `/g/` re-detects the source per request; if that yields `direct` or `internal` it falls back to the stored cookie, so a `/g/` link clicked on our own page still credits Instagram. An *identified* external referer (`other`, Google, …) is **not** overwritten by the cookie — a new external source is real information.
- ⚠️ Same-origin detection compares the referer host to the **request's own `Host` header**, not to a hardcoded `offerdy.com`. Comparing against the constant is what made an internal referer fall through to `other` on localhost and silently break the cookie fallback (caught in testing). Any preview/staging domain would have hit the same bug.
- ⚠️ **Not mentioned in the cookie policy yet.** `/cookies` content is Sanity-editable (`configCookies`) and is the operator's to write — the analytics cookie should be described there.

## Short link straight to merchant (`/g/<code>`)
`offerdy.com/g/1005` → 302 to `deal.dealUrl`, skipping our own deal page. One less step than `/d/`, and every intermediate step loses people — use it when the post itself already says everything and only the buy-click is missing. `/d/` stays the better choice when the deal page needs to do the persuading (summary, pros/cons, FAQ, related review) or when you want to measure interest before pushing traffic out. Per-post choice, not a site-wide one — `/admin/social-kit` has a toggle.

- Missing `dealUrl` → falls back to `/deals/<slug>` rather than dead-ending.
- Counts as an **affiliate** click, not a short-link open: increments `deal.dealClicks` and writes a `click` doc with `kind: 'affiliate'`. The same counter is used by the "Get Deal" button on the deal page (`trackDealClick`), so the two paths never need to be added together.
- ⚠️ **`Disallow: /g/` in `robots.ts` + `X-Robots-Tag: noindex, nofollow` on the response.** A server-side redirect cannot carry `rel="sponsored"` the way `AffiliateLink.tsx` does, and a 302 still passes signals — leaving `/g/` crawlable would be an uncontrolled affiliate link path. `/d/` is deliberately *not* blocked: it points at our own deal page.
- The deal page "Get Deal" button was **previously untracked entirely** — a deal has no reference to a store or offer, so `AffiliateLink` had no id to pass and every click out to a merchant from a deal page was lost. It now passes `dealId`.

## Short-link tracking (`/d/<code>`)
Answers "which post actually sends traffic". Written by `src/lib/trackShortLink.ts`, read in `/admin/reports` → "🔗 Short link".

- **Two records per open**, mirroring the existing affiliate-click model (`src/actions/trackClick.ts`): a counter on the deal (`shortLinkClicks`, `readOnly`) plus a `click` document carrying `kind: 'shortlink'`, `deal` (`_weak`), `code`, `source`, optional `campaign`. There is deliberately **no `click` schema file** — these are log-only docs and a schema would dump thousands of them into the Studio.
- **`kind: 'shortlink'` exists so the affiliate report can exclude them.** Opening a short link is not a click through to a merchant; mixing the two inflates the revenue numbers. Every affiliate-click query must keep the `kind != "shortlink"` filter. Historical click docs have no `kind` at all and GROQ evaluates `null != "shortlink"` as true, so that filter is safe on old data (verified against the live 21 docs).
- **Tracking runs in `after()` (`next/server`), never inline** — two Sanity writes are 200–400ms and would be added straight onto the redirect the visitor is waiting for. Plain fire-and-forget is wrong on serverless: the runtime may end right after the response and kill the pending promise. `trackShortLinkClick` also never throws — telemetry must not break a redirect.
- **Source detection is UA-first, referer-second** (`src/lib/shortLinkSource.ts`). This is backwards from normal analytics on purpose: Instagram/TikTok in-app webviews usually send **no `Referer`**, so a referer-only implementation would report nearly every visit as "direct". Those webviews do identify themselves in the User-Agent (`Instagram`, `BytedanceWebview`/`musical_ly`, `FBAN`/`FBAV`, `Barcelona` = Threads app), which is the more reliable signal here.
- **Bots and link-preview fetchers are filtered** (`isLikelyBot`) — without it, posting a link makes the count jump purely from Facebook/WhatsApp/Slack unfurling the URL. An empty/very short UA also counts as a bot.
- **`?s=<tag>`** → `campaign`, for splitting several posts that point at the same product (`/d/1005?s=reel-jul25`). Sanitised to `[a-z0-9_-]`, max 24 chars, because the value is attacker-supplied and gets rendered back in the admin.
- `/admin/deals`: the `Mã` cell is a **click-to-copy** button (copies `https://www.offerdy.com/d/<code>`) with `opens ▸ merchant-clicks` beside it, and a `★` column toggles the `/links` pin.
- `/admin/reports` also shows **conversion by source** — opens vs merchant clicks vs rate, per source, 30 days. A source with clicks but no opens shows `—` rather than a fake percentage (someone hit `/g/` directly and never had an "open").

## `/links` ordering — pin, then measured performance (`src/lib/dealRanking.ts`)
The 12 visible slots on `/links` are the most valuable placement on the site (the Instagram/TikTok bio points here permanently), so what fills them matters.

**Pinned first** (`deal.pinnedAt`, `★` in `/admin/deals`, most-recently-pinned on top) — a manual pin always beats the score, because "today I posted about this one" is knowledge the data cannot have. Stores a **timestamp, not a boolean**: pinning several products needs an order among them. `defined(pinnedAt)` *is* the pinned state.

**Then a smoothed conversion score.** Ranking on the raw rate is wrong — one open and one click reads as 100% and outranks a genuinely good 200/40. So each deal's rate is pulled toward the site average, hard when the sample is small and less as it grows:

    score = (merchantClicks + siteAvgRate × K) / (exposures + K)      // K = 10

- A deal with **no data scores exactly the site average** — it sits in the middle, not penalised for being new. Proven-good rises above it, proven-bad (many opens, no clicks) sinks below.
- When the whole site has no data, every deal ties and the stable sort preserves newest-first — so this is a no-op until real numbers exist.
- ⚠️ **`exposures = max(opens, merchantClicks)`, not `opens`.** Some paths produce a click with no recorded open (`/g/` goes straight out; the deal-page CTA can be clicked by someone who arrived from Google), and dividing by zero opens inflated the score — caught in testing when a 1-click/0-open deal outranked a 1-click/1-open one. A click always implies at least one view, so `max` is the correct lower bound and it also keeps the rate from exceeding 100%.
- Sorted in `src/app/links/page.tsx`, **not in `ALL_DEALS_QUERY`** — `/deals` shares that query and is deliberately left newest-first.

## Link previews for `/d/` and `/g/` (`src/lib/dealPreviewHtml.ts`)
Link-preview bots get a small HTML page with our OG tags; humans and search crawlers still get the redirect.

- **Why `/g/` needs it**: it redirects straight to the merchant, and preview bots follow — pasting `offerdy.com/g/1005` into Messenger showed **HOVSCO's** card, not ours (verified: `facebookexternalhit` followed 2 hops to `hovsco.com`). Now it renders our product title, discount and OG image.
- **`/d/` already worked** — `facebookexternalhit` follows the 302 to the real deal page, which has proper OG. Serving the HTML directly just removes a hop and covers messaging clients that don't follow redirects.
- **Preview bots are matched separately from crawlers** (`isLinkPreviewBot` vs `isLikelyBot`). Googlebot on `/d/` deliberately keeps getting the 302 — a redirect consolidates signals onto the real deal page, which is better than serving it a `noindex` stand-in.
- `og:image` points at `/deals/<slug>/opengraph-image` — the existing per-deal OG card (product shot + price + discount, `src/lib/ogTemplate.tsx`). Next emits that URL with a cache-busting query hash, but **the bare path returns the same image** (verified: 200 `image/png`), so no hash guessing is needed.
- **No `<meta http-equiv="refresh">`** on the page: some preview bots follow it, which would land them back on the merchant — the exact problem being fixed. A plain link is enough for the rare human whose UA matches a preview bot.

## Social kit (`/admin/social-kit`)
Turns "compose a post" from retyping into picking a product. Caption + short link + QR in one place.

- **Caption is assembly, not authoring** — `src/lib/socialCaption.ts` only concatenates real fields (title, prices, discount badge via the shared `dealDiscountBadge`, code, link). Hashtags derive from the category name and words in the title, filtered to ≥4 letters with no digits (model numbers are not search terms). No invented marketing lines: that is the `feedback_real_content_only` rule, and a wrong-topic hashtag also pushes a post out of the right audience pool.
- The caption textarea is **derived state with an override** (`captionOverride ?? generated`), not a `useEffect` that syncs — the repo's ESLint rejects `setState` in an effect body, and the derived form is simpler anyway.
- QR uses **`qrcode` (added 2026-07-25), dynamically imported** so its ~30KB stays a lazy admin chunk — same reason `exceljs` is dynamically imported in `/admin/import`. Error-correction level `M`: survives a poorly printed or off-angle scan without the modules getting so dense that a small story-sized QR fails. SVG download for print, 1024px PNG for a 1080×1920 story.
- QR encodes the **`www.` absolute URL**, not the caption's short display form — `offerdy.com` 308-redirects to `www`, and a QR that costs an extra round trip is worse for the person scanning.

## AI caption writer (`/admin/social-kit`)
Generates 3 social captions per deal, or a whole week in one pass. The rule that shapes the whole design: **the model writes words, never numbers.**

- **Platform is chosen before the angle**, and the difference that matters is not length — it is whether a URL in the caption is clickable. **Instagram and TikTok do not linkify URLs in captions**; a caption ending "See the listing at offerdy.com/d/1020" hands the reader a task they cannot complete with one tap. For those platforms the CTA uses `{code}` and points at the bio link — which is exactly what the `/links` search box and the numeric code exist for. `findUnsafeText()` rejects any variant that slips `{link}` into a non-clickable platform.
- **Week mode** rotates two things: the **angle** (7 identical-angle posts are monotonous *and* leave nothing to compare) and the **product** — deals are picked oldest-`lastPostedAt` first, so the catalogue cycles instead of the same few items being reposted. AI calls run **sequentially**; seven parallel calls invite a rate limit, and one 429 mid-batch would spoil the lot. A failed deal is recorded in `skipped` and the batch continues.
- **Social images** come from the same `next/og` + `ogTemplate.tsx` machinery as the OG cards — no AI, no cost. `/admin/social-kit/image/[code]?format=feed|story` → 1080×1350 or 1080×1920. Story reserves 260px top / 400px bottom because Instagram and TikTok overlay their own UI there, and the content is vertically centred inside that safe band.
- **`captionLog`** records only the variant the operator actually **picks** (a discarded one says nothing). `fetchProvenCaptions()` joins that log to affiliate clicks by `?s=` tag and feeds the top performers back into the prompt as examples — but only above `MIN_CLICKS_TO_LEARN` (3). Below that, one click is luck, and teaching the model to imitate noise is worse than giving it no examples. The prompt tells it these are examples of **rhythm and structure**, never of figures — the old captions carry the old product's prices.
- ⚠️ **`OgWordmark` had rendered "Offer dy"** on every share image the site has ever produced: Satori inserts a space between two text flex items. Putting the spans on one JSX line does **not** fix it — a `marginLeft: -7` on the second span does. Found only when the wordmark appeared at social-post size.

- **Placeholder contract.** The model must emit `{price} {was} {discount} {link} {title}` and is forbidden from writing a figure itself. `fillPlaceholders()` substitutes real values from Sanity afterwards. A price or percentage the model invented is a factual claim the operator is legally answerable for — affiliate captions are advertising.
- **Two independent layers**, because a prompt is advice and a check is not: the system prompt forbids it, and `findUnsafeText()` rejects any variant containing a currency-and-digit or digit-and-`%` pattern, or an unknown `{placeholder}`. A rejected variant is dropped, not repaired — a caption that already fabricated one number isn't trustworthy in its other sentences.
- ⚠️ **Prose claims cannot be validated mechanically.** The first run produced *"that gap usually comes from clearing out overstock"* and *"a distributor is offloading inventory"* — invented explanations for the discount. The cause was **my own angle brief**, which said "give one concrete reason the gap is believable"; the model did exactly that. Rules 2b/2c now forbid explaining *why* a price is low and forbid asserting anything is "the same as" something else. This class of error is why the operator edits before posting — the guard catches numbers, not stories.
- ⚠️ **Normalisation must collapse runs, not pairs.** The model habitually writes `${price}` and `{discount} off`, giving `$$1,297.79` and `45% OFF off`. The first fix used `/([$£€₫])\s*\1/g` — which turns `$$$` (from `$${price}`) into `$$` and moves on, looking exactly like no fix at all. `\1+` is required. Cost an hour of chasing a "stale dev server" that wasn't stale.
- **Angles** (`CAPTION_ANGLES`) are separate prompts, not intensity levels: giá sốc / giải quyết vấn đề / so sánh / ai nên mua / câu hỏi. Each variant gets a `suggestedTag` like `1020-price` for the `?s=` field, so the click report can tell **which angle actually earns clicks** — the loop that closes AI-written copy against real data.
- **Voice comes from `configPersona`** (`/admin/config/persona`): bio, audience, content pillars, tone notes, banned words. This is the single biggest quality lever — without it the output is recognisably generic AI. Empty is handled explicitly ("do not invent a personality") rather than left to chance.
- **No approval queue**, unlike Store/Offer/Deal drafts: a caption is written for one specific post and edited in place. A queue would add a wait for nothing.

## Dates in admin: always go through `src/lib/adminDateTime.ts`
Sanity stores `expiresAt` as ISO UTC. `<input type="datetime-local">` has **no timezone** — it shows exactly the string you hand it and returns exactly what the operator typed. Every conversion between the two must be explicit, and the admin is pinned to **Vietnam time** (`ADMIN_TIMEZONE`), labelled `(giờ VN)` on the field.

- `isoToAdminInput(iso)` — UTC → `YYYY-MM-DDTHH:mm` in VN time, for the input's `value`.
- `adminInputToIso(local)` — what the operator typed (VN) → UTC ISO, for Sanity.
- `formatAdminDateTime(iso)` — read-only display in VN time.
- **The bug this replaced**, present in all four admin screens (coupon-codes, deals, flash-sales, offers): reading did `expiresAt.slice(0, 16)` (raw **UTC** wall clock into the input) while writing did `new Date(form.expiresAt).toISOString()` (parsed as **browser-local**). The two directions disagreed by the machine's offset, so an operator setting 21:00 saw 14:00 on reopening, and **every edit-and-save round trip shifted the time back another 7 hours** — with no visible sign, and the public countdown silently wrong. Deals and offers were worse still: they wrote `form.expiresAt` **raw**, storing a zone-less string.
- Pinned to a fixed zone rather than the browser's on purpose: the operator thinks in Vietnam time, and a fixed zone means a value entered from a different machine or while travelling still reads and saves identically. The `(giờ VN)` label is not optional — a datetime field without a stated zone is ambiguous by construction.
- ⚠️ `adminInputToIso` validates the string with a regex **before** parsing: V8's date parser is lenient enough that `new Date("rac:00Z")` returns the year 2000 rather than `Invalid Date`, so a malformed field would silently become a wrong date instead of being rejected. (Found by testing, not by reading.)

## Flash sales countdown across timezones
- The countdown itself was always correct — `new Date(expiresAt).getTime() - Date.now()` is a duration between absolute instants, identical for every viewer.
- What was wrong was the **"Expires …" line**: `toLocaleDateString` ran during SSR too, so the server (UTC) and the browser (local) produced different strings → hydration mismatch. It now renders client-side only via `useIsServer()` (`useSyncExternalStore`), which is also why it doesn't use `useEffect` + `setState` — the repo's ESLint rejects that pattern.
- It now prints `timeZoneName: 'short'` (`Expires Jul 27, 09:00 PM GMT+7`). Without it the line is ambiguous: viewers in Hanoi and New York read the same words 11 hours apart with no way to tell which zone is meant.
- **"Ends Today"** now means *before midnight tonight in the viewer's timezone*, not "within 24 hours" — a deal expiring 23:00 **tomorrow** used to appear under that label.

## Sentry: never report from local dev
All three `Sentry.init` sites (`sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts`) carry `enabled: process.env.NODE_ENV === 'production'` and an `environment` tag.

- **Why it matters more than noise**: `generateDailyReport` reads Sentry via `getRecentSentryIssues()`, so an error thrown while editing a file on `npm run dev` becomes a line in the operator's morning report and an action item telling them to fix something that never happened on the live site. This occurred on 2026-07-25 — most of that day's "5 unresolved production errors" were transient dev-server states.
- `NODE_ENV` is the right switch: `npm run dev` → `development` (off); any Vercel build, production or preview → `production` (on). Running `npm start` locally would still report — rare enough to accept.
- `environment` is `VERCEL_ENV` server-side and `NEXT_PUBLIC_VERCEL_ENV` client-side — the browser bundle only receives `NEXT_PUBLIC_*` variables.
- ⚠️ `getRecentSentryIssues()` deliberately does **not** filter `environment=production` yet. Every issue recorded before 2026-07-26 is untagged, so the filter returns **zero** and would hide real production errors — the report would drop from "5 errors" to "0" and read as if everything were fixed. Add the filter once tagged issues dominate and the legacy ones are cleared.
- The `SENTRY_AUTH_TOKEN` in `.env.local` is **read-only** (`403` on write), so issues cannot be resolved programmatically from here.

## Cron postmortem: `CRON_SECRET` had a key but an empty value
All three crons were dead from 2026-07-07 to 07-26. Root cause, and the debugging lesson, are both worth keeping.

- **The bug**: on Vercel, `CRON_SECRET` existed as a key but its **value was an empty string**. Vercel therefore had nothing to put in the `Authorization` header, and the route's `!process.env.CRON_SECRET` was true → `401`. Because the variable was marked **Sensitive**, the dashboard never shows the value, so nothing on screen revealed it was blank.
- **The lesson**: `!process.env.X` collapses **three** different states — key absent, key present with empty value, key present with a value. Not separating the first two cost several diagnostic rounds: the check reported "not readable" while the env-key listing showed `« CRON_SECRET »` at exactly 11 characters. When debugging an env var, test `'X' in process.env` **separately** from `!!process.env.X`.
- **The technique that broke the deadlock**: instead of asking the user to screenshot Vercel logs (which truncate lines, costing a round trip each time), add a **read-only page under `/admin/`** — already covered by the Basic Auth in `proxy.ts` — and `fetch` it directly using the credentials in `.env.local`. `/admin/cron-check` does this: it reports key presence, value length, whitespace, which other env vars reach the runtime, `VERCEL_ENV` and the running commit. **It never prints a value.**
- ⚠️ Env var changes take effect only on a **new deployment**. Pushing an empty commit is the fastest way to force one — no dashboard needed.
- `dailyReport.triggeredBy` (`'cron'` | `'admin'`) records which path wrote the report, shown on the card as *tự động* / *tạo tay*. Without it, a changed timestamp cannot distinguish "the cron is alive again" from "someone pressed the button" — exactly the ambiguity hit while fixing this.

## Cron auth (`src/lib/cronAuth.ts`)
All three cron routes share `verifyCronRequest()`. Vercel attaches `Authorization: Bearer <CRON_SECRET>` to cron requests when that variable exists.

- **Both sides are `trim()`ed.** A value pasted into Vercel's input very easily carries a trailing space or newline, and the resulting mismatch is invisible.
- **A failed check logs a redacted diagnostic** (`hasSecret`, `secretLength`, `hasAuthHeader`, `authHeaderLength`, `authHeaderPrefix`, `userAgent`, `lengthMatches`) via `console.error`, so it lands in Vercel Logs — which are private — while the HTTP response still says nothing but `401`. Never log the values themselves.
- **Why this exists**: all three crons were silently dead from 2026-07-07 to 07-25. The dashboard showed *Enabled* with correct schedules, `CRON_SECRET` was present for Production, the Anthropic key had credit, and Vercel Logs showed only a bare `GET 401` with no message. There was no way to tell "Vercel never sent the header" from "the value differs" from "the env var isn't reaching the runtime". The lengths in the log separate those cases: `hasAuthHeader: false` means Vercel isn't attaching it, `lengthMatches: true` with a failed compare means a genuinely different value, and a 1–2 character difference means stray whitespace.
- ⚠️ A cron that 401s **fails completely silently** — no Sentry event (401 is a response, not an exception), no admin warning. That is why `/admin/reports` also carries a staleness banner: the alarm has to live where the output is read.

## Daily report staleness + manual regenerate
A cron-written report that silently stops updating is worse than no report: it keeps rendering in a confident voice while describing a platform that no longer exists.

- **This actually happened.** `dailyReport-singleton` sat unchanged from **2026-07-07 to 2026-07-25** and the card gave no hint. Its figures — 637 stores, 633 missing content, 93 broken links, 1556 SEO issues — described the dataset from *before* the old stores were cleared; the site had **28 stores and 4 broken links**. Every one of its five AI recommendations pointed at things that no longer existed.
- **Why it stopped**: the report is written only by the Vercel cron, which authenticates with `CRON_SECRET`. `/api/cron/daily-report` returns **401 both when the secret is missing and when it mismatches**, and a cron that 401s fails silently — nothing surfaces anywhere. Evidence that no cron has ever fired: the only report ever written is timestamped 12:35 UTC while the schedule is 01:00 UTC, and neither of the other two crons has a Sanity write matching its schedule either (`link-check-nightly` last wrote 07-23 19:01 UTC, AI drafts 07-23 19:17 / 07-24 03:50 — all during working sessions). The Anthropic key was tested and is **alive with credit**, so cost was not the cause. Unconfirmed beyond that: the Vercel project lives on team `team_vFv3nz4DRjccZjLH3rfvUhtP`, which the connected Vercel MCP account cannot read (403) — check **Settings → Cron Jobs** and the Production `CRON_SECRET` in the dashboard.
- **Staleness banner** at **48h**, not 24h: Vercel triggers a daily cron within an approximate window, so 24h would cry wolf whenever it ran a few hours late.
- **"Tạo lại ngay"** (`src/app/admin/reports/actions.ts`) calls `generateDailyReport()` through a server action, so it is authorised by the admin Basic Auth in `proxy.ts` and needs no `CRON_SECRET` — an escape hatch that works even while the cron is broken. Errors are returned to the UI rather than swallowed, because the failure worth seeing here (missing key, exhausted credit) is exactly the kind that otherwise disappears. Each press is a real, billable Anthropic call, hence the `confirm()`.

## One number, one source: broken-link count
`/admin/reports` used to derive "N offer link hỏng" itself as `sum(linkChecked - linkOk)` over `getMerchantHealthData()`. The formula is correct — checked against `count(*[… linkStatus == "broken"])` and both give the same answer — but `getMerchantHealthData()` goes through `unstable_cache` (60s) while the dashboard card and sidebar badge read fresh via `adminWorkQueue`. While the nightly link-check cron is writing, the same screen showed **20** in one box and **18** in another, with nothing to tell the reader which was right. The report page now reads `queue.brokenLinks`, the same source as everywhere else.

⚠️ When checking this by hand, note `MERCHANT_HEALTH_QUERY` is `*[_type == "store"]` with **no** `published` filter — adding `published != false` to an ad-hoc query drops hidden stores (Venatos, 3 broken offers) and manufactures a discrepancy that does not exist in the app.

## Click totals: log vs counters
The four stat cards on `/admin/reports` all read from the **click log**. Do not compute "all time" by summing `offer.clicks` / `store.clicks`.

- Counters live on the document, so deleting a store deletes its click count, while the `click` log docs survive (the references are `_weak`). After ~609 old stores were removed, the counter total read **5** while the 30-day log read **21** — a table contradicting itself, with "all time" smaller than "last 30 days".
- Counters are still correct for *"how many clicks has **this** offer/store had"* — the ranking tables below keep using them. They are wrong for *"how many clicks did the site get"*.
- Same fix applied in `getClickAnalyticsSummary()` (`allTimeClicks`), which feeds the AI daily report — it had the identical flaw.

**Sanity reference gotcha**: strong references (default) block deletion of the referenced doc. `offer.store` is intentionally strong (real data integrity) but store deletion now cascades to delete its offers in one transaction rather than failing silently — see `src/app/admin/stores/actions.ts`. Analytics/log-only references (e.g. `click.offer`/`click.store`) use `_weak: true` (exact field name — `weak` is rejected by Sanity) since referential integrity doesn't matter there. When adding a new reference field, decide which case it is up front instead of defaulting to strong and discovering a deletion deadlock later.

## Pageviews: read GA4, never count them ourselves (`src/lib/ga4.ts`)
The report page had a numerator (clicks) and no denominator (visitors), so "33 clicks" could not be read as good or bad.

- GTM is already on every page (`src/app/layout.tsx`), so **pageviews are already being collected**. Adding a second counter in Sanity would produce two different answers to one question — the exact trap documented in "Click totals: log vs counters" above. So the admin *reads GA4*, it does not count.
- Auth is a **service account**, JWT signed inline with `node:crypto` (RS256) — no `@google-analytics/data` dependency for two REST calls. Needs `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` (the private key arrives with literal `\n`; the module un-escapes it, otherwise OpenSSL just says "unsupported").
- Not configured → returns **`null`**, not `0`. The UI then shows setup instructions. "Measurement is off" and "nobody visited" must never look the same.
- ⚠️ **`GA4_PROPERTY_ID` is the Property ID, not the Account ID.** Both are 9-digit numbers sitting next to each other in the GA4 admin screens and there is no way to tell them apart by eye. This cost several rounds in practice: `399807673` is the *account* (`accounts/399807673`, "offerdy.com"); the property is **`543887586`**. The symptom is a `403 User does not have sufficient permissions for this property`, which reads like a missing grant. `npm run check:ga4` now resolves the ambiguity itself: on 403 it queries the Admin API for every property the service account *can* read and prints the correct `GA4_PROPERTY_ID=…` lines.
- ⚠️ **Internal traffic is excluded at the query** (`EXCLUDE_INTERNAL` — `notExpression` over `pagePath BEGINS_WITH /admin` and `/studio`). The first real read showed 6 of the top 10 pages were `/admin/*`: the operator's own browsing. Unfiltered it was 1374 views over 30 days and a 2.2% click rate; filtered it is **762 and 3.9%** — i.e. 45% of "traffic" was us. Filter server-side rather than subtracting afterwards, because `topPages` only returns 10 rows and admin pages would otherwise crowd out real ones.
- **`npm run check:ga4`** verifies the whole chain and names the failing step. It exists because `getGa4Traffic` deliberately swallows every error and returns `null` — on screen, "not configured", "bad private key", "service account not a Viewer" and "wrong ID" all look identical. The script catches the likeliest mistake explicitly: pasting the **Measurement ID** (`G-…`) where the numeric **Property ID** belongs. It never prints key material, only lengths and prefixes.
- The report response is cached `revalidate: 300`; the token request is `no-store`. Reading multiple `dateRanges` in one request returns rows keyed `date_range_0/1/2` — parse **by name**, not row order, or "today" can come out larger than "30 days".
- `/admin/reports` also shows clicks ÷ pageviews over 30 days, with a note that GA4 filters bots differently from server-side click logging, so the two never match exactly.

## Images: cap them at the Sanity CDN, not only at `next/image` (`IMG` in `src/sanity/queries.ts`)
`image.asset->url` returns the **original** asset. Measured on `/deals` at 390px/DPR2 over throttled 4G: one 1800×1800 JPEG arrived as **290KB** to fill a 220px card, and images were 514KB of a 1232KB page.

- `next/image` was already in use with correct `sizes` on almost every render site, and it *does* work — but only for the paths that go through `/_next/image`. Three public pages use a raw `<img>` (deal / review / store detail), and the optimizer can fall back to the source URL, at which point nothing caps the size.
- Fix: every public projection appends `?w=1200&auto=format&q=75` at the GROQ level, so the origin never hands out a 2048px original to anybody. `next/image` still resizes per viewport on top of it. This also means the optimizer downloads a small file to work on.
- **1200** is the site's widest display (blog cover ≈760px CSS), with headroom for 1.5× screens. `auto=format` yields WebP/AVIF by `Accept`.
- The constant carries its own GROQ quotes (`'"?w=…"'`) because GROQ concatenates strings: `url + "?w=…"`. Verified against the live dataset: `null + "…"` is `null`, so `coalesce(image.asset->url + IMG, externalImageUrl)` still falls through correctly for posts using an external image — **never** append these params to `externalImageUrl`, it points at someone else's domain.
- Result: `/deals` 1232KB → **982KB**, images 514KB → 266KB. The remaining large block is GTM+GA4 at **284KB**, which is a business decision, not a bug.

## Search Console (`src/lib/searchConsole.ts`, `/admin/search-console`)
Built because the numbers said so: GA4 showed **12 organic-search sessions in 30 days** against 183 total. For an affiliate/coupon site organic search *is* the business model, and there was zero visibility into the Google side — which pages are indexed, which queries the site appears for, how many impressions go unclicked.

- **Shares the GA4 service account** via `src/lib/googleAuth.ts` (`getGoogleAccessToken(scope, now)`); only one new variable, `GSC_SITE_URL`. The env vars keep their `GA4_*` names on purpose — they are the shared Google identity now, and renaming would force the operator to re-enter them on Vercel for nothing.
- ⚠️ **`GSC_SITE_URL` has two incompatible legal forms**: `sc-domain:offerdy.com` (domain verification) and `https://www.offerdy.com/` (URL-prefix verification, trailing slash included). They are not interchangeable and a wrong one gives the same empty screen as "no permission". `npm run check:gsc` calls `sites.list` and prints the exact values that work — same trick that finally solved the GA4 Property-ID confusion.
- ⚠️ **Search Console lags 2–3 days.** Asking for "today" always returns empty, which on screen is indistinguishable from "nobody found the site". The window is therefore fixed at 28 days ending 3 days ago, and the UI says so.
- The page leads with the two cheapest wins rather than vanity totals: **queries at position 11–20** (already relevant, one nudge from page 1) and **impressions with zero clicks** (a title/meta problem, not a content problem).
- ⚠️ **The card that matters most: "Google vẫn xếp hạng N trang đã chết"** (`findDeadPages`). Search Console alone cannot show this — it reports impressions but not whether the URL still resolves; `/admin` alone cannot either — it does not know which URLs Google ranks. Joining the two is what exposes it. **First run, 2026-08-03: of 201 pages Google was showing, 167 returned 404 — 71% of all impressions and 24 of 28 clicks.** People searched, found the site, clicked, and landed on "Page Not Found". Cause: the store/review cleanups; Google keeps ranking a deleted URL for weeks. Some were on page 1 (`/stores/pollo-ai` position 4.8, `/stores/epz-audio` 7.4, `/reviews/beyond-marina-review-…` 204 impressions at 9.7).
- `findDeadPages` checks only the **top 40 pages by impressions**, with `HEAD` and `revalidate: 3600`, in batches of 8 — the report must not turn every page load into 200 requests against our own site. The UI states the limit rather than implying full coverage.
- Index coverage is shown as "pages that appeared in results / URLs in `sitemap.xml`", and the sitemap count is read from the **production `sitemap.xml`** rather than recounted in GROQ — `sitemap.ts` has its own inclusion rules (drops `/comparisons` while empty, only categories that have stores), so recounting would create a second answer to one question.

## The 404 page recovers traffic (`src/components/NotFoundSuggestions.tsx`)
**24 of 28 Google clicks in July 2026 landed on a 404** — deleted store/review URLs that Google still ranks. Those people typed something specific and clicked; two generic buttons threw all of it away.

- **301 redirects were considered and rejected.** The content was deleted *deliberately*, so no equivalent page exists, and Google treats a redirect to an unrelated page as a soft 404 — it forfeits the ranking and looks manipulative. Staying 404 is correct; the page just needed to be useful.
- ⚠️ **The suggestions must not cost the 404 status.** Rendering a normal page with the slug in hand would return **200**, turning a real error into a soft 404 and keeping dead URLs indexed forever. So `not-found.tsx` stays a server component (Next returns 404) and only the suggestion block is a client component reading `usePathname()`.
- `src/lib/slugKeywords.ts` turns `/reviews/beyond-marina-review-2026-best-inflatable-kayaks-…` into ranked keywords, dropping years and industry filler (`review`, `best`, `coupon`, `deal`…) — keeping those matches everything, which is as useless as matching nothing. Longest word first: it is the most distinctive.
- ⚠️ **`fuzzyMatch` is too loose for this.** It treats any substring as a hit, which is right while someone is typing but wrong here: `/stores/pollo-ai` was suggesting **"Apollo Moda"** because `"apollo moda"` contains `"pollo"`. `matchesKeyword()` tightens it to word-start matching. A confidently-presented wrong answer is worse than no answer — the page now says "We no longer carry Pollo Ai" with a search link instead.
- `/api/search-suggest` keeps its **own** GROQ query, separate from `src/sanity/queries.ts`, so the `?w=` image cap had to be applied there too — it was returning a 1200×400 PNG to fill a 28px box.

## Admin on a phone
`.adm-sidebar` was a fixed 228px with no media query at all, so on a 390px screen it ate 60% of the viewport and the offer table collapsed to one word per line. Below **900px** (`globals.css`, the `ADMIN TREN DIEN THOAI` block):
- sidebar becomes an off-canvas drawer (`.adm-sidebar--open`) behind a scrim, opened from `.adm-topbar`; it closes on any nav link click — **not** via `useEffect` on `usePathname`, because this repo's ESLint bans `set-state-in-effect`
- data tables keep their real width (`.oa-table{min-width:1080px}`) and scroll horizontally inside `.oa-table-wrap`; the name column gets `min-width:250px` or the browser shrinks it back to one word per line
- `.adm-page`, `.adm-stat-row`, `.adm-two-col`, `.adm-health-grid` replace the hard-coded inline `grid-template-columns` on the dashboard and report pages — inline styles cannot be overridden by a media query
- heights use `100dvh`, not `100vh` (mobile address bar)

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

