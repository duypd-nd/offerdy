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
- **Dashboard** — inline-style stats cards (SVG icons, no emoji), 2 sections: Offers & Deals / Blog & Bài viết, config quick-links, recent activity table
- **Sidebar nav** — 5 collapsible groups (Offers & Deals · Blog & Bài viết · Trang web · Pháp lý · Cấu hình), CSS dot indicator per group, emoji-free (SVG chevron), auto-opens active group
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
- 9 list pages (stores/offers/coupon-codes/deals/flash-sales/comparisons/posts/reviews/tips-guides) + merchant-health use real URL pagination (`?page=N`; stores/offers/coupon-codes also put filters in the URL) via shared `src/lib/adminPagination.ts` + `src/app/admin/_components/{AdminPagination,useAdminUrlState,useUrlPage}` — do not reintroduce "load all then slice client-side"

## AI Engines (Anthropic Claude Sonnet 5 + Vercel Cron)
9/9 built as of 2026-07-08 (scaled-down vs. the aspirational multi-agent/queue spec in `docs/03-workflows/*.md`, which assumes infra this project doesn't have — real affiliate network APIs, job queues):
- **Content** — `src/lib/ai/generateStoreContent.ts` / `generateOfferContent.ts` / `generateDealContent.ts`, structured output (`zodOutputFormat`), hard constraint: never invent numbers/promos/codes. Cron `/api/cron/ai-content-nightly` (batch, drafts only) + manual trigger APIs under `/api/ai/content/*`. Approval in `/admin/ai-review`.
- **AI Review Writer** (2026-07-10→11) — trong `/admin/reviews`, ca 2 mode Them moi va Chinh sua deu co panel "Viet bai bang AI": admin dan link san pham (+ link affiliate rieng, tu dong = link san pham cho den khi admin tu sua) → `scrapeProductLink` (cheerio, SSRF-safe qua `src/lib/safeFetch.ts`) lay title/description/anh/gia → admin duyet/bo chon anh → `generateReviewDraft` goi `src/lib/ai/generateReviewContent.ts` (viet tieng Anh, co retry 3 lan cho loi 429/5xx/529 Overloaded va loi validate FAQ thieu, tra ve `{error}` than thien thay vi crash) sinh: excerpt, content (5 phan, khong nhung pros/cons), `prosAndCons` rieng (3-5 pros/2-4 cons, render 2-cot xanh/do giong `/deals/[slug]`), 5-8 FAQ, so sao de xuat, gradient theo danh muc → upload anh len Sanity + thay placeholder `[IMAGE:n]`/`[CTA]` bang the that gan link affiliate → do vao form de admin sua truoc khi Luu (khong co hang doi duyet rieng, khac voi Store/Offer/Deal; mode edit khong bi doi slug/URL bai da co). Field moi tren `review`: `productUrl`, `affiliateUrl`, `faq`, `prosAndCons`, `metaTitle`, `metaDescription`, `couponCode`. Trang chu (`/`) chi hien 2 hang review (`reviewsGridColumns * 2`), xem full o `/reviews`. Da bo doan disclosure trung lap AI tu chen vao cuoi `content` (site da co disclaimer chung o `globalConfig.articleDisclaimer`).
- **Review coupon box** (2026-07-11) — field `couponCode` (string, tuy chon) tren `review`, sua o `/admin/reviews` (o rieng, de trong = an). Neu co gia tri, `/reviews/[slug]` render `src/components/ReviewCouponBox.tsx` — "ticket" gradient teal/xanh ngoc, 2 vet khuyet tron 2 ben, ma code bam-de-copy (dashed border cam, tooltip "Copied!"), nut "Get Code & Shop" tro toi `affiliateUrl || productUrl`. CSS `.rv-coupon*` trong `globals.css`.
- **Review Excel import** — them 7 cot vao sheet Reviews tai `/admin/import`: `productUrl`, `affiliateUrl`, `pros`/`cons` (moi dong 1 y trong o), `faq` (cap Q/A cach nhau 1 dong trong, dung chung parser voi form admin), `metaTitle`, `metaDescription`. Backend `importReviews()` trong `src/app/api/import/route.ts`.
- **Import — Deals sheet** (2026-07-24) — 4th import sheet (`importDeals()` in `route.ts`). Matches by `slug(title)`: existing deal patched, new title created ("both" model). Filled cell overwrites, blank is a no-op — so content can be added to the 21 existing deals with just `title` + the 5 AI content columns (`summary`/`metaTitle`/`metaDescription`/`faq`/`pros`+`cons`) while price/store stay untouched. New deals require `store`/`priceSale`/`priceOrig`/`discount` (1–99). Basic fields ARE writable (a deal's outbound link is `dealUrl`, not a protected affiliate field); `category` resolves a reference by name-or-slug; `imageUrl` uses the SSRF-safe uploader.
- **Import — store content columns** (2026-07-24) — the Stores sheet carries full store copy, not just basics: 7 `about_*` columns + `metaTitle`/`metaKeywords`/`metaDescription` + `faq`/`pros`/`cons`. `about_*` is assembled by the **same `renderAboutHtml()`** as `approveAiDraft`, so imported and AI-written stores are byte-identical; card icons/titles live in `ABOUT_CARDS` (`route.ts`), not in columns. Existing stores are now **patched** (they used to be reuse-id-and-ignore-everything), but **only** on content fields — `affiliateLink` and the basics are deliberately excluded. Semantics: filled cell overwrites, blank cell is a no-op, content read once per store from the first row carrying it, `about_*` beats raw `store_about`. **`about_intro` must start lowercase with a verb** — it renders after `<strong>{Store}</strong> ` as one sentence.
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

## Daily report staleness + manual regenerate
A cron-written report that silently stops updating is worse than no report: it keeps rendering in a confident voice while describing a platform that no longer exists.

- **This actually happened.** `dailyReport-singleton` sat unchanged from **2026-07-07 to 2026-07-25** and the card gave no hint. Its figures — 637 stores, 633 missing content, 93 broken links, 1556 SEO issues — described the dataset from *before* the old stores were cleared; the site had **28 stores and 4 broken links**. Every one of its five AI recommendations pointed at things that no longer existed.
- **Why it stopped**: the report is written only by the Vercel cron, which authenticates with `CRON_SECRET`. `/api/cron/daily-report` returns **401 both when the secret is missing and when it mismatches**, and a cron that 401s fails silently — nothing surfaces anywhere. Evidence that no cron has ever fired: the only report ever written is timestamped 12:35 UTC while the schedule is 01:00 UTC, and neither of the other two crons has a Sanity write matching its schedule either (`link-check-nightly` last wrote 07-23 19:01 UTC, AI drafts 07-23 19:17 / 07-24 03:50 — all during working sessions). The Anthropic key was tested and is **alive with credit**, so cost was not the cause. Unconfirmed beyond that: the Vercel project lives on team `team_vFv3nz4DRjccZjLH3rfvUhtP`, which the connected Vercel MCP account cannot read (403) — check **Settings → Cron Jobs** and the Production `CRON_SECRET` in the dashboard.
- **Staleness banner** at **48h**, not 24h: Vercel triggers a daily cron within an approximate window, so 24h would cry wolf whenever it ran a few hours late.
- **"Tạo lại ngay"** (`src/app/admin/reports/actions.ts`) calls `generateDailyReport()` through a server action, so it is authorised by the admin Basic Auth in `proxy.ts` and needs no `CRON_SECRET` — an escape hatch that works even while the cron is broken. Errors are returned to the UI rather than swallowed, because the failure worth seeing here (missing key, exhausted credit) is exactly the kind that otherwise disappears. Each press is a real, billable Anthropic call, hence the `confirm()`.

## Click totals: log vs counters
The four stat cards on `/admin/reports` all read from the **click log**. Do not compute "all time" by summing `offer.clicks` / `store.clicks`.

- Counters live on the document, so deleting a store deletes its click count, while the `click` log docs survive (the references are `_weak`). After ~609 old stores were removed, the counter total read **5** while the 30-day log read **21** — a table contradicting itself, with "all time" smaller than "last 30 days".
- Counters are still correct for *"how many clicks has **this** offer/store had"* — the ranking tables below keep using them. They are wrong for *"how many clicks did the site get"*.
- Same fix applied in `getClickAnalyticsSummary()` (`allTimeClicks`), which feeds the AI daily report — it had the identical flaw.

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

