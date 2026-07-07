import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'
import dns from 'dns/promises'
import { isIP } from 'net'
import { generateStoreContent } from '@/lib/ai/generateStoreContent'
import { normalize } from '@/lib/fuzzy'

const IMPORT_AI_STORE_CAP = Number(process.env.IMPORT_AI_STORE_CAP) || 8

function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true // link-local, gom ca cloud metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a >= 224) return true // multicast/reserved
    return false
  }
  if (version === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true // fe80::/10
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7
    if (lower.startsWith('::ffff:')) {
      const v4 = lower.slice(7)
      if (isIP(v4) === 4) return isPrivateOrReservedIp(v4)
    }
    return false
  }
  return true // hostname khong resolve duoc thanh IP hop le -> coi la khong an toan
}

async function checkImageUrlSafety(rawUrl: string): Promise<string | null> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return `URL khong hop le: "${rawUrl}"`
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Protocol khong duoc phep: "${parsed.protocol}"`
  }
  if (parsed.hostname.toLowerCase() === 'localhost') {
    return 'Khong duoc phep tro toi localhost'
  }

  try {
    const records = await dns.lookup(parsed.hostname, { all: true })
    if (records.length === 0) return `Khong resolve duoc DNS cho "${parsed.hostname}"`
    if (records.some((r) => isPrivateOrReservedIp(r.address))) {
      return `Dia chi IP noi bo/khong an toan cho "${parsed.hostname}"`
    }
    return null
  } catch {
    return `Khong resolve duoc DNS cho "${parsed.hostname}"`
  }
}

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

type FetchImageResult = { res: Response } | { error: string }

async function fetchImageSafely(url: string, maxRedirects = 5): Promise<FetchImageResult> {
  let currentUrl = url
  for (let i = 0; i <= maxRedirects; i++) {
    const unsafeReason = await checkImageUrlSafety(currentUrl)
    if (unsafeReason) return { error: unsafeReason }
    let res: Response
    try {
      res = await fetch(currentUrl, { redirect: 'manual' })
    } catch (err) {
      return { error: `Khong ket noi duoc toi "${currentUrl}": ${String(err)}` }
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return { error: `Redirect tu "${currentUrl}" thieu header Location` }
      currentUrl = new URL(location, currentUrl).toString()
      continue
    }
    return { res }
  }
  return { error: `Qua nhieu redirect (>${maxRedirects}) bat dau tu "${url}"` }
}

type UploadImageResult = { image: SanityDoc } | { error: string }

async function uploadImageFromUrl(url: string): Promise<UploadImageResult> {
  const fetched = await fetchImageSafely(url)
  if ('error' in fetched) return fetched
  const { res } = fetched
  if (!res.ok) return { error: `HTTP ${res.status} khi tai "${url}"` }
  try {
    const blob = await res.blob()
    const filename = url.split('/').pop()?.split('?')[0] || 'logo.png'
    const asset = await writeClient.assets.upload('image', blob, {
      filename,
      contentType: blob.type || 'image/png',
    })
    return {
      image: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } },
    }
  } catch (err) {
    return { error: `Loi khi upload len Sanity: ${String(err)}` }
  }
}

function offerCodeKey(storeId: string, couponCode: string) {
  return `${storeId}::code::${normalize(couponCode)}`
}
function offerTitleKey(storeId: string, title: string) {
  return `${storeId}::title::${normalize(title)}`
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
        if (row.store_description) storeDoc.shortDescription = String(row.store_description)
        if (row.store_about) storeDoc.description = String(row.store_about)

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

        if (!storeDoc.description) {
          aiCandidates.set(storeId, {
            id: storeId, name: storeName,
            category: storeDoc.category as string | undefined,
            website: storeDoc.website as string | undefined,
            maxOffer: storeDoc.maxOffer as number | undefined,
          })
        }
      } else if (!aiCandidates.has(storeId)) {
        const info = storeInfo.get(storeId)
        if (info && !info.description) {
          aiCandidates.set(storeId, {
            id: storeId, name: info.name, category: info.category, website: info.website, maxOffer: info.maxOffer,
          })
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

      await writeClient.create(doc)
      results.imported++
    } catch (err) {
      results.errors.push({ row: i + 2, message: String(err) })
    }
  }

  revalidatePath('/admin/reviews')
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
    else if (type === 'posts') result = await importPosts(rows, schedule)
    else if (type === 'reviews') result = await importReviews(rows, schedule)
    else return Response.json({ error: `Type khong hop le: ${type}` }, { status: 400 })

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
