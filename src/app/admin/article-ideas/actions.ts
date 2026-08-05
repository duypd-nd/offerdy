'use server'

import { client as readClient } from '@/sanity/client'
import { fetchProductCatalog, slugToTitle } from '@/lib/productCatalog'
import {
  availableTemplates,
  TEMPLATE_LABEL,
  type ArticleIdea,
  type IdeaProduct,
  type RejectedIdea,
} from '@/lib/articleIdeas'
import { nameArticleIdeas, type IdeaName } from '@/lib/ai/nameArticleIdeas'
import { describeAiError } from '@/lib/ai/describeAiError'

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
    })
    return { ok: true, named: result.named, rejected: result.rejected }
  } catch (err) {
    return { ok: false, error: describeAiError(err) }
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
