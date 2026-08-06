'use client'

import { useState, useTransition } from 'react'
import { scanStoreCatalog, saveProductUrls, clearProductUrl, type OfferSuggestion, type ExistingLink } from './actions'
import type { StoreRow } from './page'

type ScanState = {
  storeId: string
  source: 'shopify' | 'sitemap'
  productCount: number
  offers: OfferSuggestion[]
  existing: ExistingLink[]
}

/**
 * Diem tu dong chon san goi y tot nhat.
 *
 * ⚠️ 0.99 nghia la KHOP TUYET DOI, khong phai "rat giong". Duoi muc do de trong va bat
 * nguoi van hanh tu nhin: mot goi y sai duoc luu am tham se dan khach tra tien toi nham
 * san pham — dung su co offer "PD1200 … Save $219" bi goi y `/products/fcr100`, mot loi
 * loc thay the.
 */
const AUTO_PICK = 0.99

function scoreColor(score: number) {
  if (score >= 0.99) return '#16a34a'
  if (score >= 0.75) return '#65a30d'
  return '#d97706'
}

export default function DeepLinksClient({
  stores,
  linkableOffers,
  doneOffers,
  storeWideOffers,
}: {
  stores: StoreRow[]
  linkableOffers: number
  doneOffers: number
  storeWideOffers: number
}) {
  const [scans, setScans] = useState<ScanState[]>([])
  const [scanning, setScanning] = useState<string | null>(null)
  /** Quet ca loat: shop dang quet la thu may / tong bao nhieu. */
  const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null)
  const [failures, setFailures] = useState<{ name: string; error: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  // offerId -> URL da chon (chuoi rong = bo qua offer nay)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  /** Chon san goi y tot nhat CHI khi khop tuyet doi — xem `AUTO_PICK`. */
  const autoPick = (offers: OfferSuggestion[]) => {
    const initial: Record<string, string> = {}
    for (const offer of offers) {
      const best = offer.suggestions[0]
      if (best && best.score >= AUTO_PICK) initial[offer.offerId] = best.url
    }
    return initial
  }

  const runScan = async (store: StoreRow) => {
    setScanning(store.id)
    setError(null)
    setScans([])
    setFailures([])
    setPicked({})
    const result = await scanStoreCatalog(store.id)
    setScanning(null)
    if (!result.ok) {
      setError(`${store.name}: ${result.error}`)
      return
    }
    setScans([{
      storeId: store.id,
      source: result.source,
      productCount: result.productCount,
      offers: result.offers,
      existing: result.existing,
    }])
    setPicked(autoPick(result.offers))
  }

  /**
   * Quet MOI shop con thieu link, gom vao mot bang de duyet mot luot.
   *
   * ⚠️ **Tuan tu, MOI SHOP MOT REQUEST — co y khong gom ca loat vao mot server action.**
   * `ai-content-nightly` da day du an bai nay: gom nhieu luot goi mang vao mot function
   * thi het gio la function bi giet giua chung va **mat sach**. Moi shop mot request thi
   * shop nao xong la chac shop do, va dong bo dem tien do noi ro dang o dau.
   *
   * Tuan tu chu khong song song: 79 luot cao cung luc vao 79 shop la cach nhanh nhat de
   * bi chan IP.
   */
  const runAll = async () => {
    const todo = stores.filter(s => s.website && s.withProductUrl < s.linkable)
    if (!todo.length) return
    setError(null)
    setScans([])
    setFailures([])
    setPicked({})

    const collected: ScanState[] = []
    const failed: { name: string; error: string }[] = []
    for (const [i, store] of todo.entries()) {
      setProgress({ done: i, total: todo.length, name: store.name })
      const result = await scanStoreCatalog(store.id)
      if (!result.ok) {
        failed.push({ name: store.name, error: result.error })
        setFailures([...failed])
        continue
      }
      // Shop khong con offer nao thieu thi khong dung khoi — khong de lai khung khong.
      if (result.offers.length === 0) continue
      collected.push({
        storeId: store.id,
        source: result.source,
        productCount: result.productCount,
        offers: result.offers,
        existing: result.existing,
      })
      // Do dan chu khong doi den cuoi: mot lan quet 79 shop keo dai vai phut, va mot
      // man hinh khong nhuc nhich trong vai phut trong y het mot trang treo.
      setScans([...collected])
      setPicked(p => ({ ...p, ...autoPick(result.offers) }))
    }
    setProgress(null)
  }

  const save = () => {
    const entries = Object.entries(picked)
      .filter(([, url]) => url.trim())
      .map(([offerId, productUrl]) => ({ offerId, productUrl }))
    if (!entries.length) return
    startTransition(async () => {
      const result = await saveProductUrls(entries)
      setToast(
        `Đã lưu ${result.saved} link` +
        (result.errors.length ? ` · ${result.errors.length} cảnh báo: ${result.errors[0]}` : '')
      )
      setScans([])
      setPicked({})
    })
  }

  const pickedCount = Object.values(picked).filter(u => u.trim()).length
  const scannedOffers = scans.reduce((n, s) => n + s.offers.length, 0)
  const storeWideCount = scans.reduce((n, s) => n + s.offers.filter(o => o.storeWide).length, 0)

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Link sản phẩm cho Offer</h1>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
        Quét danh mục sản phẩm công khai của từng shop rồi gợi ý link cho mỗi offer. Mã ref được gắn tự động khi hiển thị — không cần dán vào đây.
      </p>

      <div style={{ margin: '18px 0', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <div style={{ fontSize: 13, color: '#475569' }}>
          <b style={{ color: '#0f172a', fontSize: 18 }}>{doneOffers}</b> / {linkableOffers} offer <b>trỏ được sản phẩm</b> đã có link
        </div>
        {storeWideOffers > 0 && (
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {storeWideOffers} offer nữa là ưu đãi áp cho cả shop (&ldquo;20% Off On Your Order&rdquo;, &ldquo;Free shipping on All orders&rdquo;) —
            không có sản phẩm cụ thể để trỏ tới, nên không tính vào mẫu số. Đích ở đây là {linkableOffers}, không phải {linkableOffers + storeWideOffers}.
          </div>
        )}
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
          <div style={{
            width: `${linkableOffers ? (doneOffers / linkableOffers) * 100 : 0}%`,
            height: '100%', background: '#16a34a',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '0 0 16px' }}>
        <button
          className="oa-btn oa-btn-primary"
          onClick={runAll}
          disabled={progress !== null || scanning !== null || pending}
        >
          {progress ? `Đang quét ${progress.done + 1}/${progress.total}…` : 'Quét tất cả shop còn thiếu'}
        </button>
        {progress && (
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {progress.name} · tuần tự, mỗi shop một request — đừng đóng tab
          </span>
        )}
        {!progress && scans.length > 0 && (
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {scans.length} shop · {scannedOffers} offer chưa có link · đã chọn sẵn {pickedCount} link khớp tuyệt đối
          </span>
        )}
      </div>

      {failures.length > 0 && (
        <div style={{ margin: '0 0 16px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          <b>{failures.length} shop không quét được</b> (danh mục không đọc được — dán tay link ở `/admin/offers`):{' '}
          {failures.map(f => f.name).join(' · ')}
        </div>
      )}

      {toast && (
        <div style={{ margin: '0 0 16px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#166534' }}>
          {toast}
        </div>
      )}
      {error && (
        <div style={{ margin: '0 0 16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '9px 12px', textAlign: 'left', color: '#475569' }}>Store</th>
              <th style={{ padding: '9px 12px', textAlign: 'left', color: '#475569' }}>Website</th>
              <th style={{ padding: '9px 12px', textAlign: 'center', color: '#475569', whiteSpace: 'nowrap' }}>Có link</th>
              <th style={{ padding: '9px 12px' }} />
            </tr>
          </thead>
          <tbody>
            {stores.map(store => {
              const complete = store.withProductUrl >= store.linkable
              return (
                <tr key={store.id} style={{ borderTop: '1px solid #e2e8f0', background: complete ? '#f0fdf4' : undefined }}>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{store.name}</td>
                  <td style={{ padding: '9px 12px', color: '#64748b' }}>
                    {store.website
                      ? <a href={store.website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{store.website.replace(/^https?:\/\//, '')}</a>
                      : <span style={{ color: '#cbd5e1' }}>— chưa có website</span>}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: complete ? '#16a34a' : '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {store.withProductUrl}/{store.linkable}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <button
                      className="oa-btn"
                      disabled={!store.website || scanning !== null}
                      onClick={() => runScan(store)}
                      style={{ padding: '5px 12px', fontSize: 12, cursor: store.website ? 'pointer' : 'not-allowed', opacity: store.website ? 1 : 0.4 }}
                    >
                      {scanning === store.id ? 'Đang quét…' : complete ? 'Quét lại' : 'Quét'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {scans.length > 0 && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 5, marginTop: 24, padding: '12px 16px',
          background: '#0f172a', borderRadius: 10, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ fontSize: 13, color: '#e2e8f0' }}>
            {scans.length} shop · <b>{pickedCount}</b> link sẽ lưu
            {storeWideCount > 0 && (
              <span style={{ color: '#94a3b8' }}> · {storeWideCount} offer nói về cả shop (không gợi ý được, bỏ qua là đúng)</span>
            )}
          </div>
          <button
            className="oa-btn oa-btn-primary"
            onClick={save}
            disabled={pending || pickedCount === 0}
            style={{ opacity: pickedCount === 0 ? 0.4 : 1 }}
          >
            {pending ? 'Đang lưu…' : `Lưu ${pickedCount} link`}
          </button>
        </div>
      )}

      {scans.map(scan => {
        const currentStore = stores.find(s => s.id === scan.storeId)
        return (
        <div key={scan.storeId} style={{ marginTop: 18, border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{currentStore?.name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Đọc được {scan.productCount} sản phẩm qua {scan.source === 'shopify' ? 'products.json' : 'sitemap'} · {scan.offers.length} offer chưa có link
            </div>
          </div>

          {scan.existing.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Đã có link ({scan.existing.length})
              </div>
              {scan.existing.map(link => (
                <div key={link.offerId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 6 }}>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <span style={{ color: '#0f172a' }}>{link.offerTitle}</span><br />
                    <a href={link.productUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', wordBreak: 'break-all' }}>{link.productUrl}</a>
                  </div>
                  <button
                    className="oa-btn"
                    style={{ padding: '3px 10px', fontSize: 11, color: '#991b1b' }}
                    onClick={() => {
                      startTransition(async () => {
                        const r = await clearProductUrl(link.offerId)
                        setToast(r.ok ? 'Đã gỡ link sản phẩm' : `Gỡ thất bại: ${r.error}`)
                        if (r.ok) {
                          setScans(list => list.map(s => s.storeId === scan.storeId
                            ? { ...s, existing: s.existing.filter(e => e.offerId !== link.offerId) }
                            : s))
                        }
                      })
                    }}
                  >
                    Gỡ
                  </button>
                </div>
              ))}
            </div>
          )}

          {scan.offers.map(offer => (
            <div key={offer.offerId} style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{offer.offerTitle}</div>

              {offer.storeWide ? (
                <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                  Ưu đãi áp dụng cho cả shop — không có sản phẩm cụ thể để trỏ tới. Bỏ qua là đúng.
                </div>
              ) : (
                <>
                  {offer.suggestions.length === 0 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#d97706' }}>
                      Không tìm thấy sản phẩm khớp — dán tay bên dưới nếu bạn biết link.
                    </div>
                  )}
                  {offer.suggestions.map(s => (
                    <label key={s.url} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 6, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={offer.offerId}
                        checked={picked[offer.offerId] === s.url}
                        onChange={() => setPicked(p => ({ ...p, [offer.offerId]: s.url }))}
                        style={{ marginTop: 3 }}
                      />
                      <span style={{ fontSize: 12 }}>
                        <span style={{ color: scoreColor(s.score), fontWeight: 700 }}>{(s.score * 100).toFixed(0)}%</span>
                        {' '}<span style={{ color: '#0f172a' }}>{s.title}</span>
                        <br />
                        <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', wordBreak: 'break-all' }}>{s.url}</a>
                      </span>
                    </label>
                  ))}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={offer.offerId}
                        checked={!picked[offer.offerId]}
                        onChange={() => setPicked(p => ({ ...p, [offer.offerId]: '' }))}
                      />
                      <span style={{ fontSize: 12, color: '#64748b' }}>Bỏ qua</span>
                    </label>
                    <input
                      className="oa-input"
                      placeholder="…hoặc dán URL sản phẩm (không cần ?ref=)"
                      value={picked[offer.offerId] && !offer.suggestions.some(s => s.url === picked[offer.offerId]) ? picked[offer.offerId] : ''}
                      onChange={e => setPicked(p => ({ ...p, [offer.offerId]: e.target.value }))}
                      style={{ flex: 1, fontSize: 12, padding: '5px 9px' }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        )
      })}
    </div>
  )
}
