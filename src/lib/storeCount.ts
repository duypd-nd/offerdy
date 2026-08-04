/**
 * Con so "bao nhieu store" tren trang cong khai, lay tu du lieu that.
 *
 * Vi sao can mot cho rieng: con so nay tung duoc go TAY o bon noi khac nhau va
 * troi ra bon huong. Do ngay 2026-08-04, khi site co **80** store:
 *
 *   configAbout.heroLead / coverageHeading / stats  ->  "350+"
 *   configPartner.benefits                          ->  "500+"
 *   about/page.tsx, dong "Explore all ... stores"   ->  "500+"  (viet cung)
 *   about/page.tsx, FAQ JSON-LD                     ->  "500+"  (viet cung)
 *
 * Hai cai dau sua duoc qua admin nen da duoc sua mot phan; hai cai sau viet cung
 * trong code nen khong ai sua duoc, va cai cuoi la **du lieu co cau truc gui
 * thang cho Google** — mot loi khai may doc duoc, sai gap 6 lan su that.
 *
 * Nen cach chua khong phai la go lai con so dung, ma la **thoi go**: van ban dat
 * `{storeCount}` va trang thay bang so that luc render. Go tay thi se troi lai.
 *
 * Cung quy uoc voi `{store}` trong `defaultDescription` cua store (xem
 * StoreOfferList) — du an da co tien le nay, khong dat ra cai moi.
 */
export const STORE_COUNT_TOKEN = /\{storeCount\}/g

/** Thay `{storeCount}` bang so that. Van ban khong chua o thi tra ve nguyen ban. */
export function fillStoreCount(text: string | undefined, count: number): string {
  return (text ?? '').replace(STORE_COUNT_TOKEN, String(count))
}
