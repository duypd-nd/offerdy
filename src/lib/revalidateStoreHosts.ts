import { revalidatePath } from 'next/cache'

/**
 * Lam moi moi trang doc BANG TRA CUU DUNG CHUNG `store-hosts`.
 *
 * `getCachedStoreHosts()` trong `src/sanity/queries.ts` giu ten shop, slug, tham
 * so tiep thi va **ma coupon noi bat cua tung shop**, khop theo domain. No duoc
 * doc o **trang deal va trang review** — nhung noi khong he mang chu "store" hay
 * "offer" trong duong dan, nen rat de bi bo quen.
 *
 * ⚠️ **`revalidatePath` CO don `unstable_cache`, nhung lien ket la THEO DUONG
 * DAN.** Route GHI phai neu ten route DOC. Do bang dong ho ngay 2026-08-04, hai
 * lan, ca hai chieu:
 *
 *   truoc: nap cache 06:05:27 · Luu 06:07:35 · trang doi 06:10:13
 *          -> doi vi het cua so 300 giay, KHONG phai vi bam Luu
 *   sau  : Luu 07:20:04 -> 07:20:09 (5 giay);  Luu 07:22:29 -> 07:22:30 (1 giay)
 *          (ca hai lan ban cache con han vai phut, nen het han khong giai thich duoc)
 *
 * Vi sao mot ham dung chung chu khong phai chep danh sach vao tung action: ba
 * duong ghi (store, offer, coupon code) deu doi cung mot bang, va truoc day moi
 * duong giu mot danh sach rieng — chinh kieu troi dat do sinh ra lo hong nay.
 * Mot danh sach thi sai hay dung cung sai/dung o ca ba noi, va sua mot cho la du.
 *
 * ⚠️ Them trang moi dung `getDealCoupon` / `getStoreRefForUrl` / `withDealRefs`
 * thi phai them vao day, khong thi no lang le tre toi 5 phut.
 *
 * ⚠️ KHONG thay ham nay bang `tags` tren `unstable_cache`: tai lieu Next 16 di
 * kem ghi `unstable_cache` "da duoc thay the boi use cache", va `revalidateTag`
 * thieu tham so `profile` la da loi thoi. Xem PROJECT_CONTEXT.md.
 */
export function revalidateStoreHostConsumers() {
  // Trang gan ma ref / ma coupon theo domain qua `store-hosts`.
  revalidatePath('/deals')
  revalidatePath('/deals/[slug]', 'page')
  revalidatePath('/links')
  revalidatePath('/reviews')
  revalidatePath('/reviews/[slug]', 'page')
  // Trang chu cung liet ke deal.
  revalidatePath('/', 'page')
}
