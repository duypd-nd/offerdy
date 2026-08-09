'use client'

import { useState } from 'react'
import Link from 'next/link'
import { breakEven, dailyPlan } from '@/lib/adPlanner'

export type PlannerStore = {
  name: string
  slug: string
  commissionRate: number | null
  /** So nguoi van hanh go tay — luon thang so uoc luong. */
  avgOrderValue: number | null
  /** Uoc luong tu gia deal cua chinh shop nay. */
  estimatedAov: number | null
  /** Bao nhieu deal da dung de uoc luong — 1-2 mau thi khong dang tin. */
  estimatedFrom: number
  cookieWindowDays: number | null
  allowsPaidTraffic: string
}

const PAID_LABEL: Record<string, { text: string; fg: string; bg: string }> = {
  yes:            { text: '✅ Cho phép',            fg: '#15803d', bg: '#f0fdf4' },
  brand_excluded: { text: '⚠️ Trừ từ khoá TH',      fg: '#b45309', bg: '#fffbeb' },
  no:             { text: '🚫 Không cho',           fg: '#b91c1c', bg: '#fef2f2' },
  unknown:        { text: '❓ Chưa xác minh',       fg: '#64748b', bg: '#f8fafc' },
}

const VERDICT = {
  good:     { fg: '#15803d', bg: '#f0fdf4', text: 'có cửa' },
  tight:    { fg: '#b45309', bg: '#fffbeb', text: 'căng' },
  hopeless: { fg: '#b91c1c', bg: '#fef2f2', text: 'không nên' },
}

export default function AdPlannerClient({ stores }: { stores: PlannerStore[] }) {
  const [cpc, setCpc] = useState('0.50')
  const [budget, setBudget] = useState('20')
  const [onlyReady, setOnlyReady] = useState(true)

  const cpcNum = parseFloat(cpc)
  const budgetNum = parseFloat(budget)

  const rows = stores
    .map(s => {
      const aov = s.avgOrderValue ?? s.estimatedAov
      const be = breakEven({ commissionRate: s.commissionRate, avgOrderValue: aov, cpc: cpcNum })
      return { s, aov, be, plan: be ? dailyPlan(budgetNum, cpcNum, be.earningsPerOrder) : null }
    })
    // Sap theo do de hoa von: viec cua trang nay la day shop dang chay len dau.
    .sort((a, b) => (a.be?.breakEvenConversion ?? Infinity) - (b.be?.breakEvenConversion ?? Infinity))

  const shown = onlyReady ? rows.filter(r => r.be) : rows
  const missing = rows.length - rows.filter(r => r.be).length

  const inputStyle = {
    width: 90, padding: '6px 8px', fontSize: 13, border: '1px solid #e5e7eb',
    borderRadius: 6, fontVariantNumeric: 'tabular-nums' as const,
  }
  const th = {
    padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase' as const, letterSpacing: '.04em', whiteSpace: 'nowrap' as const,
  }
  const td = {
    padding: '8px 12px', fontSize: 13, textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums' as const, whiteSpace: 'nowrap' as const,
  }

  return (
    <div className="adm-page" style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
          Tính quảng cáo — điểm hoà vốn
        </h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          Để hoà vốn thì bao nhiêu phần trăm khách phải mua hàng
        </p>
      </div>

      {/* Cai bay lon nhat cua trang nay: doc no thanh du bao doanh thu. */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
        padding: '12px 14px', fontSize: 12.5, color: '#78350f', lineHeight: 1.8, marginBottom: 20,
      }}>
        <b>Đây là điều kiện cần, không phải dự báo.</b> Trang này không nói anh sẽ bán được bao nhiêu — nó nói
        anh <b>phải</b> bán được bao nhiêu để không lỗ. Doanh thu thật nằm bên GoAffPro và site không nhìn thấy,
        nên lãi/lỗ thực tế chỉ đối chiếu được ở đó.
        <div style={{ marginTop: 6 }}>
          ⚠️ Trước khi tiêu đồng nào: <b>phần lớn chương trình affiliate cấm chạy quảng cáo trên từ khoá thương
          hiệu của merchant</b>, và vi phạm thường dẫn tới chấm dứt chương trình <b>và mất phần hoa hồng đã
          tích</b>. Cột cuối bảng là để ghi lại việc đã kiểm điều khoản.
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap',
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 18,
      }}>
        <label style={{ fontSize: 12, color: '#64748b' }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Giá mỗi lượt bấm (CPC)</div>
          <input type="number" step="0.05" min="0.01" value={cpc}
            onChange={e => setCpc(e.target.value)} style={inputStyle} />
          <span style={{ marginLeft: 6 }}>USD</span>
        </label>
        <label style={{ fontSize: 12, color: '#64748b' }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Ngân sách mỗi ngày</div>
          <input type="number" step="5" min="1" value={budget}
            onChange={e => setBudget(e.target.value)} style={inputStyle} />
          <span style={{ marginLeft: 6 }}>USD / store</span>
        </label>
        <label style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6 }}>
          <input type="checkbox" checked={onlyReady} onChange={e => setOnlyReady(e.target.checked)} />
          Chỉ hiện store đã đủ dữ liệu
        </label>
      </div>

      {missing > 0 && (
        <div style={{ fontSize: 12, color: '#94a3b8', margin: '-8px 0 14px' }}>
          <b style={{ color: '#b45309' }}>{missing}</b>/{rows.length} store chưa tính được — thiếu <b>% hoa hồng</b>,
          số duy nhất không suy ra được từ đâu khác. Điền trong Sanity Studio, tab <b>💰 Kinh tế affiliate</b> của store.
          Chỉ điền cho shop thật sự định chạy quảng cáo.
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div className="adm-scroll-x">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Store</th>
                <th style={{ ...th, textAlign: 'right' }}>Đơn TB</th>
                <th style={{ ...th, textAlign: 'right' }}>Hoa hồng</th>
                <th style={{ ...th, textAlign: 'right' }}>Tiền / đơn</th>
                <th style={{ ...th, textAlign: 'right' }}>Cần % mua</th>
                <th style={{ ...th, textAlign: 'right' }}>Bấm/ngày</th>
                <th style={{ ...th, textAlign: 'right' }}>Đơn/ngày</th>
                <th style={{ ...th, textAlign: 'left' }}>Quảng cáo</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ s, aov, be, plan }) => {
                const v = be ? VERDICT[be.verdict] : null
                const paid = PAID_LABEL[s.allowsPaidTraffic] ?? PAID_LABEL.unknown
                const estimated = s.avgOrderValue == null && s.estimatedAov != null
                return (
                  <tr key={s.slug} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontSize: 13 }}>
                      <Link href={`/stores/${s.slug}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>
                        {s.name}
                      </Link>
                      {s.cookieWindowDays != null && (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}> · cookie {s.cookieWindowDays}n</span>
                      )}
                    </td>
                    <td style={td}>
                      {aov != null ? `$${aov.toFixed(2)}` : <span style={{ color: '#cbd5e1' }}>—</span>}
                      {estimated && (
                        // Trung binh tren 1-2 deal khong dang tin — phai noi ro so mau
                        // thay vi in mot con so trong nhu chac chan.
                        <div style={{ fontSize: 10, color: s.estimatedFrom < 3 ? '#b45309' : '#94a3b8', fontWeight: 400 }}>
                          ước lượng · {s.estimatedFrom} deal
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      {s.commissionRate != null
                        ? `${s.commissionRate}%`
                        : <span style={{ color: '#b45309', fontSize: 11 }}>chưa có</span>}
                    </td>
                    <td style={{ ...td, color: '#64748b' }}>
                      {be ? `$${be.earningsPerOrder.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: v?.fg ?? '#cbd5e1' }}>
                      {be ? `${(be.breakEvenConversion * 100).toFixed(1)}%` : '—'}
                      {v && <div style={{ fontSize: 10, fontWeight: 600 }}>{v.text}</div>}
                    </td>
                    <td style={{ ...td, color: '#64748b' }}>{plan ? plan.clicks : '—'}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#0f172a' }}>{plan ? plan.ordersNeeded : '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: paid.fg, background: paid.bg,
                        border: `1px solid ${paid.fg}22`, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap',
                      }}>{paid.text}</span>
                    </td>
                  </tr>
                )
              })}
              {shown.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '24px 12px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                  Chưa store nào đủ dữ liệu. Điền <b>% hoa hồng</b> trong Sanity Studio để bắt đầu.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.9, marginTop: 14 }}>
        <b>Cách đọc:</b> &ldquo;Cần % mua&rdquo; là tỉ lệ khách vào site phải thành đơn để tiền thu bằng tiền chi.
        Dưới 2% là traffic coupon thường đạt được; trên 5% thì gần như chắc lỗ.
        &ldquo;Đơn/ngày&rdquo; làm tròn lên — nửa đơn không tồn tại.
        <div style={{ marginTop: 6 }}>
          Giá trị đơn TB ước lượng từ giá deal của chính shop; điền ô <b>Giá trị đơn trung bình</b> trong Sanity
          khi có số thật từ GoAffPro — số thật luôn thắng số ước lượng.
        </div>
      </div>
    </div>
  )
}
