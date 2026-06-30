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

## Pending 🔲

### Deploy
- [ ] Deploy to Vercel
- [ ] Set env vars on Vercel: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_TOKEN`, `NEXT_PUBLIC_SITE_URL`
- [ ] Add production domain to Sanity CORS origins

### SEO / Visibility
- [ ] Submit sitemap to Google Search Console after deploy
- [ ] Add `robots.txt` rules if needed
- [ ] Verify canonical URLs resolve correctly on production

### Content
- [ ] Populate Sanity with real deals, stores, offers
- [ ] Add real blog posts (Comparison + Tips & Guides categories to populate those pages)
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
