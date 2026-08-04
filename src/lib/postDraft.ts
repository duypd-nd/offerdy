/**
 * Moc `publishedAt` danh cho ban nhap bai viet do AI sinh ra.
 *
 * ⚠️ **Post khong co `publishedAt` la post CONG KHAI.** Bo loc cua du an la
 * `!defined(publishedAt) || publishedAt <= now()`, nen mot ban nhap tao ra bang
 * `create({_type:'post', aiReviewStatus:'pending'})` se hien ngay tren `/blog`.
 * Va vi `content` con trong, `blog/[slug]/page.tsx` roi ve `PlaceholderBody` —
 * mot doan van mau chung chung khong lien quan gi toi bai. Do la cach de nhat de
 * tinh nang sinh bai lam site mat mat.
 *
 * Nen ban nhap luon mang moc nay. No khong phai "lich dang bai" — no la mot ngay
 * xa den muc khong the vo tinh toi, va no chan doc lap voi bo loc GROQ: du mot
 * truy van nao do quen loc `aiReviewStatus`, ngay nay van giu bai o ngoai.
 *
 * Duyet bai o /admin/ai-review moi dat `publishedAt` ve ngay hom nay.
 */
export const DRAFT_PUBLISHED_AT = '2099-01-01'

/** Bai nay co dang la ban nhap chua duyet khong? */
export function isDraftPost(post: { publishedAt?: string; aiReviewStatus?: string }): boolean {
  return post.aiReviewStatus === 'pending' || post.publishedAt === DRAFT_PUBLISHED_AT
}

/** Ngay dang khi duyet — dinh dang `date` cua Sanity (YYYY-MM-DD). */
export function todayForPublish(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}
