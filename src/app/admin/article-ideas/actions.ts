'use server'

import { client as readClient } from '@/sanity/client'
import { getSiteName } from '@/sanity/queries'
import { fetchProductCatalog, slugToTitle } from '@/lib/productCatalog'
import {
  availableTemplates,
  TEMPLATE_LABEL,
  type ArticleIdea,
  type IdeaProduct,
  type RejectedIdea,
} from '@/lib/articleIdeas'
import { minProductsFor } from '@/lib/articleIdeas'
import {
  nameArticleIdeas,
  findAwkwardTitle,
  findUnsafeIdea,
  findUnsafeMetaTitle,
  type IdeaName,
} from '@/lib/ai/nameArticleIdeas'
import { describeAiError } from '@/lib/ai/describeAiError'
import { generateArticleContent, findUnsafeArticle } from '@/lib/ai/generateArticleContent'
import { scrapeProductPage } from '@/lib/ai/scrapeProductPage'
import { writeClient } from '@/sanity/writeClient'
import { getStoreTopCoupon } from '@/sanity/queries'
import { DRAFT_PUBLISHED_AT } from '@/lib/postDraft'
import { revalidatePath } from 'next/cache'

export type IdeaScanResult =
  | {
      ok: true
      storeName: string
      /** `shopify` | `sitemap` | `manual` — nguon danh muc, de biet du lieu chac tay den dau. */
      source: string
      /** So dong danh muc doc duoc, TRUOC khi gop bien the. */
      catalogRows: number
      /** So san pham that, SAU khi gop bien the — con so cong kiem dung. */
      productCount: number
      variantsMerged: number
      offered: (ArticleIdea & { label: string })[]
      rejected: (RejectedIdea & { label: string })[]
    }
  | { ok: false; error: string; storeName: string; website?: string }

type StoreDoc = { name: string; website?: string } | null

/**
 * Quet danh muc mot shop roi cho qua cong kiem tinh trung thuc.
 *
 * ⚠️ CHI DOC — khong ghi gi vao Sanity, khong goi model nao. Chang nay ton tai de
 * CHUNG MINH cong kiem chay dung tren du lieu that truoc khi co bat cu dong AI nao
 * cam vao. Tieu de o day suy tu token nen xau; do la co y, va no lam ro vi sao buoc
 * dat ten (Chang 3) khong the bo qua.
 */
export async function scanStoreIdeas(storeId: string): Promise<IdeaScanResult> {
  const store = await readClient.fetch<StoreDoc>(
    `*[_type == "store" && _id == $storeId][0]{ name, website }`,
    { storeId }
  )
  if (!store) return { ok: false, error: 'Không tìm thấy store', storeName: '' }
  if (!store.website) {
    return { ok: false, error: 'Store chưa có website nên không biết quét ở đâu', storeName: store.name }
  }

  const catalog = await fetchProductCatalog(store.website)
  if (!catalog.ok) {
    return { ok: false, error: catalog.error, storeName: store.name, website: store.website }
  }

  return runGate(store.name, catalog.products, catalog.source, catalog.products.length)
}

/**
 * Duong vao thu hai: nguoi van hanh dan tay danh sach URL san pham.
 *
 * Ly do co duong nay: **2 trong 28 shop khong doc duoc danh muc** (venatos.com bi
 * Shopify khoa, graywhaletechnology.com khong co sitemap). Khong co o dan tay thi
 * ca tinh nang tat han voi nhung shop do, du chinh nguoi van hanh nhin vao trang
 * shop la thay danh sach san pham.
 *
 * Dung CHUNG `slugToTitle` voi duong quet tu dong — hai ban sao cua phep suy tieu de
 * se lech, va luc do cung mot shop cho hai ket qua khac nhau tuy duong vao.
 */
export async function scanPastedUrls(storeId: string, pasted: string): Promise<IdeaScanResult> {
  const store = await readClient.fetch<StoreDoc>(
    `*[_type == "store" && _id == $storeId][0]{ name, website }`,
    { storeId }
  )
  if (!store) return { ok: false, error: 'Không tìm thấy store', storeName: '' }

  const seen = new Set<string>()
  const products: IdeaProduct[] = []
  for (const line of pasted.split(/[\s,]+/)) {
    const raw = line.trim()
    if (!raw) continue
    let url: URL
    try {
      url = new URL(raw)
    } catch {
      continue
    }
    if (!/^https?:$/.test(url.protocol)) continue
    const key = url.toString()
    if (seen.has(key)) continue
    const slug = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop()
    if (!slug) continue
    seen.add(key)
    products.push({ url: key, title: slugToTitle(slug) })
  }

  if (products.length < 2) {
    return {
      ok: false,
      error: 'Cần ít nhất 2 URL sản phẩm hợp lệ (mỗi dòng một link) thì mới có gì để đối chiếu.',
      storeName: store.name,
      website: store.website,
    }
  }

  return runGate(store.name, products, 'manual', products.length)
}

export type NameActionResult =
  | { ok: true; named: IdeaName[]; rejected: { key: string; reason: string }[] }
  | { ok: false; error: string }

/**
 * Dat ten cho nhung y tuong cong da mo. MOT lenh goi model cho ca lan quet.
 *
 * ⚠️ Chay lai cong kiem tu dau thay vi nhan danh sach y tuong tu trinh duyet gui
 * len. Ton them mot lan doc danh muc, nhung giu duoc dieu quan trong nhat: **model
 * khong bao gio duoc trao mot y tuong ma cong chua duyet.** Nhan danh sach tu client
 * la de mot duong vong quanh cong ngay trong kien truc "cong kiem -> model -> hau
 * kiem" — va mot duong vong ton tai thi som muon co nguoi di qua no.
 */
export async function nameScannedIdeas(storeId: string, pasted?: string): Promise<NameActionResult> {
  const scan = pasted?.trim() ? await scanPastedUrls(storeId, pasted) : await scanStoreIdeas(storeId)
  if (!scan.ok) return { ok: false, error: scan.error }
  if (!scan.offered.length) return { ok: false, error: 'Không có ý tưởng nào để đặt tên.' }

  try {
    const result = await nameArticleIdeas({
      ideas: scan.offered,
      storeName: scan.storeName,
      year: new Date().getFullYear(),
      siteName: await getSiteName(),
    })
    return { ok: true, named: result.named, rejected: result.rejected }
  } catch (err) {
    return { ok: false, error: describeAiError(err) }
  }
}

export type WriteResult =
  | { ok: true; postId: string; slug: string; warnings: string[]; droppedProducts: string[] }
  | { ok: false; error: string; hard?: string[] }

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Viet mot bai va tao BAN NHAP trong Sanity. Khong dang gi len site.
 *
 * ⚠️ Ban nhap mang `publishedAt = DRAFT_PUBLISHED_AT` VA `aiReviewStatus: 'pending'`.
 * Hai lop chan nay co y du thua — post khong co `publishedAt` la post CONG KHAI, va
 * mot ban nhap rong lot ra `/blog` se render `PlaceholderBody`, doan van mau chung
 * chung khong lien quan gi toi bai.
 */
export async function writeArticleDraft(input: {
  storeId: string
  ideaKey: string
  /** Ten do AI dat, neu nguoi van hanh da bam "Đặt tên bằng AI". Van bi kiem lai o day. */
  title?: string
  metaTitle?: string
  pasted?: string
}): Promise<WriteResult> {
  const { storeId, ideaKey, pasted } = input
  const year = new Date().getFullYear()

  const scan = pasted?.trim() ? await scanPastedUrls(storeId, pasted) : await scanStoreIdeas(storeId)
  if (!scan.ok) return { ok: false, error: scan.error }

  const idea = scan.offered.find(i => i.key === ideaKey)
  // Cong van la nguon su that: y tuong khong con trong ket qua quet thi khong viet.
  if (!idea) return { ok: false, error: 'Ý tưởng này không còn trong kết quả quét — danh mục shop đã đổi, hãy quét lại.' }

  const store = await readClient.fetch<{ id: string; name: string; slug?: string } | null>(
    `*[_type == "store" && _id == $storeId][0]{ "id": _id, name, "slug": slug.current }`,
    { storeId }
  )
  if (!store) return { ok: false, error: 'Không tìm thấy store' }

  // ── Cao tung trang san pham ──
  const scraped: { url: string; title: string; description?: string; images: string[]; price?: string; priceOrig?: string; currency?: string }[] = []
  const droppedProducts: string[] = []
  for (const p of idea.products) {
    const result = await scrapeProductPage(p.url)
    if ('error' in result) {
      droppedProducts.push(`${p.title} — ${result.error}`)
      continue
    }
    scraped.push({
      url: p.url,
      title: result.title,
      description: result.description,
      images: result.images,
      price: result.price,
      priceOrig: result.priceOrig,
      currency: result.currency,
    })
  }

  // ⚠️ Chay lai nguong SAU khi bo san pham hong. Bai "tot nhat trong 4" viet tren 3
  // san pham va mot lo hong la bai noi doi ve chinh noi dung cua no.
  const min = minProductsFor(idea.template)
  if (scraped.length < min) {
    return {
      ok: false,
      error: `Chỉ cào được ${scraped.length}/${idea.products.length} trang sản phẩm, dưới ngưỡng ${min} của mẫu này. Không viết bài thiếu sản phẩm.`,
      hard: droppedProducts,
    }
  }

  // ── Bai da co roi thi khong viet lai ──
  //
  // ⚠️ Cong kiem la ham THUAN nen no chi thay duoc mot lan quet. Quet lai shop do vao
  // hom sau la mot lan quet moi, va no de ra dung nhung y tuong cu — khong co gi trong
  // `articleIdeas.ts` biet duoc dieu do. Do that: HWWH co *P10 P3 P4 P5 Compared* (5
  // san pham) va *P10 P3 P5 P8 Compared* (4), PRO TOUR co hai bai xe dap chong nhau
  // 3/4 — deu sinh ra tu hai lan quet khac nhau, va phep loc tap con trong cong kiem
  // khong the nhin thay.
  //
  // So bang `articleProducts[].url` chu khong bang tieu de: hai tieu de khac nhau tren
  // cung mot bo san pham van la mot bai viet hai lan.
  const urls = new Set(scraped.map(p => p.url))
  const existing = await readClient.fetch<{ title: string; slug?: string; urls?: string[] }[]>(
    `*[_type == "post" && sourceStore._ref == $storeId]{ title, "slug": slug.current, "urls": articleProducts[].url }`,
    { storeId }
  )
  const covered = existing.find(e => {
    const have = new Set(e.urls ?? [])
    return have.size > 0 && [...urls].every(u => have.has(u))
  })
  if (covered) {
    return {
      ok: false,
      error: `Shop này đã có bài phủ đúng bộ sản phẩm đó: "${covered.title}"${covered.slug ? ` (/blog/${covered.slug})` : ''}. Hai bài trên cùng bộ sản phẩm sẽ cạnh tranh nhau trên cùng một truy vấn.`,
    }
  }

  // ── Ten bai: van kiem lai du da qua hau kiem o buoc dat ten ──
  const nameCtx = {
    storeName: store.name,
    siteName: await getSiteName(),
    productTitles: scraped.map(p => p.title),
    year,
    productCount: scraped.length,
    mustNameStore: idea.template === 'best-in-store' || idea.template === 'best-for',
  }
  // ⚠️ Ten den tu trinh duyet nen phai kiem lai o day. Hau kiem la nguon su that, khong
  // phai client — va so san pham co the vua tut xuong vi mot trang cao hong, nen ca
  // ten da hop le truoc do cung can hoi lai.
  const title = input.title && !findUnsafeIdea(input.title, nameCtx) ? input.title : idea.workingTitle
  const namedMeta =
    input.metaTitle && !findUnsafeMetaTitle(input.metaTitle, nameCtx) ? input.metaTitle : undefined

  const coupon = store.slug ? await getStoreTopCoupon(store.slug) : null

  // ── Goi model ──
  let content
  try {
    content = await generateArticleContent({
      articleTitle: title,
      templateId: idea.template,
      storeName: store.name,
      year,
      hasCoupon: Boolean(coupon?.code),
      products: scraped.map((p, i) => ({
        n: i + 1,
        title: p.title,
        description: p.description,
        // ⚠️ CHI co/khong. Con so tuyet doi khong di vao prompt.
        hasPrice: Boolean(p.price),
        hasWas: Boolean(p.priceOrig),
        imageCount: p.images.length,
      })),
    })
  } catch (err) {
    return { ok: false, error: describeAiError(err) }
  }

  const problems = findUnsafeArticle(content, {
    storeName: store.name,
    siteName: nameCtx.siteName,
    productCount: scraped.length,
    sourceText: scraped.flatMap(p => [p.title, p.description ?? '']),
    imageCounts: scraped.map(p => p.images.length),
    hasCoupon: Boolean(coupon?.code),
    year,
  })
  // ⚠️ Doi chieu voi ca MO TA san pham chu khong chi ten: ten hang la cho chu hoa lung
  // tung sinh ra, mo ta moi la van xuoi binh thuong de lam thuoc do.
  const titleWarnings = findAwkwardTitle(
    title,
    store.name,
    scraped.flatMap(p => [p.title, p.description ?? ''])
  )

  if (problems.hard.length) {
    return {
      ok: false,
      error: 'Bài không qua được hậu kiểm nên KHÔNG tạo bản nháp nào.',
      hard: problems.hard,
    }
  }

  // ── metaTitle: ban nao cung phai qua cong, ke ca ban do buoc viet bai tu de xuat ──
  //
  // ⚠️ Truoc day cho nay la `metaTitle ?? content.metaTitle` — ban du phong **khong qua
  // cong nao**. Do that tren 48 bai da dang: 4 bai `best-in-store` phat the <title> bo
  // mat ten shop ("Best Heart Stud Earrings Guide 2026" cho mot bai chi xep hang hang
  // cua Tova Jewelry). Bo loc chi chay tren nhanh nay thi nhanh kia thanh duong vong.
  //
  // Khong qua duoc thi **bo trong**, khong sua chua: `generateMetadata` roi ve
  // `metaTitle ?? title`, ma `title` la ten DA qua cong. Mot the <title> vua bi bat
  // hua qua tay thi phan con lai cua no cung khong dang tin — dung cach Chang 3 lui ve
  // `workingTitle` thay vi go lai vai chu.
  const metaWarnings: string[] = []
  let metaTitle = namedMeta
  if (!metaTitle && content.metaTitle) {
    const metaProblem = findUnsafeMetaTitle(content.metaTitle, nameCtx)
    if (metaProblem) {
      metaWarnings.push(`metaTitle do bước viết bài đề xuất đã bị loại (${metaProblem}) — trang sẽ dùng chính tiêu đề bài: "${content.metaTitle}"`)
    } else {
      metaTitle = content.metaTitle
    }
  }

  // ── Slug khong duoc trung ──
  const base = slugify(title) || slugify(idea.workingTitle) || `article-${Date.now()}`
  let slug = base
  for (let i = 2; i < 20; i++) {
    const taken = await readClient.fetch<boolean>(`count(*[_type == "post" && slug.current == $slug]) > 0`, { slug })
    if (!taken) break
    slug = `${base}-${i}`
  }

  const capturedAt = new Date().toISOString()
  const created = await writeClient.create({
    _type: 'post',
    title,
    slug: { _type: 'slug', current: slug },
    category: idea.template === 'review' ? 'Reviews' : 'Comparison',
    // ⚠️ Hai lop chan ro ban nhap — xem chu thich cua `DRAFT_PUBLISHED_AT`.
    publishedAt: DRAFT_PUBLISHED_AT,
    aiReviewStatus: 'pending',
    sourceStore: { _type: 'reference', _ref: store.id },
    articleProducts: scraped.map(p => ({
      _type: 'object',
      _key: slugify(p.url).slice(-24) || Math.random().toString(36).slice(2),
      url: p.url,
      title: p.title,
      imageUrl: p.images[0],
      priceAtWriting: p.price,
      currency: p.currency,
      capturedAt,
    })),
    aiDraft: {
      // ⚠️ `title` — KHONG phai ban do buoc viet bai tra ve. Buoc do khong con tra ve
      // ten nua (xem `ArticleSchema`): buoc duyet chep `aiDraft` de len truong that,
      // nen mot ten chua qua cong nam o day se de len chinh ten da qua cong.
      title,
      excerpt: content.excerpt,
      contentHtml: content.contentHtml,
      metaTitle,
      metaDescription: content.metaDescription,
      coverEmoji: content.coverEmoji,
      coverBg: content.coverBg,
      readTime: content.readTime,
      templateId: idea.template,
      faq: content.faq.map((f, i) => ({ _type: 'object', _key: `faq${i}`, ...f })),
      comparisonRows: content.comparisonRows.map((r, i) => ({ _type: 'object', _key: `row${i}`, ...r })),
      // ⚠️ Truoc 06/08/2026 truong nay chi ton tai trong `warnings`, tuc no CHET o buoc
      // duyet va khong bao gio len trang. Do la thu trung thuc nhat ca luong nay san
      // xuat ra, va nguoi doc chua bao gio duoc thay.
      notAnswered: content.notAnswered,
      warnings: [
        ...problems.soft,
        ...metaWarnings,
        ...titleWarnings,
        ...droppedProducts.map(d => `sản phẩm bị bỏ vì cào hỏng: ${d}`),
        ...(content.crossComparisonInsight.trim()
          ? [`câu đối chiếu model nêu: ${content.crossComparisonInsight.trim()}`]
          : []),
        // Y nghia dong nay vua doi: no khong con la ghi chu noi bo nua.
        ...content.notAnswered.map(q => `sẽ ĐĂNG CÔNG KHAI — bài không trả lời được: ${q}`),
      ],
      generatedAt: capturedAt,
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    },
  })

  revalidatePath('/admin/ai-review')
  return {
    ok: true,
    postId: created._id,
    slug,
    warnings: [...problems.soft, ...metaWarnings, ...titleWarnings],
    droppedProducts,
  }
}

function runGate(
  storeName: string,
  products: IdeaProduct[],
  source: string,
  catalogRows: number
): IdeaScanResult {
  const scan = availableTemplates(products, {
    storeName,
    // Nam doc o day chu khong trong thu vien: `articleIdeas.ts` la ham thuan, khong
    // duoc goi `new Date()` — neu khong test se doi ket qua vao dem giao thua.
    year: new Date().getFullYear(),
    // `categoryStoreCount` co y KHONG truyen: xem chu thich cua no trong articleIdeas.ts.
    // Dem theo `store.category` la cach nhanh nhat de mo mot cong dang le phai dong.
  })

  return {
    ok: true,
    storeName,
    source,
    catalogRows,
    productCount: scan.productCount,
    variantsMerged: scan.variantsMerged,
    offered: scan.offered.map(i => ({ ...i, label: TEMPLATE_LABEL[i.template] })),
    rejected: scan.rejected.map(r => ({ ...r, label: TEMPLATE_LABEL[r.template] })),
  }
}
