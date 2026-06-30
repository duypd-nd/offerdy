# Offerdy — Project Context

## Stack
- **Framework**: Next.js (App Router), TypeScript, Tailwind CSS v4
- **CMS**: Sanity (project ID: `ns0upb1t`) — all reads/writes via `writeClient`
- **Hosting**: Vercel (planned)
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

## Public Pages
| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ Live | Homepage |
| `/deals` | ✅ Live | All deals |
| `/stores` | ✅ Live | Store directory |
| `/stores/[slug]` | ✅ Live | Store detail + offers |
| `/categories` | ✅ Live | Category list |
| `/categories/[slug]` | ✅ Live | Category deals |
| `/reviews` | ✅ Live | Product reviews |
| `/reviews/[slug]` | ✅ Live | Review detail |
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
| `/coupon-codes` | ✅ Live | 5-col grid, masked reveal → copy + open link, pagination |
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

## Shared Components
- `src/app/admin/_legal/LegalForm.tsx` — shared admin form for all 4 legal pages
- `src/app/admin/_legal/actions.ts` — `saveLegalPage(configId, pagePath, data)` / `getLegalPage(configId)`
- `src/components/LegalPage.tsx` — shared public UI for legal pages
- `src/components/BlogPageContent.tsx` — shared blog/post grid used by tips-guides; shows `post.imageUrl` if set, else coverEmoji fallback; English-only strings

## Sanity Config IDs
`configGeneral`, `configSocial`, `configSeo`, `configContent`, `configAbout`, `configContact`,
`configSubmitDeal`, `configPartner`, `configTerms`, `configPrivacy`, `configCookies`, `configAffiliateDisclosure`

## Static Fallback Data
`src/data/` — deals, stores, categories, reviews, posts, siteSettings (used when Sanity not configured)
