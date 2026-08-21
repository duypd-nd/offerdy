'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { phanTichDeal, dungVideo, type KetQuaPhanTich } from './actions'
import type { DealChon } from './page'

/**
 * Hai bước, và **bước dựng chỉ chạy được khi mở ở máy mình**.
 *
 * ⚠️ Vercel không dựng được video: không có ffmpeg, gói hàm 250 MB, hàm hết giờ
 * 60 giây. Nên trên production nút dựng bị khoá và trang chỉ cho tải tệp kịch
 * bản về. Từ chối rõ ràng còn hơn để người dùng bấm một nút chạy 60 giây rồi
 * nhận một lỗi không hiểu nổi.
 */
export default function VideoStudioClient({ deals }: { deals: DealChon[] }) {
  const [tim, setTim] = useState('')
  const [chon, setChon] = useState<DealChon | null>(null)
  const [kq, setKq] = useState<KetQuaPhanTich | null>(null)
  const [dang, batDau] = useTransition()
  const [ketQuaDung, setKetQuaDung] = useState<string | null>(null)
  const [loiDung, setLoiDung] = useState<string | null>(null)
  const [dangDung, setDangDung] = useState(false)

  const loc = deals.filter(d => {
    const q = tim.trim().toLowerCase()
    return !q || d.title.toLowerCase().includes(q) || String(d.code).includes(q) ||
      (d.store ?? '').toLowerCase().includes(q)
  })

  const phanTich = (d: DealChon) => {
    setChon(d); setKq(null); setKetQuaDung(null); setLoiDung(null)
    batDau(async () => setKq(await phanTichDeal(d.code)))
  }

  const dung = async () => {
    if (!kq?.ok) return
    setDangDung(true); setLoiDung(null); setKetQuaDung(null)
    try {
      const r = await dungVideo(kq.spec)
      if (r.ok) setKetQuaDung(`${r.tep} — dựng mất ${r.giay} giây`)
      else setLoiDung(r.error)
    } catch (e) {
      setLoiDung(String(e).slice(0, 300))
    } finally {
      setDangDung(false)
    }
  }

  const taiSpec = () => {
    if (!kq?.ok) return
    const blob = new Blob([JSON.stringify(kq.spec, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `spec-${kq.spec.product?.dealCode ?? 'video'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="adm-page" style={{ maxWidth: 1100 }}>
      <header className="adm-head">
        <div>
          <h1>Tạo video sản phẩm</h1>
          <p className="adm-sub">Chọn một deal → hệ thống lấy ảnh từ trang shop, ghép giá và mã từ kho, rồi dựng video dọc cho TikTok.</p>
        </div>
      </header>

      <div className="vid-cot">
        {/* ── Chọn deal ── */}
        <div>
          <input className="oa-search" style={{ width: '100%', marginBottom: 10 }}
            placeholder="Tìm deal theo tên, shop hoặc mã…"
            value={tim} onChange={e => setTim(e.target.value)} />
          <div className="vid-ds">
            {loc.slice(0, 60).map(d => (
              <button key={d.code} className={`vid-deal${chon?.code === d.code ? ' vid-deal--chon' : ''}`}
                onClick={() => phanTich(d)} disabled={dang}>
                {d.imageUrl
                  ? <Image src={d.imageUrl} alt="" width={44} height={44} className="vid-deal-anh" />
                  : <span className="vid-deal-anh" />}
                <span className="vid-deal-chu">
                  <b>{d.title.length > 54 ? d.title.slice(0, 54) + '…' : d.title}</b>
                  <span>#{d.code} · {d.store ?? '—'} · {d.priceSale ?? ''}{d.discount ? ` · -${d.discount}%` : ''}</span>
                </span>
              </button>
            ))}
            {!loc.length && <p className="usr-hint">Không có deal nào khớp.</p>}
          </div>
        </div>

        {/* ── Kết quả ── */}
        <div>
          {!chon && <p className="usr-hint">Chọn một deal ở bên trái để bắt đầu.</p>}
          {dang && <p className="usr-hint">Đang lấy ảnh từ trang sản phẩm…</p>}

          {kq && !kq.ok && <p className="usr-err">{kq.error}</p>}

          {kq?.ok && (
            <>
              <div className="vid-tomtat">
                <b>{kq.spec.scenes.length} cảnh · {kq.thoiLuong.toFixed(1)} giây · {kq.soAnh} ảnh</b>
                <span>{kq.maCoupon ? `Mã: ${kq.maCoupon}` : 'Shop không có mã'}</span>
              </div>

              {kq.canhBao.map(c => <p key={c} className="usr-warn" style={{ marginBottom: 6 }}>{c}</p>)}
              {kq.thoiLuong < 30 && <p className="usr-warn">Dưới 30 giây — trang sản phẩm ít ảnh quá.</p>}

              <div className="vid-canh">
                {kq.spec.scenes.map(s => (
                  <div key={s.id} className="vid-canh-o">
                    <Image src={s.image} alt="" width={54} height={54} className="vid-canh-anh" unoptimized />
                    <div className="vid-canh-chu">
                      <b>{s.type} · {s.duration}s</b>
                      <span>{s.overlayText.replace(/\n/g, ' / ')}</span>
                      {s.voiceText && <em>“{s.voiceText}”</em>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="vid-nut">
                <button className="usr-btn-primary" onClick={dung} disabled={dangDung}>
                  {dangDung ? 'Đang dựng… (1–2 phút)' : 'Dựng video ngay'}
                </button>
                <button className="oa-btn" onClick={taiSpec}>Tải tệp kịch bản</button>
              </div>

              {ketQuaDung && (
                <p className="usr-ok" style={{ marginTop: 10 }}>
                  Xong: <code>{ketQuaDung}</code>
                </p>
              )}
              {loiDung && (
                <div className="usr-err" style={{ marginTop: 10 }}>
                  {loiDung}
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Chạy ở máy: <code>npm run video:render .scratch/spec-{String(kq.spec.product?.dealCode ?? '')}.json</code>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
