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

async function importStores(rows: ImportRow[]) {
  const results: { imported: number; errors: { row: number; message: string }[] } = {
    imported: 0,
    errors: [],
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = String(row.name ?? '').trim()
    if (!name) {
      results.errors.push({ row: i + 2, message: 'Thieu ten store (cot name)' })
      continue
    }

    try {
      const slug = slugify(name)
      const existing = await writeClient.fetch(
        `*[_type == "store" && slug.current == $slug][0]._id`,
        { slug }
      )
      if (existing) {
        results.errors.push({ row: i + 2, message: `Store "${name}" (slug: ${slug}) da ton tai` })
        continue
      }

      const doc: SanityDoc = {
        _type: 'store',
        name,
        slug: { _type: 'slug', current: slug },
        published: true,
      }
      if (row.category) doc.category = String(row.category)
      if (row.abbr) doc.abbr = String(row.abbr).substring(0, 3)
      if (row.maxOffer) doc.maxOffer = Number(row.maxOffer)
      if (row.website) doc.website = String(row.website)
      if (row.affiliateLink) doc.affiliateLink = String(row.affiliateLink)
      if (row.shortDescription) doc.shortDescription = String(row.shortDescription)
      if (row.description) doc.description = String(row.description)
      if (row.metaTitle) doc.metaTitle = String(row.metaTitle)
      if (row.metaKeywords) doc.metaKeywords = String(row.metaKeywords)
      if (row.metaDescription) doc.metaDescription = String(row.metaDescription)

      await writeClient.create(doc)
      results.imported++
    } catch (err) {
      results.errors.push({ row: i + 2, message: String(err) })
    }
  }

  revalidatePath('/admin/stores')
  revalidatePath('/', 'page')
  return results
}

async function importOffers(rows: ImportRow[]) {
  const results: { imported: number; errors: { row: number; message: string }[] } = {
    imported: 0,
    errors: [],
  }

  const stores = await writeClient.fetch<{ _id: string; name: string }[]>(
    `*[_type == "store"]{_id, name}`
  )
  const storeMap = new Map(stores.map((s) => [s.name.toLowerCase(), s._id]))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const title = String(row.title ?? '').trim()
    const offerText = String(row.offerText ?? '').trim()
    const storeName = String(row.storeName ?? '').trim()
    const link = String(row.link ?? '').trim()

    if (!title) {
      results.errors.push({ row: i + 2, message: 'Thieu title' })
      continue
    }
    if (!offerText) {
      results.errors.push({ row: i + 2, message: `Dong ${i + 2}: thieu offerText` })
      continue
    }
    if (!link) {
      results.errors.push({ row: i + 2, message: `Dong ${i + 2}: thieu link` })
      continue
    }

    const storeId = storeMap.get(storeName.toLowerCase())
    if (!storeId) {
      results.errors.push({ row: i + 2, message: `Khong tim thay store: "${storeName}"` })
      continue
    }

    try {
      const doc: SanityDoc = {
        _type: 'offer',
        title,
        offerText,
        link,
        store: { _type: 'reference', _ref: storeId },
        active: row.active !== false && row.active !== 'false' && row.active !== 0,
        verified: row.verified !== false && row.verified !== 'false' && row.verified !== 0,
        order: row.order ? Number(row.order) : 0,
        votesActive: 0,
        votesExpired: 0,
      }
      if (row.couponCode) doc.couponCode = String(row.couponCode)
      if (row.description) doc.description = String(row.description)
      if (row.expiresAt) doc.expiresAt = new Date(String(row.expiresAt)).toISOString()

      await writeClient.create(doc)
      results.imported++
    } catch (err) {
      results.errors.push({ row: i + 2, message: String(err) })
    }
  }

  revalidatePath('/admin/offers')
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
    if (type === 'stores') result = await importStores(rows)
    else if (type === 'offers') result = await importOffers(rows)
    else if (type === 'posts') result = await importPosts(rows)
    else if (type === 'reviews') result = await importReviews(rows)
    else return Response.json({ error: `Type khong hop le: ${type}` }, { status: 400 })

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
