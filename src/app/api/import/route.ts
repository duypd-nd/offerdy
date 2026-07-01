import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'

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

// Combined: each row creates/reuses a store then creates an offer
async function importStoresAndOffers(rows: ImportRow[]) {
  const results: { imported: number; errors: { row: number; message: string }[] } = {
    imported: 0,
    errors: [],
  }

  // Pre-load existing stores into cache
  const existingStores = await writeClient.fetch<{ _id: string; name: string }[]>(
    `*[_type == "store"]{_id, name}`
  )
  const storeCache = new Map(existingStores.map((s) => [s.name.toLowerCase(), s._id]))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = String(row.name ?? '').trim()
    const affiliateLink = String(row.affiliateLink ?? '').trim()
    const offerText = String(row.offerText ?? '').trim()

    if (!name) {
      results.errors.push({ row: i + 2, message: 'Thieu cot "name" (ten store)' })
      continue
    }
    if (!affiliateLink) {
      results.errors.push({ row: i + 2, message: `Dong ${i + 2} "${name}": thieu affiliateLink` })
      continue
    }

    try {
      // Find or create store
      let storeId = storeCache.get(name.toLowerCase())

      if (!storeId) {
        const slug = slugify(name)
        const storeDoc: SanityDoc = {
          _type: 'store',
          name,
          slug: { _type: 'slug', current: slug },
          published: true,
          affiliateLink,
        }
        if (row.category) storeDoc.category = String(row.category)
        if (row.abbr) storeDoc.abbr = String(row.abbr).substring(0, 3)
        if (row.maxOffer) storeDoc.maxOffer = Number(row.maxOffer)
        if (row.website) storeDoc.website = String(row.website)
        if (row.shortDescription) storeDoc.shortDescription = String(row.shortDescription)

        const created = await writeClient.create(storeDoc)
        storeId = created._id
        storeCache.set(name.toLowerCase(), storeId)
      }

      // Create offer (skip if no offerText)
      if (offerText) {
        const title = String(row.title ?? '').trim() || `Uu dai tai ${name}`
        const offerDoc: SanityDoc = {
          _type: 'offer',
          title,
          offerText,
          link: affiliateLink,
          store: { _type: 'reference', _ref: storeId },
          active: row.active !== false && row.active !== 'false' && row.active !== 0,
          verified: row.verified !== false && row.verified !== 'false' && row.verified !== 0,
          order: row.order ? Number(row.order) : 0,
          votesActive: 0,
          votesExpired: 0,
        }
        if (row.couponCode) offerDoc.couponCode = String(row.couponCode)
        if (row.description) offerDoc.description = String(row.description)
        if (row.expiresAt) offerDoc.expiresAt = new Date(String(row.expiresAt)).toISOString()

        await writeClient.create(offerDoc)
      }

      results.imported++
    } catch (err) {
      results.errors.push({ row: i + 2, message: String(err) })
    }
  }

  revalidatePath('/admin/stores')
  revalidatePath('/admin/offers')
  revalidatePath('/', 'page')
  revalidatePath('/stores/[slug]', 'page')
  return results
}

async function importPosts(rows: ImportRow[]) {
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
      if (row.publishedAt) doc.publishedAt = String(row.publishedAt)
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

async function importReviews(rows: ImportRow[]) {
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
      if (row.publishedAt) doc.publishedAt = String(row.publishedAt)
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
    const { type, rows } = body as { type: string; rows: ImportRow[] }

    if (!type || !Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'Thieu type hoac rows' }, { status: 400 })
    }

    let result
    if (type === 'stores') result = await importStoresAndOffers(rows)
    else if (type === 'posts') result = await importPosts(rows)
    else if (type === 'reviews') result = await importReviews(rows)
    else return Response.json({ error: `Type khong hop le: ${type}` }, { status: 400 })

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
