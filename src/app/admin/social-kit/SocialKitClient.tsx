'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { buildCaption, shortLinkUrl, type LinkStyle } from '@/lib/socialCaption'
import { parseCampaign } from '@/lib/shortLinkSource'
import { CAPTION_ANGLES, type CaptionAngle } from '@/lib/ai/generateCaption'
import { generateCaptionsForDeal, type GeneratedCaption } from './actions'

type KitDeal = {
  code: number
  title: string
  priceSale: string
  priceOrig?: string
  discount: number
  discountByAmount?: boolean
  slug?: string
  imageUrl?: string
  categoryName?: string
  shortLinkClicks: number
  dealClicks: number
}

const QR_SIZE = 220

export default function SocialKitClient({ deals, missingCode }: {
  deals: KitDeal[]
  missingCode: number
}) {
  const [search, setSearch] = useState('')
  const [selectedCode, setSelectedCode] = useState<number | null>(deals[0]?.code ?? null)
  const [style, setStyle] = useState<LinkStyle>('deal')
  const [campaignRaw, setCampaignRaw] = useState('')
  // Caption la GIA TRI DAN XUAT tu deal/kieu link/campaign, tru khi admin tu sua.
  // Luu ban sua rieng thay vi dong bo bang useEffect: doi deal chi can xoa override,
  // khong phai mot vong render phu.
  const [captionOverride, setCaptionOverride] = useState<string | null>(null)
  // Giu ca url cung svg de biet QR dang hien co khop voi url hien tai hay khong —
  // nho vay effect khong phai setState dong bo de "xoa QR cu".
  const [qr, setQr] = useState<{ url: string; svg: string } | null>(null)
  const [toast, setToast] = useState('')
  const [angle, setAngle] = useState<CaptionAngle>('price')
  const [aiCaptions, setAiCaptions] = useState<GeneratedCaption[]>([])
  const [aiRejected, setAiRejected] = useState<string[]>([])
  const [aiError, setAiError] = useState('')
  const [aiPending, startAi] = useTransition()

  const campaign = parseCampaign(campaignRaw)
  const deal = deals.find(d => d.code === selectedCode) ?? null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return deals
    return deals.filter(d => d.title.toLowerCase().includes(q) || String(d.code).includes(q.replace(/^#/, '')))
  }, [deals, search])

  const url = deal ? shortLinkUrl(deal.code, deal.slug, style, campaign) : ''

  const generated = deal ? buildCaption(deal, { style, campaign }) : ''
  const caption = captionOverride ?? generated
  const captionEdited = captionOverride !== null

  // QR chi hien khi dung cho url hien tai; url vua doi thi coi nhu dang tao lai.
  const qrSvg = qr?.url === url ? qr.svg : ''

  // qrcode ~30KB, dynamic import de no thanh chunk rieng cua trang admin nay thay
  // vi vao bundle chung — cung cach da dung cho exceljs o /admin/import.
  useEffect(() => {
    if (!url) return
    let cancelled = false
    import('qrcode')
      .then(QR => QR.toString(url, {
        type: 'svg', width: QR_SIZE, margin: 1,
        // M: sua duoc ~15% loi. Du cho QR bi in de hoac quet cheo, ma khong lam
        // o vuong day dac den muc kho quet o kich thuoc nho tren story.
        errorCorrectionLevel: 'M',
        color: { dark: '#0F1929', light: '#FFFFFF' },
      }))
      .then(svg => { if (!cancelled) setQr({ url, svg }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [url])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const runAi = () => {
    if (!deal) return
    setAiError(''); setAiRejected([]); setAiCaptions([])
    startAi(async () => {
      const res = await generateCaptionsForDeal({
        code: deal.code, angle, count: 3, style, campaign,
      })
      if (!res.ok) { setAiError(res.error); return }
      setAiCaptions(res.captions)
      setAiRejected(res.rejected)
      if (res.captions.length === 0 && res.rejected.length === 0) setAiError('AI không trả về bản nào — thử lại hoặc đổi góc.')
    })
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast(`Đã copy ${label}`))
      .catch(() => showToast('Không copy được — hãy chọn và copy tay'))
  }

  const downloadQr = () => {
    if (!qrSvg || !deal) return
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `offerdy-qr-${deal.code}${campaign ? `-${campaign}` : ''}.svg`
    a.click()
    URL.revokeObjectURL(href)
  }

  const downloadQrPng = async () => {
    if (!deal) return
    try {
      const QR = await import('qrcode')
      // 1024px: du net de dat vao story/reel 1080x1920 ma khong bi ram khi phong to.
      const dataUrl = await QR.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'M' })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `offerdy-qr-${deal.code}${campaign ? `-${campaign}` : ''}.png`
      a.click()
    } catch {
      showToast('Không tạo được PNG — thử tải bản SVG')
    }
  }

  const label = { fontSize: 11, fontWeight: 700 as const, color: '#6B7694', letterSpacing: '.04em', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' }
  const card = { background: '#fff', border: '1px solid #E4EAF2', borderRadius: 12, padding: 18 }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Bộ soạn bài đăng</h1>
          <div className="oa-breadcrumb">Home / Social Kit</div>
        </div>
        <Link href="/admin/reports" className="oa-btn" style={{ textDecoration: 'none' }}>Xem báo cáo click →</Link>
      </div>

      {missingCode > 0 && (
        <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#92400E' }}>
          {missingCode} deal chưa có mã nên không hiện ở đây —{' '}
          <Link href="/admin/migrate/deal-codes" style={{ color: '#92400E', fontWeight: 700 }}>cấp mã ngay</Link>.
        </div>
      )}

      {deals.length === 0 ? (
        <div style={{ ...card, color: '#6B7694', fontSize: 14 }}>
          Chưa có deal nào có mã. Chạy <Link href="/admin/migrate/deal-codes" style={{ color: '#16A34A', fontWeight: 700 }}>/admin/migrate/deal-codes</Link> trước.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 260px', gap: 18, alignItems: 'start' }}>

          {/* ── Chọn sản phẩm ── */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 12, borderBottom: '1px solid #F1F5F9' }}>
              <input
                className="oa-search"
                style={{ width: '100%' }}
                placeholder="Tìm tên hoặc mã..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              {filtered.map(d => (
                <button
                  key={d.code}
                  onClick={() => { setSelectedCode(d.code); setCaptionOverride(null) }}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left',
                    padding: '9px 12px', background: d.code === selectedCode ? '#F0FDF4' : 'transparent',
                    borderBottom: '1px solid #F8FAFC', borderLeft: d.code === selectedCode ? '3px solid #16A34A' : '3px solid transparent',
                  }}
                >
                  <strong style={{ fontSize: 12, color: '#16A34A', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>#{d.code}</strong>
                  <span style={{ fontSize: 12, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                </button>
              ))}
              {filtered.length === 0 && <div style={{ padding: 14, fontSize: 13, color: '#9CA3AF' }}>Không tìm thấy</div>}
            </div>
          </div>

          {/* ── Caption ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <span style={label}>Link trong bài</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['deal', 'go'] as LinkStyle[]).map(s => (
                      <button
                        key={s}
                        onClick={() => { setStyle(s); setCaptionOverride(null) }}
                        title={s === 'deal'
                          ? '/d/<mã> — vào trang sản phẩm trên Offerdy (có mô tả, pros/cons, FAQ). Đo được cả lượt xem và lượt bấm sang merchant.'
                          : '/g/<mã> — đi THẲNG ra merchant, bỏ qua trang sản phẩm. Ít bước hơn nên chuyển đổi cao hơn, nhưng khách không đọc được nội dung của mình.'}
                        style={{
                          flex: 1, minHeight: 36, borderRadius: 8, fontSize: 12, fontWeight: 700,
                          border: `1.5px solid ${style === s ? '#16A34A' : '#E4EAF2'}`,
                          background: style === s ? '#F0FDF4' : '#fff',
                          color: style === s ? '#16A34A' : '#6B7694',
                        }}
                      >
                        {s === 'deal' ? '/d/ trang sản phẩm' : '/g/ thẳng merchant'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <span style={label}>Nhãn bài đăng (?s=)</span>
                  <input
                    className="oa-input"
                    style={{ width: '100%' }}
                    placeholder="vd: reel-jul25"
                    value={campaignRaw}
                    onChange={e => { setCampaignRaw(e.target.value); setCaptionOverride(null) }}
                  />
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    {campaign
                      ? <>Sẽ lưu là <strong>{campaign}</strong> — tách số liệu riêng cho bài này</>
                      : 'Để trống cũng được. Điền để biết bài nào ra click.'}
                  </div>
                </div>
              </div>

              {/* ── Viết bằng AI ────────────────────────────────
                  AI chi viet CHU; gia, % giam va link do code dien vao sau khi da
                  qua kiem tra an toan (xem src/lib/ai/generateCaption.ts). */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E4EAF2', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <span style={label}>Viết bằng AI — chọn góc</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {CAPTION_ANGLES.map(a => (
                        <button
                          key={a.id}
                          onClick={() => setAngle(a.id)}
                          title={a.hint}
                          style={{
                            minHeight: 32, padding: '0 11px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                            border: `1.5px solid ${angle === a.id ? '#16A34A' : '#E4EAF2'}`,
                            background: angle === a.id ? '#F0FDF4' : '#fff',
                            color: angle === a.id ? '#16A34A' : '#6B7694',
                          }}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="oa-btn oa-btn-green" onClick={runAi} disabled={aiPending || !deal} style={{ flexShrink: 0 }}>
                    {aiPending ? 'Đang viết…' : '✨ Viết 3 bản'}
                  </button>
                </div>

                {aiError && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#B91C1C' }}>
                    {aiError}
                  </div>
                )}

                {aiRejected.length > 0 && (
                  // Hien ra thay vi giau: neu AI lien tuc bi loai thi persona hoac
                  // goc dang co van de, va nguoi dung can biet dieu do.
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 11.5, color: '#92400E', lineHeight: 1.6 }}>
                    Đã loại {aiRejected.length} bản vì {aiRejected.join('; ')}. Số liệu chỉ được lấy từ dữ liệu thật, AI không được tự viết.
                  </div>
                )}

                {aiCaptions.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {aiCaptions.map((c, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #E4EAF2', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 12.5, color: '#1E293B', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{c.text}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button className="oa-btn oa-btn-green" style={{ minHeight: 30, fontSize: 11.5 }} onClick={() => setCaptionOverride(c.text)}>
                            Dùng bản này
                          </button>
                          <button
                            className="oa-btn"
                            style={{ minHeight: 30, fontSize: 11.5 }}
                            title="Đặt nhãn riêng cho bản này để báo cáo tách được góc nào ra click"
                            onClick={() => { setCampaignRaw(c.suggestedTag); setCaptionOverride(c.text) }}
                          >
                            Dùng + gắn nhãn <code>{c.suggestedTag}</code>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
                      Đăng cả 3 với 3 nhãn khác nhau rồi xem <strong>Báo cáo Click</strong> — sau vài bài là biết góc nào thật sự ra click, không phải đoán.
                    </div>
                  </div>
                )}
              </div>

              <span style={label}>Caption — sửa thoải mái trước khi đăng</span>
              <textarea
                value={caption}
                onChange={e => { setCaptionOverride(e.target.value) }}
                rows={12}
                style={{ width: '100%', padding: 12, border: '1.5px solid #E4EAF2', borderRadius: 10, fontSize: 13, lineHeight: 1.7, fontFamily: 'inherit', resize: 'vertical', color: '#1E293B' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="oa-btn oa-btn-green" onClick={() => copy(caption, 'caption')}>Copy caption</button>
                <button className="oa-btn" onClick={() => copy(url, 'link')}>Copy link</button>
                {captionEdited && (
                  <button className="oa-btn" onClick={() => { setCaptionOverride(null) }}>
                    Soạn lại từ đầu
                  </button>
                )}
                <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{caption.length} ký tự</span>
              </div>
            </div>

            {deal && (
              <div style={{ ...card, display: 'flex', gap: 16, alignItems: 'center' }}>
                {deal.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- thumbnail admin, khong can toi uu
                  <img src={deal.imageUrl} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7694', marginTop: 3 }}>
                    {deal.priceSale}{deal.priceOrig ? ` · was ${deal.priceOrig}` : ''}
                    {deal.categoryName ? ` · ${deal.categoryName}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                    Đã có <strong>{deal.shortLinkClicks}</strong> lượt mở short link → <strong>{deal.dealClicks}</strong> bấm sang merchant
                  </div>
                </div>
                <a href={`/deals/${deal.slug}`} target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ textDecoration: 'none', flexShrink: 0 }}>Xem trang</a>
              </div>
            )}
          </div>

          {/* ── QR ── */}
          <div style={{ ...card, textAlign: 'center' }}>
            <span style={{ ...label, textAlign: 'left' }}>QR code</span>
            {qrSvg ? (
              <div
                // SVG do chinh qrcode sinh ra tu URL cua minh — khong phai input nguoi ngoai
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                style={{ width: QR_SIZE, height: QR_SIZE, margin: '0 auto 10px', borderRadius: 8, overflow: 'hidden', border: '1px solid #F1F5F9' }}
              />
            ) : (
              <div style={{ width: QR_SIZE, height: QR_SIZE, margin: '0 auto 10px', background: '#F6F8FB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#9CA3AF' }}>
                Đang tạo…
              </div>
            )}
            <div style={{ fontSize: 11, color: '#6B7694', wordBreak: 'break-all', marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>
              {url.replace('https://www.', '')}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="oa-btn" onClick={downloadQr} disabled={!qrSvg}>Tải SVG</button>
              <button className="oa-btn" onClick={downloadQrPng}>Tải PNG</button>
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6, marginTop: 12, textAlign: 'left' }}>
              Dán vào ảnh/video, story, hoặc in ra. Người xem quét là vào đúng sản phẩm —
              không phải gõ mã. QR đổi theo cả nhãn <code>?s=</code> nên vẫn tách được số liệu.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
