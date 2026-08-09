'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { breakEven, dailyPlan } from '@/lib/adPlanner'
import { saveStoreEconomics } from './actions'

export type PlannerStore = {
  id: string
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

/** Bon truong sua duoc ngay tren bang. */
type Edit = {
  commissionRate?: number | null
  avgOrderValue?: number | null
  cookieWindowDays?: number | null
  allowsPaidTraffic?: string
}

const PAID_LABEL: Record<string, { text: string; fg: string; bg: string }> = {
  yes:            { text: '✅ Cho phép',       fg: '#15803d', bg: '#f0fdf4' },
  brand_excluded: { text: '⚠️ Trừ từ khoá TH', fg: '#b45309', bg: '#fffbeb' },
  no:             { text: '🚫 Không cho',      fg: '#b91c1c', bg: '#fef2f2' },
  unknown:        { text: '❓ Chưa xác minh',  fg: '#64748b', bg: '#f8fafc' },
}

const VERDICT = {
  good:     { fg: '#15803d', text: 'có cửa' },
  tight:    { fg: '#b45309', text: 'căng' },
  hopeless: { fg: '#b91c1c', text: 'không nên' },
}

/** O trong -> `null` (xoa truong), khong phai 0. Xem `updateStore`. */
function numOrNull(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export default function AdPlannerClient({ stores }: { stores: PlannerStore[] }) {
  const router = useRouter()
  const [cpc, setCpc] = useState('0.50')
  const [budget, setBudget] = useState('20')
  const [onlyReady, setOnlyReady] = useState(false)
  const [edits, setEdits] = useState<Record<string, Edit>>({})
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null)
  const [failed, setFailed] = useState<string[]>([])

  const cpcNum = parseFloat(cpc)
  const budgetNum = parseFloat(budget)
  const editedIds = Object.keys(edits)

  /** Gia tri dang hien = ban da luu + phan dang sua. */
  const merged = (s: PlannerStore) => ({ ...s, ...(edits[s.id] ?? {}) })

  function setField(id: string, field: keyof Edit, value: number | string | null) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function save() {
    setFailed([])
    const ids = Object.keys(edits)
    setSaving({ done: 0, total: ids.length })
    const bad: string[] = []
    // Tuan tu, MOI STORE MOT REQUEST — cung ly do da ghi o `deep-links/actions.ts`:
    // gom nhieu luot ghi vao mot server action thi het gio la mat sach.
    for (const [i, id] of ids.entries()) {
      setSaving({ done: i, total: ids.length })
      const r = await saveStoreEconomics(id, edits[id] as Record<string, unknown>)
      if (!r.ok) bad.push(stores.find(s => s.id === id)?.name ?? id)
    }
    setSaving(null)
    setFailed(bad)
    if (bad.length === 0) setEdits({})
    router.refresh()
  }

  const rows = stores
    .map(s => {
      const m = merged(s)
      const aov = m.avgOrderValue ?? s.estimatedAov
      const be = breakEven({ commissionRate: m.commissionRate, avgOrderValue: aov, cpc: cpcNum })
      return { s, m, be, plan: be ? dailyPlan(budgetNum, cpcNum, be.earningsPerOrder) : null }
    })
    // Day shop dang chay len dau; shop chua du du lieu xuong cuoi.
    .sort((a, b) => (a.be?.breakEvenConversion ?? Infinity) - (b.be?.breakEvenConversion ?? Infinity))

  const shown = onlyReady ? rows.filter(r => r.be) : rows
  const missing = rows.filter(r => !r.be).length

  const box = {
    padding: '4px 6px', fontSize: 12.5, border: '1px solid #e5e7eb', borderRadius: 6,
    fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const,
  }
  const th = {
    padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase' as const, letterSpacing: '.04em', whiteSpace: 'nowrap' as const,
  }
  const td = {
    padding: '6px 10px', fontSize: 13, textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums' as const, whiteSpace: 'nowrap' as const,
  }

  return (
    <div className="adm-page" style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
          Tính quảng cáo — điểm hoà vốn
        </h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          Điền ngay trên bảng — sửa tới đâu, cột &ldquo;Cần % mua&rdquo; đổi tới đó
        </p>
      </div>

      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
        padding: '12px 14px', fontSize: 12.5, color: '#78350f', lineHeight: 1.8, marginBottom: 18,
      }}>
        <b>Đây là điều kiện cần, không phải dự báo.</b> Trang này không nói anh sẽ bán được bao nhiêu — nó nói
        anh <b>phải</b> bán được bao nhiêu để không lỗ. Doanh thu thật nằm bên GoAffPro và site không nhìn thấy.
        <div style={{ marginTop: 6 }}>
          ⚠️ <b>Phần lớn chương trình affiliate cấm chạy quảng cáo trên từ khoá thương hiệu của merchant</b>, và vi
          phạm thường dẫn tới chấm dứt chương trình <b>và mất phần hoa hồng đã tích</b>. Cột cuối là để ghi lại
          việc đã kiểm điều khoản — mặc định &ldquo;chưa xác minh&rdquo; không có nghĩa là được phép.
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap',
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 16,
      }}>
        <label style={{ fontSize: 12, color: '#64748b' }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Giá mỗi lượt bấm (CPC)</div>
          <input type="number" step="0.05" min="0.01" value={cpc}
            onChange={e => setCpc(e.target.value)} style={{ ...box, width: 90 }} /> <span>USD</span>
        </label>
        <label style={{ fontSize: 12, color: '#64748b' }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Ngân sách mỗi ngày</div>
          <input type="number" step="5" min="1" value={budget}
            onChange={e => setBudget(e.target.value)} style={{ ...box, width: 90 }} /> <span>USD / store</span>
        </label>
        <label style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6 }}>
          <input type="checkbox" checked={onlyReady} onChange={e => setOnlyReady(e.target.checked)} />
          Chỉ hiện store đã đủ dữ liệu
        </label>
      </div>

      {/* Thanh luu — chi hien khi co thay doi */}
      {(editedIds.length > 0 || saving) && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 12,
          background: '#0f172a', color: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 14,
        }}>
          <button className="oa-btn oa-btn-primary" onClick={save} disabled={!!saving}>
            {saving ? `Đang lưu ${saving.done + 1}/${saving.total}…` : `Lưu ${editedIds.length} store`}
          </button>
          <span style={{ fontSize: 12.5, opacity: .85 }}>
            Chưa lưu thì chỉ mình anh thấy — số trên bảng đã tính theo giá trị đang sửa.
          </span>
        </div>
      )}
      {failed.length > 0 && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          borderRadius: 10, padding: '10px 14px', fontSize: 12.5, marginBottom: 14,
        }}>
          Không lưu được: <b>{failed.join(', ')}</b> — thay đổi vẫn còn trên màn hình, bấm Lưu lại để thử tiếp.
        </div>
      )}

      {missing > 0 && (
        <div style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px' }}>
          <b style={{ color: '#b45309' }}>{missing}</b>/{rows.length} store chưa tính được — thiếu <b>% hoa hồng</b>,
          số duy nhất không suy ra được từ đâu khác. Điền thẳng vào cột đó bên dưới.
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div className="adm-scroll-x">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Store</th>
                <th style={{ ...th, textAlign: 'right' }}>Đơn TB $</th>
                <th style={{ ...th, textAlign: 'right' }}>Hoa hồng %</th>
                <th style={{ ...th, textAlign: 'right' }}>Cookie</th>
                <th style={{ ...th, textAlign: 'right' }}>Tiền / đơn</th>
                <th style={{ ...th, textAlign: 'right' }}>Cần % mua</th>
                <th style={{ ...th, textAlign: 'right' }}>Bấm/ngày</th>
                <th style={{ ...th, textAlign: 'right' }}>Đơn/ngày</th>
                <th style={{ ...th, textAlign: 'left' }}>Quảng cáo</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ s, m, be, plan }) => {
                const v = be ? VERDICT[be.verdict] : null
                const dirty = !!edits[s.id]
                const usingEstimate = m.avgOrderValue == null && s.estimatedAov != null
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9', background: dirty ? '#fffdf5' : undefined }}>
                    <td style={{ padding: '6px 10px', fontSize: 13 }}>
                      <Link href={`/stores/${s.slug}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>
                        {s.name}
                      </Link>
                      {dirty && <span style={{ color: '#b45309', fontSize: 10, marginLeft: 6 }}>● chưa lưu</span>}
                    </td>

                    <td style={td}>
                      <input
                        type="number" step="1" min="0" style={{ ...box, width: 84 }}
                        value={m.avgOrderValue ?? ''}
                        placeholder={s.estimatedAov != null ? s.estimatedAov.toFixed(0) : '—'}
                        onChange={e => setField(s.id, 'avgOrderValue', numOrNull(e.target.value))}
                      />
                      {usingEstimate && (
                        // Trung binh tren 1-2 deal khong dang tin — phai noi ro so mau.
                        <div style={{ fontSize: 10, color: s.estimatedFrom < 3 ? '#b45309' : '#94a3b8' }}>
                          ước lượng · {s.estimatedFrom} deal
                        </div>
                      )}
                    </td>

                    <td style={td}>
                      <input
                        type="number" step="0.5" min="0" max="100" style={{ ...box, width: 64, borderColor: m.commissionRate == null ? '#fbbf24' : '#e5e7eb' }}
                        value={m.commissionRate ?? ''}
                        placeholder="?"
                        onChange={e => setField(s.id, 'commissionRate', numOrNull(e.target.value))}
                      />
                    </td>

                    <td style={td}>
                      <input
                        type="number" step="1" min="0" style={{ ...box, width: 56 }}
                        value={m.cookieWindowDays ?? ''}
                        placeholder="—"
                        onChange={e => setField(s.id, 'cookieWindowDays', numOrNull(e.target.value))}
                      />
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

                    <td style={{ padding: '6px 10px' }}>
                      <select
                        value={m.allowsPaidTraffic}
                        onChange={e => setField(s.id, 'allowsPaidTraffic', e.target.value)}
                        style={{
                          fontSize: 11.5, padding: '3px 6px', borderRadius: 6, cursor: 'pointer',
                          color: (PAID_LABEL[m.allowsPaidTraffic] ?? PAID_LABEL.unknown).fg,
                          background: (PAID_LABEL[m.allowsPaidTraffic] ?? PAID_LABEL.unknown).bg,
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        {Object.entries(PAID_LABEL).map(([value, l]) => (
                          <option key={value} value={value}>{l.text}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.9, marginTop: 14 }}>
        <b>Cách đọc:</b> &ldquo;Cần % mua&rdquo; là tỉ lệ khách vào site phải thành đơn để tiền thu bằng tiền chi.
        Dưới 2% traffic coupon thường đạt được; trên 5% gần như chắc lỗ. &ldquo;Đơn/ngày&rdquo; làm tròn lên.
        <div style={{ marginTop: 6 }}>
          Ô <b>Đơn TB</b> để trống = dùng số ước lượng từ giá deal của chính shop (hiện mờ trong ô). Chỉ điền khi
          có số thật từ GoAffPro. <b>Hoa hồng</b> là số duy nhất bắt buộc gõ tay — ô viền vàng là chưa có.
        </div>
      </div>
    </div>
  )
}
