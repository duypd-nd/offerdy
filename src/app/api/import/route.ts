import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'
import { generateStoreContent } from '@/lib/ai/generateStoreContent'
import { renderAboutHtml, type AboutContent } from '@/lib/ai/aboutTemplate'
import { normalize } from '@/lib/fuzzy'
import { uploadImageFromUrl } from '@/lib/safeFetch'

const IMPORT_AI_STORE_CAP = Number(process.env.IMPORT_AI_STORE_CAP) || 8

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

type ImportRow = Record<string, string | number | boolean | null | undefined>
type SanityDoc = { _type: string } & Record<string, unknown>

function offerCodeKey(storeId: string, couponCode: string) {
  return `${storeId}::code::${normalize(couponCode)}`
}
function offerTitleKey(storeId: string, title: string) {
  return `${storeId}::title::${normalize(title)}`
}

// The 4 "About the Brand" cards. Only the card TEXT is importable — icon and
// title are fixed here so hand-written stores match the AI-written ones (the AI
// generates these too, but always to this same convention). Editable per-store
// in /admin/stores afterwards if a brand needs something different.
const ABOUT_CARDS = [
  { column: 'about_product_range',       icon: '🛍️', title: 'Product Range' },
  { column: 'about_customer_benefits',   icon: '✨', title: 'Customer Benefits' },
  { column: 'about_shopping_experience', icon: '🚚', title: 'Shopping Experience' },
  { column: 'about_why_choose',          icon: '⭐', title: null }, // -> `Why Choose {storeName}`
] as const

// Every column that writes store-level content. Basic fields (website, category,
// maxOffer, logo, affiliateLink) are deliberately NOT here: an existing store's
// affiliate link is live revenue and must never be touched by a content import.
const STORE_CONTENT_COLUMNS = [
  'store_description', 'store_about',
  'about_tagline', 'about_badge', 'about_intro',
  ...ABOUT_CARDS.map((c) => c.column),
  'metaTitle', 'metaKeywords', 'metaDescription',
  'faq', 'pros', 'cons',
]

function cellText(row: ImportRow, key: string): string {
  return String(row[key] ?? '').trim()
}

function hasStoreContent(row: ImportRow): boolean {
  return STORE_CONTENT_COLUMNS.some((k) => cellText(row, k) !== '')
}

// Build the store fields to write from a row's content columns.
// A blank cell omits its key entirely, so a patch can never blank out content
// that is already live — that is the agreed rule: filled cell overwrites, empty
// cell is a no-op.
function buildStoreContentPatch(
  row: ImportRow,
  storeName: string
): { patch: Record<string, unknown>; warnings: string[] } {
  const patch: Record<string, unknown> = {}
  const warnings: string[] = []

  const shortDescription = cellText(row, 'store_description')
  if (shortDescription) patch.shortDescription = shortDescription

  // About block — feeds the SAME renderAboutHtml() the AI approval path uses
  // (see approveAiDraft in /admin/ai-review/actions.ts), so an imported store
  // and an AI-generated store produce byte-identical markup.
  const tagline = cellText(row, 'about_tagline')
  const badge = cellText(row, 'about_badge')
  const intro = cellText(row, 'about_intro')
  const cardTexts = ABOUT_CARDS.map((c) => cellText(row, c.column))
  const hasStructuredAbout = Boolean(tagline || badge || intro || cardTexts.some(Boolean))
  const rawAbout = cellText(row, 'store_about')

  if (hasStructuredAbout) {
    if (rawAbout) {
      warnings.push(
        `"${storeName}": dien ca "store_about" (HTML tho) lan cac cot "about_*" - dung about_*, bo qua store_about`
      )
    }
    const [productRange, customerBenefits, shoppingExperience, whyChoose] = ABOUT_CARDS.map((c, i) => ({
      icon: c.icon,
      title: c.title ?? `Why Choose ${storeName}`,
      text: cardTexts[i],
    }))
    const about: AboutContent = {
      tagline,
      introBadgeEmoji: badge || '🛍️',
      introText: intro,
      productRange, customerBenefits, shoppingExperience, whyChoose,
    }
    patch.description = renderAboutHtml(storeName, about)

    const emptyCards = cardTexts.filter((t) => !t).length
    if (emptyCards) {
      warnings.push(`"${storeName}": thieu noi dung ${emptyCards}/4 the About - the do se hien trong tren trang store`)
    }
    if (!intro) warnings.push(`"${storeName}": thieu "about_intro" - doan gioi thieu se chi con moi ten store`)
  } else if (rawAbout) {
    patch.description = rawAbout
  }

  const metaTitle = cellText(row, 'metaTitle')
  if (metaTitle) patch.metaTitle = metaTitle
  const metaKeywords = cellText(row, 'metaKeywords')
  if (metaKeywords) patch.metaKeywords = metaKeywords
  const metaDescription = cellText(row, 'metaDescription')
  if (metaDescription) patch.metaDescription = metaDescription

  // Same parsers/conventions as the Reviews sheet, so the input format an
  // operator already learned there carries over unchanged.
  const faqText = cellText(row, 'faq')
  if (faqText) {
    const faq = parseFaqText(faqText)
    if (faq.length) patch.faq = faq
    else warnings.push(`"${storeName}": cot "faq" co chu nhung khong tach duoc cap Q/A - moi cap can cach nhau 1 dong trong`)
  }

  const prosText = cellText(row, 'pros')
  const consText = cellText(row, 'cons')
  const pros = prosText ? linesToList(prosText) : []
  const cons = consText ? linesToList(consText) : []
  if (pros.length || cons.length) patch.prosAndCons = { pros, cons }

  return { patch, warnings }
}

// Combined: each row = 1 offer; rows with same store_name share the same store
async function importStoresAndOffers(rows: ImportRow[]) {
  const results: {
    imported: number
    errors: { row: number; message: string }[]
    warnings: { row: number; message: string }[]
    aiDrafts: { storeId: string; storeName: string; ok: boolean }[]
  } = {
    imported: 0,
    errors: [],
    warnings: [],
    aiDrafts: [],
  }

  // Pre-load existing stores into cache (description/category/website/maxOffer needed
  // later to decide + populate AI draft generation for matched-existing stores)
  const existingStores = await writeClient.fetch<{
    _id: string; name: string; description?: string; category?: string; website?: string; maxOffer?: number
  }[]>(`*[_type == "store"]{_id, name, description, category, website, maxOffer}`)
  const storeCache = new Map(existingStores.map((s) => [s.name.toLowerCase(), s._id]))
  const storeInfo = new Map(existingStores.map((s) => [s._id, s]))

  // Pre-load existing offers for duplicate detection (store+couponCode, or store+title
  // when no code) — extended within the loop so duplicates inside the same file are
  // also caught, not just against data already in Sanity. Scoped to ACTIVE offers only:
  // a coupon that was previously deactivated (expired/removed) and legitimately comes
  // back in a new import should be allowed to be re-created, not blocked forever.
  const existingOffers = await writeClient.fetch<{ storeId: string; title: string; couponCode?: string }[]>(
    `*[_type == "offer" && active == true]{ "storeId": store._ref, title, couponCode }`
  )
  const offerKeys = new Set<string>()
  for (const o of existingOffers) {
    if (o.couponCode) offerKeys.add(offerCodeKey(o.storeId, o.couponCode))
    else offerKeys.add(offerTitleKey(o.storeId, o.title))
  }

  // Stores touched this batch that end up with no description — candidates for a
  // bounded, inline AI draft generation pass after the main loop (see guardrail note
  // in the plan: capped so we never risk a serverless timeout on a 50-row batch).
  const aiCandidates = new Map<string, { id: string; name: string; category?: string; website?: string; maxOffer?: number }>()

  // Store-level content is read ONCE per store: this sheet repeats the store on
  // every offer row, so the first row carrying content wins and any later row
  // with content is reported instead of silently overwriting it.
  const storeContentApplied = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const storeName = String(row.store_name ?? '').trim()
    const link = String(row.link ?? '').trim()
    const offerText = String(row.Offer ?? row.offerText ?? '').trim()
    const offerTitle = String(row.offer_title ?? '').trim()

    if (!storeName) {
      results.errors.push({ row: i + 2, message: 'Thieu cot "store_name"' })
      continue
    }
    if (!link) {
      results.errors.push({ row: i + 2, message: `Dong ${i + 2} "${storeName}": thieu "link"` })
      continue
    }

    try {
      // Find or create store
      let storeId = storeCache.get(storeName.toLowerCase())

      // Resolve this row's store-level content before touching Sanity, so the
      // create path can inline it and the update path can patch it.
      const rowHasContent = hasStoreContent(row)
      const alreadyApplied = storeId ? storeContentApplied.has(storeId) : false
      let contentPatch: Record<string, unknown> = {}
      if (rowHasContent && alreadyApplied) {
        results.warnings.push({
          row: i + 2,
          message: `"${storeName}": da lay noi dung store tu dong truoc, bo qua cot noi dung o dong nay`,
        })
      } else if (rowHasContent) {
        const built = buildStoreContentPatch(row, storeName)
        contentPatch = built.patch
        for (const message of built.warnings) results.warnings.push({ row: i + 2, message })
      }

      if (!storeId) {
        const slug = slugify(storeName)
        const storeDoc: SanityDoc = {
          _type: 'store',
          name: storeName,
          slug: { _type: 'slug', current: slug },
          published: true,
          affiliateLink: link,
          // Sanity's schema `initialValue` only applies inside Studio's own creation
          // form, never to documents created via writeClient.create() — must set
          // explicitly or this stays undefined and silently fails `== "none"` filters
          // (e.g. the nightly AI-content cron never picks the store up).
          aiReviewStatus: 'none',
        }
        if (row.abbr) storeDoc.abbr = String(row.abbr).substring(0, 3)
        if (row.website) storeDoc.website = String(row.website)
        if (row.category) storeDoc.category = String(row.category)
        if (row.maxOffer) storeDoc.maxOffer = Number(row.maxOffer)
        Object.assign(storeDoc, contentPatch)

        // Upload logo image if URL provided
        if (row.store_imageUrl) {
          const uploaded = await uploadImageFromUrl(String(row.store_imageUrl))
          if ('image' in uploaded) {
            storeDoc.image = uploaded.image
          } else {
            results.warnings.push({
              row: i + 2,
              message: `"${storeName}": khong tai duoc anh logo - ${uploaded.error}`,
            })
          }
        }

        const created = await writeClient.create(storeDoc)
        storeId = created._id
        storeCache.set(storeName.toLowerCase(), storeId)
        if (Object.keys(contentPatch).length > 0) storeContentApplied.add(storeId)

        if (!storeDoc.description) {
          aiCandidates.set(storeId, {
            id: storeId, name: storeName,
            category: storeDoc.category as string | undefined,
            website: storeDoc.website as string | undefined,
            maxOffer: storeDoc.maxOffer as number | undefined,
          })
        }
      } else {
        // Existing store: content columns now update it (previously every store
        // field on a repeat import was silently ignored). Scoped to the content
        // patch only — basic fields and the affiliate link are never touched.
        if (Object.keys(contentPatch).length > 0) {
          await writeClient.patch(storeId).set(contentPatch).commit()
          storeContentApplied.add(storeId)
          const info = storeInfo.get(storeId)
          if (info && typeof contentPatch.description === 'string') {
            info.description = contentPatch.description
          }
        }

        if (!aiCandidates.has(storeId)) {
          const info = storeInfo.get(storeId)
          if (info && !info.description) {
            aiCandidates.set(storeId, {
              id: storeId, name: info.name, category: info.category, website: info.website, maxOffer: info.maxOffer,
            })
          }
        }
      }

      // Create offer (skip if no offerText, or if it's a duplicate of one already on this store)
      if (offerText) {
        const title = offerTitle || `Uu dai tai ${storeName}`
        const couponCode = row.couponCode ? String(row.couponCode).trim() : ''
        const dupKey = couponCode ? offerCodeKey(storeId, couponCode) : offerTitleKey(storeId, title)

        if (offerKeys.has(dupKey)) {
          results.warnings.push({
            row: i + 2,
            message: `"${storeName}": offer "${title}" da ton tai, bo qua`,
          })
        } else {
          const offerDoc: SanityDoc = {
            _type: 'offer',
            title,
            offerText,
            link,
            store: { _type: 'reference', _ref: storeId },
            active: String(row.active).toLowerCase() !== 'false' && row.active !== 0,
            verified: String(row.verified).toLowerCase() !== 'false' && row.verified !== 0,
            order: row.order ? Number(row.order) : 0,
            votesActive: 0,
            votesExpired: 0,
            // Same reasoning as storeDoc.aiReviewStatus above — schema initialValue
            // does not apply to API-created documents.
            aiReviewStatus: 'none',
            linkStatus: 'unchecked',
          }
          if (couponCode) offerDoc.couponCode = couponCode
          if (row.expiresAt) {
            try {
              offerDoc.expiresAt = new Date(String(row.expiresAt)).toISOString()
            } catch {
              // skip invalid date
            }
          }

          await writeClient.create(offerDoc)
          offerKeys.add(dupKey)
        }
      }

      results.imported++
    } catch (err) {
      results.errors.push({ row: i + 2, message: String(err) })
    }
  }

  // Bounded inline AI draft generation — see guardrail note in the plan for why this
  // is capped instead of covering every candidate (Anthropic call latency vs. Vercel
  // function timeout on a 50-row batch). Any candidate beyond the cap is still picked
  // up automatically by the nightly cron (aiReviewStatus defaults to 'none').
  const capped = [...aiCandidates.values()].slice(0, IMPORT_AI_STORE_CAP)
  const aiResults = await Promise.all(
    capped.map(async (candidate) => {
      try {
        await generateStoreContent(candidate)
        return { storeId: candidate.id, storeName: candidate.name, ok: true }
      } catch {
        return { storeId: candidate.id, storeName: candidate.name, ok: false }
      }
    })
  )
  results.aiDrafts.push(...aiResults)

  revalidatePath('/admin/stores')
  revalidatePath('/admin/offers')
  revalidatePath('/', 'page')
  revalidatePath('/stores')
  revalidatePath('/stores/[slug]', 'page')
  revalidatePath('/coupon-codes')
  return results
}

type Schedule = { postsPerDay: number; startDate: string; startIndex: number }

// Excel luu ngay o dinh dang "date" thanh so serial (vd 46206), khac voi cell dang text
// ("2026-07-03") duoc doc dung luon. Neu khong quy doi, publishedAt se la chuoi so vo nghia
// va bi PUBLISHED_FILTER coi nhu ngay trong tuong lai (an bai vinh vien).
function normalizePublishedAt(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = Date.UTC(1899, 11, 30) + value * 86400000
    return new Date(ms).toISOString().slice(0, 10)
  }
  return String(value)
}

function linesToList(text: string): string[] {
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}

// A blank cell returns undefined so the caller can leave the field untouched
// (the no-op rule); a filled cell is truthy unless it clearly reads as false.
function parseBool(value: unknown): boolean | undefined {
  const s = String(value ?? '').trim().toLowerCase()
  if (s === '') return undefined
  return s !== 'false' && s !== '0' && s !== 'no'
}

function parseFaqText(text: string): { question: string; answer: string }[] {
  return text.split(/\n\s*\n/).map(block => {
    const [question, ...rest] = block.split('\n')
    return { question: (question ?? '').trim(), answer: rest.join('\n').trim() }
  }).filter(f => f.question && f.answer)
}

function scheduledPublishedAt(rowIndex: number, schedule?: Schedule): string | null {
  if (!schedule || schedule.postsPerDay < 1) return null
  const globalIndex = schedule.startIndex + rowIndex
  const dayOffset = Math.floor(globalIndex / schedule.postsPerDay)
  const date = new Date(schedule.startDate)
  date.setUTCDate(date.getUTCDate() + dayOffset)
  date.setUTCHours(9, 0, 0, 0)
  return date.toISOString()
}

async function importPosts(rows: ImportRow[], schedule?: Schedule) {
  const results: { imported: number; errors: { row: number; message: string }[] } = {
    imported: 0,
    errors: [],
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const title = String(row.title ?? '').trim()
    if (!title) {
      results.errors.push({ row: i + 2, message: 'Thieu title' })
      continue
    }

    try {
      const slug = slugify(title)
      const existing = await writeClient.fetch(
        `*[_type == "post" && slug.current == $slug][0]._id`,
        { slug }
      )
      if (existing) {
        results.errors.push({ row: i + 2, message: `Post "${title}" da ton tai` })
        continue
      }

      const doc: SanityDoc = {
        _type: 'post',
        title,
        slug: { _type: 'slug', current: slug },
      }
      if (row.excerpt) doc.excerpt = String(row.excerpt)
      if (row.category) doc.category = String(row.category)
      if (row.author) doc.author = String(row.author)
      const scheduled = scheduledPublishedAt(i, schedule)
      if (scheduled) doc.publishedAt = scheduled
      else if (row.publishedAt) doc.publishedAt = normalizePublishedAt(row.publishedAt)
      if (row.coverEmoji) doc.coverEmoji = String(row.coverEmoji)
      if (row.coverBg) doc.coverBg = String(row.coverBg)
      if (row.readTime) doc.readTime = Number(row.readTime)
      if (row.content) doc.content = String(row.content)
      if (row.externalImageUrl) doc.externalImageUrl = String(row.externalImageUrl)

      await writeClient.create(doc)
      results.imported++
    } catch (err) {
      results.errors.push({ row: i + 2, message: String(err) })
    }
  }

  revalidatePath('/admin/posts')
  return results
}

async function importReviews(rows: ImportRow[], schedule?: Schedule) {
  const results: { imported: number; errors: { row: number; message: string }[] } = {
    imported: 0,
    errors: [],
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const title = String(row.title ?? '').trim()
    const excerpt = String(row.excerpt ?? '').trim()
    const tag = String(row.tag ?? 'Review').trim()
    const stars = row.stars ? Number(row.stars) : 0

    if (!title) {
      results.errors.push({ row: i + 2, message: 'Thieu title' })
      continue
    }
    if (!excerpt) {
      results.errors.push({ row: i + 2, message: `Dong ${i + 2}: thieu excerpt` })
      continue
    }
    if (!stars || stars < 1 || stars > 5) {
      results.errors.push({ row: i + 2, message: `Dong ${i + 2}: stars phai tu 1-5` })
      continue
    }

    try {
      const slug = slugify(title)
      const existing = await writeClient.fetch(
        `*[_type == "review" && slug.current == $slug][0]._id`,
        { slug }
      )
      if (existing) {
        results.errors.push({ row: i + 2, message: `Review "${title}" da ton tai` })
        continue
      }

      const doc: SanityDoc = {
        _type: 'review',
        title,
        slug: { _type: 'slug', current: slug },
        excerpt,
        tag,
        stars,
      }
      if (row.emoji) doc.emoji = String(row.emoji)
      if (row.author) doc.author = String(row.author)
      const scheduled = scheduledPublishedAt(i, schedule)
      if (scheduled) doc.publishedAt = scheduled
      else if (row.publishedAt) doc.publishedAt = normalizePublishedAt(row.publishedAt)
      if (row.imgBg) doc.imgBg = String(row.imgBg)
      if (row.content) doc.content = String(row.content)
      if (row.externalImageUrl) doc.externalImageUrl = String(row.externalImageUrl)
      if (row.productUrl) doc.productUrl = String(row.productUrl)
      if (row.affiliateUrl) doc.affiliateUrl = String(row.affiliateUrl)
      const pros = row.pros ? linesToList(String(row.pros)) : []
      const cons = row.cons ? linesToList(String(row.cons)) : []
      if (pros.length || cons.length) doc.prosAndCons = { pros, cons }
      if (row.faq) {
        const faq = parseFaqText(String(row.faq))
        if (faq.length) doc.faq = faq
      }
      if (row.metaTitle) doc.metaTitle = String(row.metaTitle)
      if (row.metaDescription) doc.metaDescription = String(row.metaDescription)

      await writeClient.create(doc)
      results.imported++
    } catch (err) {
      results.errors.push({ row: i + 2, message: String(err) })
    }
  }

  revalidatePath('/admin/reviews')
  return results
}

// Each row = 1 deal, matched by slug(title): existing deal is updated, new
// title creates a deal. Filled cell overwrites, blank cell is a no-op — so
// adding content to the 21 existing deals only needs title + content columns
// (price/store left blank stay untouched). Basic fields ARE writable here
// (unlike the store importer) because a deal has no separate affiliate-link
// field to protect — its outbound link is `dealUrl`, which the operator owns.
async function importDeals(rows: ImportRow[]) {
  const results: {
    imported: number
    errors: { row: number; message: string }[]
    warnings: { row: number; message: string }[]
  } = { imported: 0, errors: [], warnings: [] }

  const existingDeals = await writeClient.fetch<{ _id: string; slug: string }[]>(
    `*[_type == "deal"]{ _id, "slug": slug.current }`
  )
  const dealBySlug = new Map(existingDeals.map((d) => [d.slug, d._id]))

  // Category is a reference; resolve by name OR slug (case-insensitive). A value
  // that matches neither is reported and dropped rather than failing the row.
  const cats = await writeClient.fetch<{ _id: string; name?: string; slug?: string }[]>(
    `*[_type == "category"]{ _id, name, "slug": slug.current }`
  )
  const catByKey = new Map<string, string>()
  for (const c of cats) {
    if (c.name) catByKey.set(c.name.toLowerCase(), c._id)
    if (c.slug) catByKey.set(c.slug.toLowerCase(), c._id)
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const title = cellText(row, 'title')
    if (!title) {
      results.errors.push({ row: i + 2, message: 'Thieu cot "title"' })
      continue
    }
    const slug = slugify(title)
    const existingId = dealBySlug.get(slug)

    try {
      const fields: Record<string, unknown> = {}
      const warnings: string[] = []

      const store = cellText(row, 'store')
      if (store) fields.store = store
      const priceSale = cellText(row, 'priceSale')
      if (priceSale) fields.priceSale = priceSale
      const priceOrig = cellText(row, 'priceOrig')
      if (priceOrig) fields.priceOrig = priceOrig

      const discountRaw = cellText(row, 'discount')
      let discount: number | undefined
      if (discountRaw) {
        discount = Number(discountRaw)
        if (!Number.isFinite(discount) || discount < 1 || discount > 99) {
          results.errors.push({ row: i + 2, message: `"${title}": discount phai la so tu 1-99` })
          continue
        }
        fields.discount = discount
      }

      const discountByAmount = parseBool(row.discountByAmount)
      if (discountByAmount !== undefined) fields.discountByAmount = discountByAmount
      const isExpiring = parseBool(row.isExpiring)
      if (isExpiring !== undefined) fields.isExpiring = isExpiring
      const verified = parseBool(row.verified)
      if (verified !== undefined) fields.verified = verified

      const emoji = cellText(row, 'emoji')
      if (emoji) fields.emoji = emoji
      const imgClass = cellText(row, 'imgClass')
      if (imgClass) fields.imgClass = imgClass
      const dealUrl = cellText(row, 'dealUrl')
      if (dealUrl) fields.dealUrl = dealUrl

      const expiresRaw = cellText(row, 'expiresAt')
      if (expiresRaw) {
        const d = new Date(expiresRaw)
        if (Number.isNaN(d.getTime())) warnings.push(`"${title}": expiresAt "${expiresRaw}" khong hop le, bo qua`)
        else fields.expiresAt = d.toISOString()
      }

      const catRaw = cellText(row, 'category')
      if (catRaw) {
        const cid = catByKey.get(catRaw.toLowerCase())
        if (cid) fields.category = { _type: 'reference', _ref: cid }
        else warnings.push(`"${title}": danh muc "${catRaw}" khong ton tai, bo qua`)
      }

      // ── AI-style content (the same 5 fields the Deal AI draft writes) ──
      const summary = cellText(row, 'summary')
      if (summary) fields.summary = summary
      const metaTitle = cellText(row, 'metaTitle')
      if (metaTitle) fields.metaTitle = metaTitle
      const metaDescription = cellText(row, 'metaDescription')
      if (metaDescription) fields.metaDescription = metaDescription
      const faqText = cellText(row, 'faq')
      if (faqText) {
        const faq = parseFaqText(faqText)
        if (faq.length) fields.faq = faq
        else warnings.push(`"${title}": cot "faq" khong tach duoc cap Q/A - moi cap cach nhau 1 dong trong`)
      }
      const pros = cellText(row, 'pros') ? linesToList(cellText(row, 'pros')) : []
      const cons = cellText(row, 'cons') ? linesToList(cellText(row, 'cons')) : []
      if (pros.length || cons.length) fields.prosAndCons = { pros, cons }

      // Product image: same SSRF-safe uploader the store logos use.
      const imageUrl = cellText(row, 'imageUrl')
      if (imageUrl) {
        const uploaded = await uploadImageFromUrl(imageUrl)
        if ('image' in uploaded) fields.image = uploaded.image
        else warnings.push(`"${title}": khong tai duoc anh - ${uploaded.error}`)
      }

      for (const message of warnings) results.warnings.push({ row: i + 2, message })

      if (existingId) {
        if (Object.keys(fields).length === 0) {
          results.warnings.push({ row: i + 2, message: `"${title}": deal da ton tai nhung khong co o nao de cap nhat, bo qua` })
          continue
        }
        await writeClient.patch(existingId).set(fields).commit()
        results.imported++
      } else {
        // New deal — the fields the schema marks required must be present.
        const missing: string[] = []
        if (!store) missing.push('store')
        if (!priceSale) missing.push('priceSale')
        if (!priceOrig) missing.push('priceOrig')
        if (discount === undefined) missing.push('discount')
        if (missing.length) {
          results.errors.push({ row: i + 2, message: `"${title}": deal moi thieu ${missing.join(', ')} (bat buoc khi tao moi)` })
          continue
        }
        const created = await writeClient.create({
          _type: 'deal',
          title,
          slug: { _type: 'slug', current: slug },
          verified: true,
          isExpiring: false,
          aiReviewStatus: 'none',
          ...fields,
        })
        // Guard against a second row with the same title creating a duplicate.
        dealBySlug.set(slug, created._id)
        results.imported++
      }
    } catch (err) {
      results.errors.push({ row: i + 2, message: String(err) })
    }
  }

  revalidatePath('/admin/deals')
  revalidatePath('/deals')
  revalidatePath('/deals/[slug]', 'page')
  revalidatePath('/', 'page')
  return results
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, rows, schedule } = body as { type: string; rows: ImportRow[]; schedule?: Schedule }

    if (!type || !Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'Thieu type hoac rows' }, { status: 400 })
    }

    let result
    if (type === 'stores') result = await importStoresAndOffers(rows)
    else if (type === 'deals') result = await importDeals(rows)
    else if (type === 'posts') result = await importPosts(rows, schedule)
    else if (type === 'reviews') result = await importReviews(rows, schedule)
    else return Response.json({ error: `Type khong hop le: ${type}` }, { status: 400 })

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
