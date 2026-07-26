import { writeClient } from '@/sanity/writeClient'
import MigrateDealCodesClient from './MigrateClient'

export const dynamic = 'force-dynamic'

// Trang chi DOC so lieu; viec cap ma nam trong server action assignDealCodes()
// (xem ./actions.ts) va chi chay khi bam nut.
//
// ⚠️ Trang NAY va chi trang nay trong /admin doc bang writeClient (API truc tiep,
// khong qua CDN). Ma san pham chi tang va khong bao gio tai dung; doc `max(code)` tu
// mot ban cache cham 60 giay se cap TRUNG ma cho hai deal, va ma da dang len mang xa
// hoi thi khong sua lai duoc. Doi chinh xac o day quan trong hon tinh san co.
export default async function MigrateDealCodesPage() {
  let counts: { missing: number; withCode: number } | null = null
  let error: string | null = null
  try {
    counts = await writeClient.fetch<{ missing: number; withCode: number }>(
      `{ "missing": count(*[_type == "deal" && !defined(code)]), "withCode": count(*[_type == "deal" && defined(code)]) }`
    )
  } catch (err) {
    // Bao ro thay vi de trang 500: nguyen nhan thuong gap la het han muc API cua
    // Sanity, va luc do cap ma cung khong the chay duoc — nguoi van hanh can biet
    // dieu do chu khong phai mot trang loi trang.
    error = err instanceof Error ? err.message : String(err)
  }

  if (error) {
    return (
      <div style={{ padding: '32px 28px', maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Cấp mã sản phẩm</h1>
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#991b1b', lineHeight: 1.7 }}>
          <b>Chưa đọc được số liệu.</b> Trang này cố ý đọc dữ liệu trực tiếp (không qua CDN)
          vì cấp mã từ bản cache cũ sẽ cấp trùng mã.
          <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{error}</div>
          <div style={{ marginTop: 10 }}>
            Nếu lỗi là <code>plan_limit_reached</code>: hạn mức API của Sanity đã hết — việc cấp mã
            cũng không chạy được lúc này. Chờ hết chu kỳ tháng hoặc nâng gói, rồi quay lại trang này.
          </div>
        </div>
      </div>
    )
  }

  return <MigrateDealCodesClient missingCount={counts?.missing ?? 0} withCode={counts?.withCode ?? 0} />
}
