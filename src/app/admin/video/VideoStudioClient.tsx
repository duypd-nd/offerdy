'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { phanTichDeal, dungVideo, dungLaiKichBan, type KetQuaPhanTich } from './actions'
import type { DealChon } from './page'

/**
 * Hai bước, và **bước dựng chỉ chạy được khi mở ở máy mình**.
 *
 * ⚠️ Vercel không dựng được video: không có ffmpeg, gói hàm 250 MB, hàm hết giờ
 * 60 giây. Nên trên production nút dựng bị khoá và trang chỉ cho tải tệp kịch
 * bản về. Từ chối rõ ràng còn hơn để người dùng bấm một nút chạy 60 giây rồi
 * nhận một lỗi không hiểu nổi.
 */
export default function VideoStudioClient({ deals, soThieuAnh = 0 }: { deals: DealChon[]; soThieuAnh?: number }) {
  const [tim, setTim] = useState('')
  const [chon, setChon] = useState<DealChon | null>(null)
  const [kq, setKq] = useState<KetQuaPhanTich | null>(null)
  const [dang, batDau] = useTransition()
  const [ketQuaDung, setKetQuaDung] = useState<string | null>(null)
  const [loiDung, setLoiDung] = useState<string | null>(null)
  const [dangDung, setDangDung] = useState(false)
  const [daChep, setDaChep] = useState(false)
  const [boAnh, setBoAnh] = useState<string[]>([])
  const [dangXep, setDangXep] = useState(false)

  const loc = deals.filter(d => {
    const q = tim.trim().toLowerCase()
    return !q || d.title.toLowerCase().includes(q) || String(d.code).includes(q) ||
      (d.store ?? '').toLowerCase().includes(q)
  })

  const phanTich = (d: DealChon) => {
    setChon(d); setKq(null); setKetQuaDung(null); setLoiDung(null); setBoAnh([])
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

  const chepLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setDaChep(true)
      setTimeout(() => setDaChep(false), 2000)
    } catch {
      // Clipboard bi tu choi (trang khong https, hoac nguoi dung chan) — o input
      // ben duoi van chon-va-chep tay duoc, nen khong bao loi om som.
    }
  }

  /**
   * Bo / lay lai mot anh.
   *
   * ⚠️ Dung lai kich ban NGAY, khong doi bam nut "ap dung". Mot danh sach canh
   * khong khop voi cac o tick la cach chac chan de dung ra mot video khac han
   * cai vua xem truoc. Buoc nay khong goi AI nen no gan nhu tuc thi.
   */
  const doiAnh = async (url: string) => {
    if (!kq?.ok) return
    const moi = boAnh.includes(url) ? boAnh.filter(u => u !== url) : [...boAnh, url]
    setBoAnh(moi)
    setDangXep(true); setKetQuaDung(null); setLoiDung(null)
    try {
      const r = await dungLaiKichBan(kq.nguon, moi)
      if (r.ok) setKq({ ...kq, spec: r.spec, thoiLuong: r.thoiLuong, soAnh: r.soAnh })
      else setLoiDung(r.error)
    } finally {
      setDangXep(false)
    }
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
          <input className="oa-search" style={{ width: '100%', marginBottom: 8 }}
            placeholder="Tìm deal theo tên, shop hoặc mã…"
            value={tim} onChange={e => setTim(e.target.value)} />

          {/* Nói rõ đang hiện bao nhiêu trên bao nhiêu. Một danh sách bị cắt mà
              không báo gì là cách chắc chắn để người dùng tưởng kho chỉ có
              chừng đó — đúng lỗi trang này mắc lúc đầu. */}
          <p className="vid-dem">
            {tim.trim()
              ? <>Khớp <b>{loc.length}</b> trong {deals.length} deal</>
              : <>Tất cả <b>{deals.length}</b> deal có ảnh và có link sản phẩm</>}
            {soThieuAnh > 0 && <> · {soThieuAnh} deal không có ảnh nên không tạo video được</>}
          </p>

          <div className="vid-ds">
            {loc.map(d => (
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

              {/* ── Chấm ảnh ─────────────────────────────────────────
                  Claude nhìn từng ảnh và nói nó thấy gì; `scoreImages()` cầm
                  nhận xét đó rồi quyết định bỏ ảnh nào. Bảng này để anh xem lại
                  và sửa tay — model chấm sai một tấm là chuyện thường, mà một
                  tấm ảnh sai làm hỏng cả cảnh. */}
              <div className="vid-anh">
                <div className="vid-anh-dau">
                  <b>Ảnh dùng trong video</b>
                  <span>
                    {kq.daChamAnh ? 'Claude đã chấm' : 'chưa chấm được — giữ nguyên thứ tự cào về'}
                    {dangXep && ' · đang dựng lại…'}
                  </span>
                </div>
                <div className="vid-anh-luoi">
                  {kq.nguon.anhGoc.map((url, i) => {
                    const d = kq.nguon.danhGia?.find(x => x.index === i)
                    const tuBo = kq.anhBo.some(b => b.url === url)
                    const taBo = boAnh.includes(url)
                    // Ảnh nằm trong kịch bản hiện tại — nguồn sự thật duy nhất,
                    // vì `scoreImages` còn bù lại ảnh khi bỏ quá tay.
                    const dung = kq.spec.scenes.some(sc => sc.image === url)
                    return (
                      <button key={url} type="button" onClick={() => doiAnh(url)} disabled={dangXep}
                        className={`vid-anh-o${dung ? '' : ' vid-anh-o--bo'}`}
                        title={taBo ? 'Bấm để dùng lại ảnh này' : 'Bấm để bỏ ảnh này'}>
                        <Image src={url} alt="" width={72} height={72} unoptimized />
                        <span className="vid-anh-diem">{d ? `${d.diem}/10` : '—'}</span>
                        <span className="vid-anh-ly">
                          {taBo ? 'anh đã bỏ' : !dung && tuBo ? 'AI bỏ' : d?.lyDo || (i === 0 ? 'ảnh trong kho' : '')}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="vid-anh-chu">Bấm vào một ảnh để bỏ hoặc dùng lại. Không gọi lại AI, lời đọc giữ nguyên.</p>
              </div>

              {/* ── Link do duoc ──────────────────────────────────────
                  Mot video khong do duoc chi la mot tai san dep. Day la duong
                  DUY NHAT biet video nao ra tien: dan link nay vao bio hoac
                  caption, moi luot bam se hien o /admin/reports duoi nhan
                  `video` va dung ma deal cua no. */}
              {typeof kq.spec.product?.ctaUrl === 'string' && (
                <div className="vid-link">
                  <label htmlFor="vid-cta">Link dán vào bio / caption</label>
                  <div className="vid-link-hang">
                    <input id="vid-cta" readOnly value={String(kq.spec.product.ctaUrl)}
                      onFocus={e => e.currentTarget.select()} />
                    <button className="oa-btn" onClick={() => chepLink(String(kq.spec.product.ctaUrl))}>
                      {daChep ? 'Đã chép' : 'Chép'}
                    </button>
                  </div>
                  <p>
                    Đếm lượt bấm ở <Link href="/admin/reports">/admin/reports</Link> — nhãn <code>video</code>.
                    Trên màn hình video chỉ hiện <code>offerdy.com/d/{String(kq.spec.product.dealCode ?? '')}</code> (không có
                    <code> ?s=video</code>) vì không ai gõ tay chuỗi truy vấn; lượt gõ tay vẫn về đúng deal, chỉ không mang nhãn.
                  </p>
                </div>
              )}

              {kq.canhBao.map(c => <p key={c} className="usr-warn" style={{ marginBottom: 6 }}>{c}</p>)}
              {kq.thoiLuong < 30 && <p className="usr-warn">Dưới 30 giây — trang sản phẩm ít ảnh quá.</p>}

              <div className="vid-canh">
                {kq.spec.scenes.map(s => (
                  <div key={s.id} className="vid-canh-o">
                    <Image src={s.image} alt="" width={54} height={54} className="vid-canh-anh" unoptimized />
                    <div className="vid-canh-chu">
                      <b>{s.type} · {s.duration}s</b>
                      {/* Chữ LON trên màn — chỉ ba cảnh cuối mới có */}
                      {s.badgeText && <span>{s.badgeText.replace(/\n/g, ' / ')}</span>}
                      {/* Phụ đề = đúng câu đọc lên. Không hiện `overlayText` ở đây nữa:
                          nó không được vẽ lên video, mà một bản xem trước cho thấy thứ
                          không có trên video thì tệ hơn là không xem trước. */}
                      {s.voiceText && <em>“{s.voiceText}”</em>}
                      {s.linkText && <span>{s.linkText}</span>}
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
