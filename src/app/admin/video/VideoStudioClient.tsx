'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  phanTichDeal, dungVideo, dungLaiKichBan, vietCaptionVideo, tepVideoDaCo, danhDauDaDang, danhDauCoVideo,
  type KetQuaPhanTich, type BienTheCaption,
} from './actions'
import { CAPTION_ANGLES, type CaptionAngle } from '@/lib/ai/generateCaption'
import { DANH_SACH_PHONG_CACH, type TenPhongCach } from '@/lib/video/videoStyle'
import { formatAdminDateTime } from '@/lib/adminDateTime'
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
  // Mot khoa thay vi mot bien boolean: goi dang bai co nhieu nut Chep, mot cai
  // boolean chung se lam ca ba nut cung bao "Da chep".
  const [daChep, setDaChep] = useState<string | null>(null)
  const [goc, setGoc] = useState<CaptionAngle>('question')
  const [caption, setCaption] = useState<BienTheCaption[] | null>(null)
  const [boCaption, setBoCaption] = useState<string[]>([])
  const [loiCaption, setLoiCaption] = useState<string | null>(null)
  const [dangViet, setDangViet] = useState(false)
  const [tepVideo, setTepVideo] = useState<{ tep: string; luc: string } | null>(null)
  // ⚠️ Ma deal danh dau TRONG PHIEN NAY. Server chi doc `lastPostedAt` mot lan
  // luc dung trang, nen khong co cai nay thi bam "Danh dau da dang" xong danh
  // sach ben trai van hien "chua dang" cho toi khi tai lai trang.
  const [vuaDanhDau, setVuaDanhDau] = useState<number[]>([])
  // Tick "co video" nguoi dung vua doi trong phien nay: ma deal -> co/khong.
  // Doi ngay tren man hinh roi moi goi server (lac quan), va TRA VE trang thai
  // cu neu server tu choi — mot o tick nhay roi lang le quay ve sai la kieu loi
  // nguoi dung khong bao gio bao cao, chi thay "no khong luu".
  const [tickVideo, setTickVideo] = useState<Record<number, boolean>>({})
  const [loiTick, setLoiTick] = useState<string | null>(null)
  // `mau-tiktok` chu khong phai `mac-dinh`: nhip hoc tu 4 video mau do duoc la
  // 1,06 giay moi canh (mau 1,11-2,41), con `mac-dinh` 4,5 giay thi cham hon
  // moi video mau. Ai muon ban cham van chon lai duoc o o ben tren.
  const [phongCach, setPhongCach] = useState<TenPhongCach>('mau-tiktok')
  const [anhChon, setAnhChon] = useState<string[]>([])
  const [dangXep, setDangXep] = useState(false)
  const [dangTai, setDangTai] = useState(false)

  /**
   * Ba trang thai cua mot deal, theo dung thu tu cong viec that:
   *   chua lam  ->  da dung video (chua dang)  ->  da dang
   *
   * ⚠️ `coVideo` chi dung tren may cuc bo (xem chu thich o `page.tsx`), con
   * `daDang` doc tu Sanity nen o dau cung dung. Khi hai dau mau thuan thi
   * `daDang` thang — da dang roi thi con video hay khong khong con quan trong.
   */
  const coVideo = (d: DealChon): boolean =>
    tickVideo[d.code] ?? (!!d.coVideoTay || d.coVideoTep)

  const trangThai = (d: DealChon): 'da-dang' | 'co-video' | 'chua' =>
    d.daDangLuc || vuaDanhDau.includes(d.code) ? 'da-dang' : coVideo(d) ? 'co-video' : 'chua'

  const daDang = chon ? trangThai(chon) === 'da-dang' : false
  const soDaDang = deals.filter(d => trangThai(d) === 'da-dang').length
  const soCoVideo = deals.filter(d => trangThai(d) === 'co-video').length

  const loc = deals.filter(d => {
    const q = tim.trim().toLowerCase()
    return !q || d.title.toLowerCase().includes(q) || String(d.code).includes(q) ||
      (d.store ?? '').toLowerCase().includes(q)
  })

  const phanTich = (d: DealChon) => {
    setChon(d); setKq(null); setKetQuaDung(null); setLoiDung(null); setAnhChon([])
    setCaption(null); setBoCaption([]); setLoiCaption(null); setTepVideo(null)
    batDau(async () => {
      const r = await phanTichDeal(d.code, phongCach)
      setKq(r)
      // Hoi ngay trong cung mot transition, KHONG dung useEffect: ESLint cua repo
      // tu choi mau useEffect + setState, va o day khong can no that.
      if (r.ok) setTepVideo(await tepVideoDaCo(r.spec.output))
    })
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

  const chepLink = async (url: string, khoa: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setDaChep(khoa)
      setTimeout(() => setDaChep(null), 2000)
    } catch {
      // Clipboard bi tu choi (trang khong https, hoac nguoi dung chan) — o input
      // ben duoi van chon-va-chep tay duoc, nen khong bao loi om som.
    }
  }

  const viet = async () => {
    if (!kq?.ok || !kq.spec.product?.dealCode) return
    setDangViet(true); setLoiCaption(null)
    try {
      const r = await vietCaptionVideo(Number(kq.spec.product.dealCode), goc)
      if (r.ok) { setCaption(r.bienThe); setBoCaption(r.bo) }
      else setLoiCaption(r.error)
    } finally {
      setDangViet(false)
    }
  }

  /**
   * Tai TAT CA anh dang dung ve mot tep .zip.
   *
   * ⚠️ Vi sao khong bam lien tiep nhieu lien ket tai: trinh duyet dien thoai
   * chan tu tep thu hai tro di. Mot tep zip la duong duy nhat "bam mot cai duoc
   * het" that su chay tren dien thoai.
   *
   * ⚠️ Va vi sao la POST + blob chu khong phai mot lien ket GET: danh sach anh
   * la 9 dia chi CDN, noi lai thanh chuoi truy van thi vuot gioi han do dai URL
   * cua may chu.
   */
  const taiHet = async (k: Extract<KetQuaPhanTich, { ok: true }>) => {
    const dung = anhChon.length ? anhChon : k.anhDung
    if (!dung.length) return
    setDangTai(true)
    try {
      const r = await fetch('/admin/video/tai-anh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ urls: dung, ten: `anh-deal-${k.spec.product?.dealCode ?? 'video'}` }),
      })
      if (!r.ok) { setLoiDung(`Tải ảnh hỏng: ${r.status} ${(await r.text()).slice(0, 120)}`); return }
      // Nói thật khi có ảnh tải hỏng, thay vì lặng lẽ giao một tệp thiếu.
      const soAnh = r.headers.get('x-so-anh')
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `anh-deal-${k.spec.product?.dealCode ?? 'video'}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
      if (soAnh && soAnh.split('/')[0] !== soAnh.split('/')[1]) {
        setLoiDung(`Chỉ tải được ${soAnh} ảnh — số còn lại CDN của shop từ chối.`)
      }
    } catch (e) {
      setLoiDung(String(e).slice(0, 200))
    } finally {
      setDangTai(false)
    }
  }

  const doiTickVideo = async (d: DealChon, co: boolean) => {
    setTickVideo(cu => ({ ...cu, [d.code]: co }))
    setLoiTick(null)
    const r = await danhDauCoVideo(d.code, co)
    if (!r.ok) {
      setTickVideo(cu => ({ ...cu, [d.code]: !co }))
      setLoiTick(`Không lưu được dấu cho #${d.code}. Thử lại.`)
    }
  }

  const danhDau = async () => {
    if (!kq?.ok || !kq.spec.product?.dealCode) return
    const ma = Number(kq.spec.product.dealCode)
    const r = await danhDauDaDang(ma)
    if (r.ok) setVuaDanhDau(cu => cu.includes(ma) ? cu : [...cu, ma])
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
    const dangDung = anhChon.length ? anhChon : kq.anhDung
    // ⚠️ Gửi cả danh sách muốn dùng, KHÔNG gửi "ảnh cần bỏ". Ảnh lấy lại thì
    // xếp cuối: nó là ảnh Claude đã chấm thấp, không nên chiếm cảnh mở đầu.
    const moi = dangDung.includes(url) ? dangDung.filter(u => u !== url) : [...dangDung, url]
    setDangXep(true); setKetQuaDung(null); setLoiDung(null)
    try {
      const r = await dungLaiKichBan(kq.nguon, moi, phongCach)
      if (r.ok) {
        setAnhChon(r.anhDung)
        setKq({ ...kq, spec: r.spec, thoiLuong: r.thoiLuong, soAnh: r.anhDung.length })
      } else setLoiDung(r.error)
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
          {/* ⚠️ Doi phong cach thi phai PHAN TICH LAI — no doi so canh, do dai
              canh va ca chuyen canh. Doi ngay tai cho ma khong dung lai kich ban
              thi bang canh ben duoi se noi mot dang con video dung ra mot dang. */}
          <label className="vid-pc">
            <span>Phong cách</span>
            <select value={phongCach} onChange={e => {
              const moi = e.target.value as TenPhongCach
              setPhongCach(moi)
              if (chon) { setKq(null); setAnhChon([]); batDau(async () => setKq(await phanTichDeal(chon.code, moi))) }
            }} disabled={dang}>
              {DANH_SACH_PHONG_CACH.map(p => <option key={p.ten} value={p.ten}>{p.nhan}</option>)}
            </select>
          </label>

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

          {/* Bang tong: mot dong noi ro con bao nhieu viec, thay vi bat nguoi dung
              tu dem dau tick trong danh sach 448 dong. */}
          <p className="vid-dem">
            <span className="vid-dau vid-dau--da-dang">✓ đã đăng</span> <b>{soDaDang}</b>
            {' · '}<b>{soCoVideo}</b> có video chưa đăng
            {' · còn '}<b>{deals.length - soDaDang - soCoVideo}</b> chưa làm
          </p>
          {loiTick && <p className="usr-warn" style={{ marginBottom: 6 }}>{loiTick}</p>}

          <div className="vid-ds">
            {/* ⚠️ Hang deal la <div> boc mot <button>, KHONG phai mot <button> lon
                nhu truoc. HTML khong cho long o tick trong nut, va neu co long
                duoc thi cu bam vao o tick se chay luon ca nut chon deal. */}
            {loc.map(d => {
              const tt = trangThai(d)
              return (
                <div key={d.code} className={`vid-hang${chon?.code === d.code ? ' vid-hang--chon' : ''}${tt === 'da-dang' ? ' vid-deal--xong' : ''}`}>
                  <button className="vid-deal" onClick={() => phanTich(d)} disabled={dang}>
                    {d.imageUrl
                      ? <Image src={d.imageUrl} alt="" width={44} height={44} className="vid-deal-anh" />
                      : <span className="vid-deal-anh" />}
                    <span className="vid-deal-chu">
                      <b>{d.title.length > 54 ? d.title.slice(0, 54) + '…' : d.title}</b>
                      <span>#{d.code} · {d.store ?? '—'} · {d.priceSale ?? ''}{d.discount ? ` · -${d.discount}%` : ''}</span>
                    </span>
                    {tt === 'da-dang' && (
                      <span className="vid-dau vid-dau--da-dang"
                        title={d.daDangLuc ? `Đã đăng lúc ${formatAdminDateTime(d.daDangLuc)}` : 'Vừa đánh dấu đã đăng'}>
                        ✓ đã đăng
                      </span>
                    )}
                  </button>

                  <label className="vid-tick" title={
                    coVideo(d)
                      ? (d.coVideoTay ? `Đánh dấu có video lúc ${formatAdminDateTime(d.coVideoTay)}` : 'Tìm thấy tệp .mp4 trong out/ trên máy này')
                      : 'Tick khi đã dựng xong video cho deal này'
                  }>
                    <input type="checkbox" checked={coVideo(d)}
                      onChange={e => doiTickVideo(d, e.target.checked)} />
                    <span>video</span>
                  </label>
                </div>
              )
            })}
            {!loc.length && <p className="usr-hint">Không có deal nào khớp.</p>}
          </div>
        </div>

        {/* ── Kết quả ── */}
        <div>
          {/* ⚠️ KHONG viet "ben trai": duoi 900px hai cot xep chong nen danh sach
              nam BEN TREN, khong nam ben trai. Mot chi dan sai huong con te hon
              khong co chi dan. */}
          {!chon && <p className="usr-hint">Chọn một deal trong danh sách để bắt đầu.</p>}
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
                  <button className="oa-btn vid-anh-taihet" onClick={() => taiHet(kq)} disabled={dangTai}>
                    {dangTai ? 'Đang gói…' : '⤓ Tải hết (.zip)'}
                  </button>
                </div>
                <div className="vid-anh-luoi">
                  {kq.nguon.anhGoc.map((url, i) => {
                    const d = kq.nguon.danhGia?.find(x => x.index === i)
                    const aiBo = kq.anhBo.some(b => b.url === url)
                    // Danh sách đang dùng là nguồn sự thật duy nhất — KHÔNG đọc
                    // từ `spec.scenes`: nhiều ảnh hơn số cảnh thì có ảnh không
                    // xuất hiện cảnh nào mà vẫn đang được chọn.
                    const dung = (anhChon.length ? anhChon : kq.anhDung).includes(url)
                    return (
                      <div key={url} className="vid-anh-cell">
                        <button type="button" onClick={() => doiAnh(url)} disabled={dangXep}
                          className={`vid-anh-o${dung ? '' : ' vid-anh-o--bo'}`}
                          title={dung ? 'Bấm để bỏ ảnh này' : 'Bấm để dùng lại ảnh này'}>
                          <Image src={url} alt="" width={72} height={72} unoptimized />
                          <span className="vid-anh-diem">{d ? `${d.diem}/10` : '—'}</span>
                          <span className="vid-anh-ly">
                            {!dung && aiBo ? 'AI bỏ' : !dung ? 'anh đã bỏ' : d?.lyDo || (i === 0 ? 'ảnh trong kho' : '')}
                          </span>
                        </button>
                        {/* ⚠️ Phai la mot LIEN KET that, va phai di qua may chu.
                            Thuoc tinh `download` bi trinh duyet BO QUA voi lien
                            ket khac ten mien — ma anh nam tren CDN cua tung
                            shop. Bam thang vao chi mo anh ra chu khong tai. */}
                        <a className="vid-anh-tai" download
                          href={`/admin/video/tai-anh?url=${encodeURIComponent(url)}&ten=${encodeURIComponent(`${kq.spec.product?.dealCode ?? 'anh'}-${String(i + 1).padStart(2, '0')}`)}`}
                          title="Tải ảnh này về máy">⤓</a>
                      </div>
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
              {/* ── Gói đăng bài ──────────────────────────────────────
                  Ba thứ cần để đăng một bài, ở MỘT chỗ. Trước đây chúng nằm ba
                  nơi — tệp MP4 ở `out/`, caption ở /admin/social-kit, link đo
                  được ở đây — và đó là lý do bốn video đã dựng xong vẫn chưa
                  đăng cái nào. Công cụ không thiếu tính năng; nó thiếu chỗ gom. */}
              <div className="vid-goi">
                <div className="vid-goi-dau">
                  <b>Gói đăng bài</b>
                  <span>ba thứ cần để đăng, ở một chỗ</span>
                </div>

                {typeof kq.spec.product?.ctaUrl === 'string' && (
                  <div className="vid-link">
                    <label htmlFor="vid-cta">1 · Link dán vào bio / caption</label>
                    <div className="vid-link-hang">
                      <input id="vid-cta" readOnly value={String(kq.spec.product.ctaUrl)}
                        onFocus={e => e.currentTarget.select()} />
                      <button className="oa-btn" onClick={() => chepLink(String(kq.spec.product.ctaUrl), 'link')}>
                        {daChep === 'link' ? 'Đã chép' : 'Chép'}
                      </button>
                    </div>
                    <p>
                      Đếm lượt bấm ở <Link href="/admin/reports">/admin/reports</Link> — nhãn <code>video</code>.
                      Trên màn hình video chỉ hiện <code>offerdy.com/d/{String(kq.spec.product.dealCode ?? '')}</code> (không có
                      <code> ?s=video</code>) vì không ai gõ tay chuỗi truy vấn; lượt gõ tay vẫn về đúng deal, chỉ không mang nhãn.
                    </p>
                  </div>
                )}

                {/* ── Tệp video ──
                    Hỏi ổ đĩa chứ không đoán theo mã deal: `spec.output` là tên tệp
                    thật mà bộ dựng ghi ra. Nhờ vậy video dựng từ phiên trước vẫn
                    hiện ở đây, không phải dựng lại chỉ để biết nó nằm đâu. */}
                <div className="vid-link">
                  <label>2 · Tệp video</label>
                  {tepVideo ? (
                    <>
                      <div className="vid-link-hang">
                        <input readOnly value={tepVideo.tep} onFocus={e => e.currentTarget.select()} />
                        <button className="oa-btn" onClick={() => chepLink(tepVideo.tep, 'tep')}>
                          {daChep === 'tep' ? 'Đã chép' : 'Chép'}
                        </button>
                      </div>
                      <p>Dựng lúc {new Date(tepVideo.luc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ VN).</p>
                    </>
                  ) : (
                    <p style={{ marginTop: 0 }}>Chưa dựng — bấm <b>Dựng video ngay</b> ở cuối trang.</p>
                  )}
                </div>

                {/* ── Caption ──
                    ⚠️ Dùng lại `generateCaptionsForDeal` của /admin/social-kit,
                    KHÔNG viết bộ sinh caption thứ hai. Hàng rào chống bịa số nằm
                    trong đó; một bản sao sẽ lệch ngay lần sửa brief đầu tiên, và
                    cái lệch ra là một con số sai trong bài đã đăng. */}
                <div className="vid-link">
                  <label htmlFor="vid-goc">3 · Caption TikTok</label>
                  <div className="vid-link-hang">
                    <select id="vid-goc" className="vid-goc" value={goc}
                      onChange={e => setGoc(e.target.value as CaptionAngle)}>
                      {CAPTION_ANGLES.map(a => (
                        <option key={a.id} value={a.id}>{a.label} — {a.hint}</option>
                      ))}
                    </select>
                    <button className="oa-btn" onClick={viet} disabled={dangViet}>
                      {dangViet ? 'Đang viết…' : caption ? 'Viết lại' : 'Viết caption'}
                    </button>
                  </div>

                  {loiCaption && <p className="usr-err" style={{ marginTop: 8 }}>{loiCaption}</p>}

                  {caption?.map((c, i) => (
                    <div key={i} className="vid-cap">
                      {/* 10 dòng: caption TikTok là hook + 2-3 dòng thân + CTA +
                          dòng hashtag, cách nhau bằng dòng trống. Để 7 dòng thì
                          đúng dòng hashtag bị đẩy khuất — mà đó là dòng người ta
                          hay sửa nhất. */}
                      <textarea defaultValue={c.text} rows={10} />
                      <button className="oa-btn" onClick={e => {
                        const ta = e.currentTarget.previousElementSibling as HTMLTextAreaElement
                        chepLink(ta.value, `cap${i}`)
                      }}>{daChep === `cap${i}` ? 'Đã chép' : 'Chép caption'}</button>
                    </div>
                  ))}

                  {/* Caption bị hàng rào loại thì NÓI RA. Im lặng trả về ít biến thể
                      hơn làm người dùng tưởng model lười, chứ không biết là nó vừa
                      định viết một con số không kiểm chứng được. */}
                  {boCaption.length > 0 && (
                    <p style={{ marginTop: 8 }}>
                      {boCaption.length} biến thể bị hàng rào loại (viết số không kiểm chứng được).
                    </p>
                  )}

                  {caption && (
                    <p style={{ marginTop: 8 }}>
                      TikTok không biến URL trong caption thành link bấm được, nên caption chỉ nhắc
                      mã sản phẩm — link đo được nằm ở bio, mục 1 phía trên.
                    </p>
                  )}
                </div>

                <div className="vid-goi-cuoi">
                  <button className="oa-btn" onClick={danhDau} disabled={daDang}>
                    {daDang ? 'Đã đánh dấu' : 'Đánh dấu đã đăng'}
                  </button>
                  <span>Cùng ô <code>lastPostedAt</code> mà /admin/social-kit dùng để xoay vòng deal — đánh dấu ở đây thì bên kia không đề xuất lại deal này.</span>
                </div>
              </div>

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
