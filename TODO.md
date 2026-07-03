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

## Pending 🔲

### Deploy
- [x] Deploy to Vercel
- [x] Set env vars on Vercel: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_TOKEN`, `NEXT_PUBLIC_SITE_URL`
- [x] Add production domain to Sanity CORS origins

### SEO / Visibility
- [ ] Submit sitemap to Google Search Console after deploy
- [ ] Fill in `/admin/config/seo` (title, description, OG image, Google Search Console verification) and `/admin/config/author` (name, bio, avatar) — currently empty, so the code wiring has no effect yet
- [ ] Verify canonical URLs resolve correctly on production

### Content
- [ ] Populate Sanity with more real deals, stores, offers
- [ ] Write real `/comparisons` posts (category=Comparison) — currently 0 posts, page shows empty state; needs real product/store facts, deferred pending user input
- [ ] Configure About, Contact, legal pages via admin UI
- [ ] Run `/admin/migrate/footer` once on production to fix footer links in Sanity

### UX / Polish
- [ ] Flash Sales public page — verify countdown timer renders correctly across timezones
- [x] Coupon Codes — store logo image support (shows `store.imageUrl` if set, else abbr avatar)
- [x] Comparisons / Tips & Guides / Blog — featured image on post cards (`imageUrl` → `<img>`, else coverEmoji)
- [x] BlogPageContent.tsx — all English strings (no Vietnamese)
- [x] Search page — coupon codes + flash sales in results with SVG type icons

### Nice-to-have
- [ ] `/posts` slug — confirm redirect or alias to `/blog` works
- [ ] Monetisation: affiliate link tracking, ad slots
- [ ] Analytics integration (Google Analytics / Plausible)
