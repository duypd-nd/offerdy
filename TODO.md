# Offerdy — TODO

## Done ✅
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
- [ ] Populate Sanity with more real deals, stores, offers — in progress by user (currently 361 stores, 21 deals, 8 reviews, 6 posts)
- [ ] Write real `/comparisons` posts (category=Comparison) — still 0 posts (confirmed via Sanity query 2026-07-04), page shows empty state; needs real product/store facts, deferred pending user input
- [x] Configure About, Contact, legal pages via admin UI — confirmed all have real content (About, Contact, Terms, Privacy, Cookies, Affiliate Disclosure)
- [x] Run `/admin/migrate/footer` once on production — confirmed already applied, live `footerColumns` in Sanity matches the migration data exactly

### UX / Polish
- [ ] Flash Sales public page — verify countdown timer renders correctly across timezones
- [x] Coupon Codes — store logo image support (shows `store.imageUrl` if set, else abbr avatar)
- [x] Comparisons / Tips & Guides / Blog — featured image on post cards (`imageUrl` → `<img>`, else coverEmoji)
- [x] BlogPageContent.tsx — all English strings (no Vietnamese)
- [x] Search page — coupon codes + flash sales in results with SVG type icons

### Nice-to-have
- [x] `/posts` slug — confirmed alias to `/blog` works (live)
- [x] Monetisation: affiliate link tracking — `AffiliateLink` component + GA4 `affiliate_click` event, verified end-to-end on production
- [ ] Monetisation: ad slots (Google AdSense) — deferred until site has traffic
- [x] Analytics integration — GA4 (`G-0H313ZSF8K`) via GTM (`GTM-K3N8W8B8`), verified in Realtime
