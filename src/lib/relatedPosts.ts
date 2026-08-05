/**
 * Chon bai cho o ben canh bai dang doc.
 *
 * Truoc day o do la "Recent Posts" — sau bai moi nhat, y het nhau tren MOI trang bai.
 * Danh sach do khong biet nguoi doc dang doc gi, nen no khong dua duoc ai di dau: mot
 * nguoi dang chon do boi cho em be bi moi doc bai ve may loc nuoc. Cho cung mot cho ay
 * hien bai CUNG SHOP hoac cung chu de thi moi cu bam la mot nguoi con dang trong con
 * mua sam, va la mot lien ket noi bo dung chu de cho tim kiem.
 *
 * Ham thuan: khong fetch, khong Sanity — chon bai la logic, khong phai truy van.
 */
import { tokenize } from './productMatch'

/**
 * Tu chung cua tieu de bai mua sam. Khong bo chung thi *moi* bai deu "lien quan" voi
 * moi bai: kho bai nay tieu de nao cung bat dau bang "Best ... at ... (2026)".
 */
const HEADLINE_NOISE = new Set([
  'best', 'top', 'good', 'better', 'great', 'guide', 'guides', 'buying', 'buyer',
  'review', 'reviews', 'compare', 'compared', 'comparison', 'vs', 'versus',
  'which', 'what', 'why', 'how', 'should', 'you', 'your', 'buy', 'worth',
  'at', 'in', 'on', 'for', 'of', 'to', 'and', 'or', 'the', 'a', 'an', 'is', 'are',
  'shop', 'store', 'stores', 'online', 'deal', 'deals', 'sale', 'off', 'price', 'prices',
])

export type RelatablePost = {
  slug: string
  title: string
  category?: string
  /** Shop ma bai duoc viet ra tu danh muc cua no. Bai cu khong co truong nay. */
  storeSlug?: string
}

/** Tu con lai cua tieu de sau khi bo tu chung va chu so tro tren. */
function titleWords(title: string): Set<string> {
  const out = new Set<string>()
  for (const t of tokenize(title)) {
    if (HEADLINE_NOISE.has(t)) continue
    if (/^\d+$/.test(t)) continue // "2026" trong "(2026)" — bai nao cung co
    if (t.length < 3) continue
    out.add(t)
  }
  return out
}

/**
 * Cang cao cang lien quan. 0 = khong lien quan gi.
 *
 * ⚠️ Cung shop an dut moi tin hieu khac, va co chu dich: nguoi dang doc bai ve
 * Babywonders ma bam sang mot bai Babywonders khac thi van o trong cung mot phien mua
 * sam, cung mot ma giam, cung mot ma tiep thi. Trung tu trong tieu de bi CHAN TREN o
 * 3 diem, neu khong mot tieu de dai le the co the vuot mat mot bai cung shop.
 *
 * ⚠️ **Cung DANH MUC khong du de goi la lien quan** — no chi la diem phu de phan giai
 * khi hai bai bang diem. Ly do rat cu the o kho bai nay: luong sinh bai AI dat MOI bai
 * vao danh muc "Comparison", nen tinh danh muc thanh diem thi son mong tay "lien quan"
 * toi do boi em be, va o ben canh tro lai thanh danh sach ngau nhien y nhu ban cu.
 */
export function scoreRelated(current: RelatablePost, candidate: RelatablePost): number {
  if (candidate.slug === current.slug) return 0

  const sameStore = current.storeSlug && candidate.storeSlug === current.storeSlug ? 6 : 0

  const mine = titleWords(current.title)
  let overlap = 0
  for (const w of titleWords(candidate.title)) if (mine.has(w)) overlap++
  const shared = Math.min(overlap, 3)

  // Khong chung shop, khong chung tu nao that -> khong lien quan, danh muc khong cuu.
  if (!sameStore && !shared) return 0

  const sameCategory = current.category && candidate.category === current.category ? 1 : 0
  return sameStore + shared + sameCategory
}

export type SidebarPosts<T> = {
  /** Bai that su lien quan, bai lien quan nhat truoc. Co the rong. */
  related: T[]
  /** Bai moi nhat con lai, do cho trong. Co the rong. */
  recent: T[]
}

/**
 * Chia lam HAI o, khong tron lam mot.
 *
 * ⚠️ Hai chuyen deu phai dung mot luc, va tron lai thi hong ca hai:
 *
 *  - **Khong duoc de chu "Related" tren bai khong lien quan.** Do la noi doi voi nguoi
 *    doc ngay o cu bam dau tien, va cu do se lam ho mat long tin voi ca site.
 *  - **Nhung cot ben cung khong duoc gan nhu trong.** Do that tren kho bai hien tai:
 *    Babywonders chi co dung 2 bai, nen o "Related" chi ra MOT the — con lai la mot
 *    khoang trang, va nguoi doc het bai thi khong con duong nao di tiep.
 *
 * Hai o rieng giai duoc ca hai: o tren dung ten that cua no, o duoi do not cho trong
 * bang bai moi va cung dung ten that cua no.
 */
export function pickSidebarPosts<T extends RelatablePost>(
  current: RelatablePost,
  all: T[],
  limit = 6
): SidebarPosts<T> {
  const related = all
    .map((post, order) => ({ post, order, score: scoreRelated(current, post) }))
    .filter(x => x.score > 0)
    // Diem bang nhau thi giu thu tu dau vao (`getPosts` da sap theo ngay dang giam) —
    // giua hai bai lien quan ngang nhau, bai moi hon dang tin hon.
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map(x => x.post)

  const taken = new Set(related.map(p => p.slug))
  const recent = all
    .filter(p => p.slug !== current.slug && !taken.has(p.slug))
    .slice(0, Math.max(0, limit - related.length))

  return { related, recent }
}
