'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MIN_MERCHANT_CLICKS, assessCampaign, coDuocChayQuangCaoStore, valuePerMerchantClick,
} from '@/lib/adPerformance'
import { doiTrangThai, ghiChiTieu, luuGiaDinh } from './actions'

export type CampaignRow = {
  id: string
  name: string
  campaignTag: string
  destinationType: 'blog' | 'review' | 'store'
  destinationName: string | null
  status: 'draft' | 'active' | 'paused'
  dailyBudget: number | null
  maxDailyBudget: number | null
  note: string | null
  storeAllowsPaidTraffic: string | null
  /** Ten store SUY RA tu san pham trong bai (null neu khai tay o chien dich). */
  storeKinhTeTuBai: string | null
  /** Gia tri don TB la UOC LUONG tu gia deal, khong phai so nguoi van hanh go. */
  aovLaUocLuong: boolean
  storeCommissionRate: number | null
  storeAvgOrderValue: number | null
  cost: number
  adClicks: number
  impressions: number
  spendDays: number
  /** Luot bam sang merchant mang nhan nay — MOI nguon gop lai. */
  merchantClicks: number
  /** Rieng phan den tu Google Ads. */
  merchantClicksTuQuangCao: number
}

export type GiaDinh = {
  estimatedOrderRate: number | null
  fallbackEarningsPerOrder: number | null
  /** 1 USD = ? VNĐ. Để nhập chi phí thẳng bằng đồng. */
  tyGiaVndPerUsd: number | null
}

const VERDICT_UI = {
  tang:               { text: '📈 Nên tăng', fg: '#15803d', bg: '#f0fdf4' },
  giu:                { text: '➡️ Giữ nguyên', fg: '#b45309', bg: '#fffbeb' },
  dung:               { text: '🛑 Nên dừng', fg: '#b91c1c', bg: '#fef2f2' },
  'chua-du-so-lieu':  { text: '❓ Chưa đủ số liệu', fg: '#64748b', bg: '#f8fafc' },
} as const

const STATUS_UI = {
  draft:  { text: '📄 Nháp', fg: '#64748b' },
  active: { text: '▶️ Đang chạy', fg: '#15803d' },
  paused: { text: '⏸️ Tạm dừng', fg: '#b45309' },
} as const

const usd = (n: number) => `$${n.toFixed(2)}`
const numOrNull = (raw: string) => {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export default function AdsClient({ rows, giaDinh }: { rows: CampaignRow[]; giaDinh: GiaDinh }) {
  const router = useRouter()
  const [rate, setRate] = useState(giaDinh.estimatedOrderRate?.toString() ?? '')
  const [fallback, setFallback] = useState(giaDinh.fallbackEarningsPerOrder?.toString() ?? '')
  const [tyGia, setTyGia] = useState(giaDinh.tyGiaVndPerUsd?.toString() ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [spendFor, setSpendFor] = useState<string | null>(null)

  const rateNum = numOrNull(rate)
  const fallbackNum = numOrNull(fallback)
  const tyGiaNum = numOrNull(tyGia)

  /** Gia tri mot luot bam sang merchant — so cua store thang so mac dinh. */
  const giaTri = useMemo(() => (r: CampaignRow) => {
    if (rateNum == null) return null
    const tiLe = rateNum / 100
    const cuaStore = valuePerMerchantClick(r.storeCommissionRate, r.storeAvgOrderValue, tiLe)
    if (cuaStore != null) return { value: cuaStore, tuStore: true }
    if (fallbackNum == null || fallbackNum <= 0) return null
    return { value: fallbackNum * tiLe, tuStore: false }
  }, [rateNum, fallbackNum])

  async function chay<T>(key: string, fn: () => Promise<{ ok: boolean; error?: string } & T>) {
    setBusy(key); setLoi(null)
    const res = await fn()
    setBusy(null)
    if (!res.ok) setLoi(res.error ?? 'Có lỗi xảy ra')
    else router.refresh()
  }

  const tongChi = rows.reduce((a, r) => a + r.cost, 0)
  const tongBam = rows.reduce((a, r) => a + r.merchantClicks, 0)

  return (
    <div className="adm-page" style={{ maxWidth: 1200 }}>
      {/* ⚠️ KHONG dung `.adm-back-link` o day: lop do la chu TRANG 35% dat cho
          thanh ben toi, tren than trang sang thi gan nhu vo hinh. Da thay ro o
          anh chup 390px. Cac trang admin khac khong co link quay lui — nav ben
          trai da lo viec do. */}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
        📣 Chạy quảng cáo
      </h1>

      {/* Cau nay phai o ngay dau trang va khong duoc bo di: no la khac biet giua
          mot cong cu dung duoc va mot cong cu noi doi. */}
      <p style={{ color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>
        Trang này <b>không điều khiển Google</b> — mọi nút ở đây chỉ đổi <i>ghi chép</i>
        trong Offerdy. Bật/tắt và trần ngân sách phải đặt bên Google Ads (Script /
        Automated Rules) để cron chết thì trần vẫn giữ. Và nó{' '}
        <b>không biết lợi nhuận</b>: đơn hàng thật nằm bên GoAffPro. Thứ đo được là{' '}
        <b>chi phí cho mỗi lượt bấm sang merchant</b>.
      </p>

      {loi && (
        <div style={{ padding: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', marginBottom: 16 }}>
          {loi}
        </div>
      )}

      {/* ── Giả định ───────────────────────────────────────────────── */}
      <section style={{ padding: 16, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Giả định — mọi phán quyết bên dưới dựa vào hai ô đầu</div>
        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
          Hai ô đầu là <b>giả định, không phải số đo</b> — GoAffPro giữ số thật. Đặt tỉ lệ
          cao là tự cho phép mình tiêu nhiều hơn mức an toàn.{' '}
          <b>Ô tỉ giá</b> thì khác: nó chỉ để nhập chi phí thẳng bằng đồng, không ảnh hưởng
          phán quyết nào — tài khoản Google Ads báo bằng VNĐ còn trang này tính bằng USD.
        </div>
        <div className="ads-gd-grid">
          <label>
            <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>% khách bấm sang merchant sẽ mua</span>
            <input value={rate} onChange={e => setRate(e.target.value)} placeholder="VD: 2" style={inp} />
          </label>
          <label>
            <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Hoa hồng mỗi đơn (USD) khi store chưa khai</span>
            <input value={fallback} onChange={e => setFallback(e.target.value)} placeholder="VD: 12" style={inp} />
          </label>
          <label>
            <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Tỉ giá: 1 USD = ? VNĐ</span>
            <input value={tyGia} onChange={e => setTyGia(e.target.value)} placeholder="VD: 26200" style={inp} />
          </label>
          <button
            className="oa-btn oa-btn-primary"
            disabled={busy === 'gd'}
            onClick={() => chay('gd', () => luuGiaDinh(rateNum, fallbackNum, tyGiaNum))}
          >
            {busy === 'gd' ? 'Đang lưu…' : 'Lưu giả định'}
          </button>
        </div>
        {rateNum == null && (
          <div style={{ marginTop: 10, color: '#b45309', fontSize: 13 }}>
            ⚠️ Chưa có tỉ lệ đơn ước tính nên <b>không phán quyết được chiến dịch nào</b> —
            cố ý để trống thay vì đoán một con số.
          </div>
        )}
      </section>

      <div className="adm-stat-row">
        <Stat label="Chiến dịch" value={String(rows.length)} />
        <Stat label="Đã tiêu" value={usd(tongChi)} />
        <Stat label="Bấm sang merchant" value={String(tongBam)} />
        <Stat label="Chi phí / lượt bấm" value={tongBam > 0 ? usd(tongChi / tongBam) : '—'} />
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12, marginTop: 20 }}>
          Chưa có chiến dịch nào. Tạo ở <b>Sanity Studio → Chiến dịch quảng cáo</b>, nhớ đặt
          nhãn <code>?s=</code> rồi dán nhãn đó vào URL đích của quảng cáo bên Google Ads.
        </div>
      ) : (
        <div className="adm-scroll-x" style={{ marginTop: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={th}>Chiến dịch</th>
                <th style={th}>Trạng thái</th>
                <th style={thR}>Đã tiêu</th>
                <th style={thR}>Bấm QC</th>
                <th style={thR}>Sang merchant</th>
                <th style={thR}>$/lượt</th>
                <th style={th}>Đề xuất</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const gt = giaTri(r)
                const kq = gt ? assessCampaign({
                  cost: r.cost, merchantClicks: r.merchantClicks, valuePerMerchantClick: gt.value,
                }) : null
                const v = kq ? VERDICT_UI[kq.verdict] : VERDICT_UI['chua-du-so-lieu']
                const ppc = r.destinationType === 'store'
                  ? coDuocChayQuangCaoStore(r.storeAllowsPaidTraffic) : null
                const vuotTran = r.maxDailyBudget != null && r.spendDays > 0
                  && r.cost / r.spendDays > r.maxDailyBudget

                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>
                        <code>?s={r.campaignTag}</code>
                        {r.destinationName ? ` → ${r.destinationName}` : ''}
                      </div>
                      {ppc && !ppc.duoc && (
                        <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>🚫 {ppc.canhBao}</div>
                      )}
                      {ppc?.duoc && ppc.canhBao && (
                        <div style={{ color: '#b45309', fontSize: 12, marginTop: 4 }}>⚠️ {ppc.canhBao}</div>
                      )}
                      {vuotTran && (
                        <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>
                          🔺 Trung bình {usd(r.cost / r.spendDays)}/ngày, vượt trần {usd(r.maxDailyBudget as number)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, color: STATUS_UI[r.status].fg, whiteSpace: 'nowrap' }}>
                      {STATUS_UI[r.status].text}
                    </td>
                    <td style={tdR}>{r.cost > 0 ? usd(r.cost) : '—'}</td>
                    <td style={tdR}>{r.adClicks || '—'}</td>
                    <td style={tdR}>
                      {r.merchantClicks || '—'}
                      {/* Tach rieng phan den tu quang cao: mot nhan co the dung ca o
                          bai dang mien phi lan o quang cao, gop lai thi tien quang
                          cao duoc ghi cong cua luot mien phi. */}
                      {r.merchantClicks > 0 && r.merchantClicksTuQuangCao !== r.merchantClicks && (
                        <div style={{ color: '#64748b', fontSize: 11 }}>
                          {r.merchantClicksTuQuangCao} từ QC
                        </div>
                      )}
                    </td>
                    <td style={tdR}>
                      {kq?.costPerMerchantClick != null ? usd(kq.costPerMerchantClick) : '—'}
                      {gt && (
                        <div style={{ color: '#64748b', fontSize: 11 }}>
                          ngưỡng {usd(gt.value)}{gt.tuStore ? '' : '*'}
                          {gt.tuStore && r.storeKinhTeTuBai && (
                            <><br />theo {r.storeKinhTeTuBai}{r.aovLaUocLuong ? ' (đơn TB ước lượng)' : ''}</>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, minWidth: 220 }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: v.bg, color: v.fg, fontSize: 12, fontWeight: 600 }}>
                        {v.text}
                      </span>
                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                        {kq?.reason ?? (rateNum == null
                          ? 'Chưa điền "% khách bấm sang merchant sẽ mua" ở đầu trang.'
                          : 'Chưa biết hoa hồng mỗi đơn cho chiến dịch này — khai "% hoa hồng" cho store ở /admin/ad-planner, hoặc điền ô mặc định ở đầu trang.')}
                      </div>
                    </td>
                    {/* ⚠️ NUT O DAY CHI GHI SO, KHONG BAT/TAT GOOGLE.
                        Ban dau cho la hai nut `▶️` / `⏸️` tron — nhin y het mot
                        cai dieu khien chien dich, va cau canh bao o dau trang
                        khong cuu duoc: bam vao thay trang thai doi la nguoi ta
                        tin chien dich da chay. Nhan bang CHU, kem link mo thang
                        Google Ads — cho bat/tat THAT. */}
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <button className="oa-btn" onClick={() => setSpendFor(spendFor === r.id ? null : r.id)}>
                        + Chi phí
                      </button>
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="oa-btn"
                          disabled={busy === r.id}
                          title="Chỉ đổi ghi chép trong Offerdy — không bật/tắt Google"
                          onClick={() => chay(r.id, () => doiTrangThai(r.id, r.status === 'active' ? 'paused' : 'active'))}
                        >
                          {busy === r.id
                            ? 'Đang lưu…'
                            : r.status === 'active' ? 'Đánh dấu đã dừng' : 'Đánh dấu đang chạy'}
                        </button>
                        <a
                          className="oa-btn"
                          href="https://ads.google.com/aw/campaigns"
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Nơi bật/tắt thật"
                        >Mở Google Ads ↗</a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {spendFor && (
        <FormChiTieu
          campaignId={spendFor}
          tyGia={tyGiaNum}
          onXong={() => { setSpendFor(null); router.refresh() }}
          onLoi={setLoi}
        />
      )}

      <p style={{ color: '#64748b', fontSize: 13, marginTop: 20, lineHeight: 1.6 }}>
        <b>*</b> = ngưỡng tính từ hoa hồng mặc định vì store chưa khai <i>% hoa hồng</i> và{' '}
        <i>Giá trị đơn TB</i> ở <Link href="/admin/ad-planner">/admin/ad-planner</Link>.{' '}
        <b>Bấm QC</b> là số Google báo; <b>Sang merchant</b> là số site tự đếm — hai thứ khác nhau.{' '}
        Phán quyết chỉ chuyển khỏi <i>Chưa đủ số liệu</i> sau {MIN_MERCHANT_CLICKS} lượt bấm
        sang merchant, trừ khi đã lỗ rõ.
      </p>
    </div>
  )
}

function FormChiTieu({ campaignId, tyGia, onXong, onLoi }: {
  campaignId: string; tyGia: number | null; onXong: () => void; onLoi: (s: string | null) => void
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [cost, setCost] = useState('')
  // Mac dinh theo VND khi da co ty gia: tai khoan Google Ads cua Offerdy bao
  // bang dong, nen do la thu nguoi van hanh dang nhin thay khi go.
  const [donVi, setDonVi] = useState<'usd' | 'vnd'>(tyGia ? 'vnd' : 'usd')
  const [adClicks, setAdClicks] = useState('')
  const [impressions, setImpressions] = useState('')
  const [dangLuu, setDangLuu] = useState(false)

  async function luu() {
    const c = numOrNull(cost)
    if (c == null) { onLoi('Nhập chi phí đã'); return }
    setDangLuu(true); onLoi(null)
    const res = await ghiChiTieu({
      campaignId, date, cost: c, donVi, tyGia,
      adClicks: numOrNull(adClicks), impressions: numOrNull(impressions),
    })
    setDangLuu(false)
    if (!res.ok) onLoi(res.error)
    else onXong()
  }

  return (
    <section style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Nhập chi phí một ngày</div>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
        Chép từ Google Ads. Nhập lại cùng một ngày sẽ <b>ghi đè</b>, không cộng dồn.
        {donVi === 'vnd' && (tyGia
          ? <> Quy đổi ở máy chủ theo tỉ giá <b>{tyGia.toLocaleString('vi-VN')}</b>, và
              tỉ giá đó được <b>lưu lại theo từng ngày</b> — sửa tỉ giá sau này không làm
              số cũ chạy lung tung.</>
          : <span style={{ color: '#b91c1c' }}> ⚠️ Chưa có tỉ giá — điền ô “1 USD = ? VNĐ” ở đầu trang trước.</span>)}
      </div>
      <div className="ads-ct-grid">
        <label><span style={lbl}>Ngày</span><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></label>
        <label>
          <span style={lbl}>Chi phí</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={cost} onChange={e => setCost(e.target.value)} placeholder={donVi === 'vnd' ? '61561' : '2.35'} style={inp} />
            <select value={donVi} onChange={e => setDonVi(e.target.value as 'usd' | 'vnd')} style={{ ...inp, width: 76 }}>
              <option value="vnd">đ</option>
              <option value="usd">$</option>
            </select>
          </div>
        </label>
        <label><span style={lbl}>Lượt bấm QC</span><input value={adClicks} onChange={e => setAdClicks(e.target.value)} placeholder="31" style={inp} /></label>
        <label><span style={lbl}>Lượt hiển thị</span><input value={impressions} onChange={e => setImpressions(e.target.value)} placeholder="820" style={inp} /></label>
        <button className="oa-btn oa-btn-primary" onClick={luu} disabled={dangLuu}>
          {dangLuu ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="adm-stat-card">
      <div className="adm-stat-count">{value}</div>
      <div className="adm-stat-label">{label}</div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 10px', fontSize: 12, color: '#64748b', fontWeight: 600 }
const thR: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { padding: '10px', verticalAlign: 'top' }
const tdR: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' }
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, marginBottom: 4 }
