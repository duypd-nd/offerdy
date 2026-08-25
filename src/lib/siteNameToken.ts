/**
 * O `{site}` trong van ban cong khai — thay bang ten website that luc render.
 *
 * Cung mot benh, cung mot cach chua nhu `{storeCount}` (xem `storeCount.ts`):
 * chu "Offerdy" tung duoc go TAY o **176 dong trong 74 file**, nen o *Ten website*
 * o /admin/config/general chi doi duoc header, footer va /links — con tieu de
 * trang, anh OG, JSON-LD, llms.txt va toan bo van ban mac dinh van giu ten cu.
 *
 * Nen cach chua khong phai la go lai ten dung o 176 cho, ma la **thoi go**:
 * van ban dat `{site}` va trang thay bang ten that luc render.
 *
 * ⚠️ Du an DA co san quy uoc nay tu truoc — `configContent.articleDisclaimer`
 * dung `{site}` — chi co dieu cho thay the lai viet cung `'Offerdy'`. Day khong
 * phai quy uoc moi, chi la noi not doan day con thieu.
 */
export const SITE_NAME_TOKEN = /\{site\}/g

/** Thay `{site}` bang ten that. Van ban khong chua o thi tra ve nguyen ban. */
export function fillSiteName(text: string | undefined, siteName: string): string {
  return (text ?? '').replace(SITE_NAME_TOKEN, siteName)
}
