import { client as readClient } from '@/sanity/client'
import CouponTestsClient from './CouponTestsClient'

export const dynamic = 'force-dynamic'

export type TestItem = {
  offerId: string
  title: string
  couponCode: string
  offerText?: string
  storeName?: string
  storeSlug?: string
  /** Noi de mo gio hang: trang san pham neu co, khong thi link shop. */
  testUrl?: string
  codeTestedAt?: string
  codeTestResult?: string
  codeTestNote?: string
}

export default async function CouponTestsPage() {
  const items = await readClient.fetch<TestItem[]>(
    // Chi offer CO ma. Deal khong ma thi khong co gi de go vao o thanh toan,
    // dua vao day chi lam danh sach dai them ma khong thu duoc gi.
    // Sap: chua thu len truoc, roi thu lau nhat len truoc — nguoi van hanh mo
    // trang la thay ngay viec con lai, khong phai tu doi chieu.
    `*[_type == "offer" && active == true && defined(couponCode) && couponCode != ""] {
      "offerId": _id, title, couponCode, offerText,
      "storeName": store->name, "storeSlug": store->slug.current,
      "testUrl": coalesce(productUrl, link, store->affiliateLink, store->website),
      codeTestedAt, codeTestResult, codeTestNote
    } | order(codeTestedAt asc, storeName asc)`,
  )

  const tested = items.filter(i => i.codeTestedAt).length
  // Con so that su noi len khoi luong cong viec: khong phai "N ma" ma la "N quay
  // thanh toan". 71 offer co ma nhung chi 7 ma khac nhau — OFFERDY dung o 63
  // shop — nen cai phai thu la tung SHOP, va ket qua khac nhau theo shop.
  const shops = new Set(items.map(i => i.storeName ?? '?')).size
  const codes = new Set(items.map(i => i.couponCode)).size

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
          Thử mã ở quầy thanh toán
        </h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          {tested}/{items.length} đã thử thật · {items.length} offer trên <b>{shops} shop</b>, nhưng chỉ{' '}
          <b>{codes} mã khác nhau</b> — việc thật là thử ở {shops} quầy thanh toán, không phải {items.length} mã.
          Kết quả hiện công khai trên trang store và /coupon-codes.
        </p>
      </div>

      <div style={{
        background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10,
        padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#075985', lineHeight: 1.65,
      }}>
        <b>Vì sao việc này đáng làm tay.</b> Toàn ngành đo được <b>26,2% mã bị từ chối</b> khi thanh toán
        (78,8 triệu lượt thử), nên nhãn &ldquo;Verified&rdquo; không kèm ngày gần như vô giá trị với người mua.
        Câu bạn gõ vào ô &ldquo;Quan sát được gì&rdquo; là thứ <b>không sao chép được từ trang nào khác</b> —
        đúng loại nội dung Google 2026 chấm điểm.
        <div style={{ marginTop: 6 }}>
          <b>Ghi đúng thứ nhìn thấy.</b> Mã không chạy thì chọn &ldquo;Bị từ chối&rdquo; — trang vẫn hiện điều đó ra.
          Thẳng thắn giữ được người đọc lâu hơn là giấu một mã hỏng.
        </div>
      </div>

      <CouponTestsClient items={items} />
    </div>
  )
}
