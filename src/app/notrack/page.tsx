'use client'

/**
 * Bat/tat do luong GA4 cho chinh may nay.
 *
 * VI SAO CAN: do ngay 2026-08-03 — trong 765 luot xem trang (da bo /admin), 709
 * den tu Viet Nam va rieng Nam Dinh la 279. Tuc phan lon "khach" trong so lieu
 * la nguoi van hanh duyet cac trang cong khai. Bo loc `/admin` cua GA4 khong bat
 * duoc dieu do, va moi ty le tinh tren mau so ay deu sai.
 *
 * Vi sao khong loc theo IP trong GA4 (cach Google huong dan): mang gia dinh o VN
 * doi IP thuong xuyen, va khi doi thi bo loc hong IM LANG — so lieu ban tro lai
 * ma khong co dau hieu gi bao. Cookie di theo trinh duyet, khong phu thuoc mang.
 *
 * Trang nay `noindex` va khong nam trong sitemap — no la cong cu noi bo.
 */

import { useSyncExternalStore } from 'react'
import Link from 'next/link'

const COOKIE = 'ofd_notrack'
// 2 nam: du lau de khong phai nho lam lai, va van co han de khong ket vinh vien
const MAX_AGE = 60 * 60 * 24 * 730

function readCookie(): boolean {
  return document.cookie.split('; ').some(c => c === `${COOKIE}=1`)
}

// Cookie khong phat ra su kien nao de dang ky nghe — nhung `useSyncExternalStore`
// van la cach dung de doc mot gia tri chi ton tai o trinh duyet: no tra ve
// `getServerSnapshot` khi render tren server roi doi sang gia tri that luc hydrate,
// nen khong lech HTML va khong phai dat state trong effect (dieu ESLint cua du an
// nay chan).
const noopSubscribe = () => () => {}

export default function NoTrackPage() {
  const off = useSyncExternalStore<boolean | null>(noopSubscribe, readCookie, () => null)

  const apply = (disable: boolean) => {
    document.cookie = disable
      ? `${COOKIE}=1; path=/; max-age=${MAX_AGE}; samesite=lax`
      : `${COOKIE}=; path=/; max-age=0; samesite=lax`
    // Co `ga-disable` chi duoc doc MOT LAN luc tai trang, nen phai tai lai thi moi
    // that su co hieu luc — khong reload thi trang hien tai VAN dang gui su kien.
    // Tai lai cung la cach `off` o tren doc duoc gia tri moi.
    window.location.reload()
  }

  const box: React.CSSProperties = {
    maxWidth: 520, margin: '80px auto', padding: 28,
    border: '1px solid #E8EEF6', borderRadius: 14, background: '#fff',
    fontFamily: 'system-ui, sans-serif',
  }

  return (
    <div style={box}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
        Đo lường trên máy này
      </h1>
      <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.7, margin: '0 0 20px' }}>
        Tắt để lượt truy cập của bạn không bị tính vào Google Analytics. Cài đặt này lưu theo
        trình duyệt, nên phải bật lại trên từng máy và từng trình duyệt bạn dùng —
        kể cả chế độ ẩn danh.
      </p>

      {off === null ? (
        <div style={{ fontSize: 13, color: '#94a3b8' }}>Đang kiểm tra…</div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            padding: '12px 14px', borderRadius: 10,
            background: off ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${off ? '#bbf7d0' : '#fde68a'}`,
          }}>
            <span style={{ fontSize: 18 }}>{off ? '🛑' : '📊'}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: off ? '#166534' : '#92400e' }}>
              {off
                ? 'Đang TẮT — lượt của bạn không vào số liệu'
                : 'Đang BẬT — lượt của bạn đang được tính như khách'}
            </span>
          </div>

          <button
            onClick={() => apply(!off)}
            style={{
              width: '100%', padding: '11px 16px', borderRadius: 9, cursor: 'pointer',
              border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              background: off ? '#e2e8f0' : '#dc2626',
              color: off ? '#334155' : '#fff',
            }}
          >
            {off ? 'Bật đo lường trở lại' : 'Tắt đo lường trên máy này'}
          </button>

          <p style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.7, margin: '16px 0 0' }}>
            Chỉ ảnh hưởng số liệu từ lúc bấm trở đi — dữ liệu cũ trong GA4 không đổi.
            Xoá cookie trình duyệt sẽ đưa về trạng thái bật.
          </p>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
            <Link href="/admin/reports" style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 600 }}>
              Xem Báo cáo Click →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
