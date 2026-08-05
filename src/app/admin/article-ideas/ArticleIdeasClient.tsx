'use client'

import { useState } from 'react'
import { scanStoreIdeas, scanPastedUrls, type IdeaScanResult } from './actions'
import type { StoreRow } from './page'

/** Mau nao ung mau nay — de nhin luot la phan biet duoc loai bai. */
const TEMPLATE_COLOR: Record<string, string> = {
  'best-in-store': '#0891b2',
  'line-compared': '#7c3aed',
  versus: '#db2777',
  'best-for': '#ea580c',
  review: '#16a34a',
  'best-cross-brand': '#64748b',
}

function slugOf(url: string): string {
  return url.split('?')[0].replace(/\/+$/, '').split('/').filter(Boolean).pop() ?? url
}

export default function ArticleIdeasClient({ stores }: { stores: StoreRow[] }) {
  const [scan, setScan] = useState<IdeaScanResult | null>(null)
  const [scanning, setScanning] = useState<string | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const [showPaste, setShowPaste] = useState(false)

  const run = async (store: StoreRow) => {
    setScanning(store.id)
    setStoreId(store.id)
    setScan(null)
    setShowPaste(false)
    setScan(await scanStoreIdeas(store.id))
    setScanning(null)
  }

  const runPaste = async () => {
    if (!storeId) return
    setScanning(storeId)
    setScan(null)
    setScan(await scanPastedUrls(storeId, pasted))
    setScanning(null)
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Ý tưởng bài viết từ danh mục shop</h1>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.6 }}>
        Quét danh mục sản phẩm công khai của một shop, rồi hỏi: <b>với dữ liệu này, bài nào viết được mà không phải bịa?</b>{' '}
        Trang này <b>chỉ đọc</b> — chưa gọi AI, chưa ghi gì vào Sanity.
      </p>
      <p style={{ fontSize: 12, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '9px 12px', margin: '12px 0 0', lineHeight: 1.6 }}>
        Tiêu đề dưới đây <b>suy từ tên sản phẩm nên còn xấu</b>. Đó là chủ đích: việc của trang này là chứng minh cổng kiểm
        mở/đóng đúng chỗ. Bước đặt tên tử tế là chặng sau.
      </p>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginTop: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '9px 12px', textAlign: 'left', color: '#475569' }}>Store</th>
              <th style={{ padding: '9px 12px', textAlign: 'left', color: '#475569' }}>Website</th>
              <th style={{ padding: '9px 12px', textAlign: 'center', color: '#475569', whiteSpace: 'nowrap' }}>Đã có bài</th>
              <th style={{ padding: '9px 12px' }} />
            </tr>
          </thead>
          <tbody>
            {stores.map(store => (
              <tr key={store.id} style={{ borderTop: '1px solid #e2e8f0', background: storeId === store.id ? '#f8fafc' : undefined }}>
                <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{store.name}</td>
                <td style={{ padding: '9px 12px', color: '#64748b' }}>
                  <a href={store.website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                    {store.website?.replace(/^https?:\/\//, '')}
                  </a>
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center', color: store.posts ? '#16a34a' : '#cbd5e1', fontWeight: 600 }}>
                  {store.posts}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                  <button
                    className="oa-btn"
                    disabled={scanning !== null}
                    onClick={() => run(store)}
                    style={{ padding: '5px 12px', fontSize: 12 }}
                  >
                    {scanning === store.id ? 'Đang quét…' : 'Quét'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {scan && !scan.ok && (
        <div style={{ marginTop: 20, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
          <b>{scan.storeName}</b>: {scan.error}
          <div style={{ marginTop: 10 }}>
            <button className="oa-btn" style={{ padding: '4px 11px', fontSize: 12 }} onClick={() => setShowPaste(v => !v)}>
              {showPaste ? 'Ẩn ô dán tay' : 'Dán tay danh sách URL sản phẩm'}
            </button>
          </div>
        </div>
      )}

      {(showPaste || (scan?.ok && scan.source === 'manual')) && storeId && (
        <div style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Dán URL sản phẩm — mỗi dòng một link</div>
          <div style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 8px', lineHeight: 1.6 }}>
            Dùng khi shop không mở <code>/products.json</code> lẫn product sitemap. Tên sản phẩm được suy từ đường dẫn,
            đúng y cách đường quét tự động làm.
          </div>
          <textarea
            value={pasted}
            onChange={e => setPasted(e.target.value)}
            rows={6}
            placeholder={'https://shop.com/products/abc\nhttps://shop.com/products/xyz'}
            style={{ width: '100%', fontSize: 12, fontFamily: 'ui-monospace, monospace', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, resize: 'vertical' }}
          />
          <button
            className="oa-btn oa-btn-primary"
            onClick={runPaste}
            disabled={scanning !== null || !pasted.trim()}
            style={{ marginTop: 8, opacity: pasted.trim() ? 1 : 0.4 }}
          >
            {scanning ? 'Đang xử lý…' : 'Chạy cổng kiểm'}
          </button>
        </div>
      )}

      {scan?.ok && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#475569' }}>
            <div><b style={{ color: '#0f172a' }}>{scan.storeName}</b></div>
            <div>
              nguồn: <b>{scan.source === 'shopify' ? 'products.json' : scan.source === 'sitemap' ? 'sitemap' : 'dán tay'}</b>
            </div>
            <div>
              <b style={{ color: '#0f172a' }}>{scan.productCount}</b> sản phẩm
              {scan.variantsMerged > 0 && (
                <span style={{ color: '#94a3b8' }}>
                  {' '}(từ {scan.catalogRows} dòng — gộp {scan.variantsMerged} biến thể màu/kích cỡ)
                </span>
              )}
            </div>
            <div>
              <b style={{ color: scan.offered.length ? '#16a34a' : '#94a3b8' }}>{scan.offered.length}</b> ý tưởng
            </div>
          </div>

          {scan.offered.length === 0 && (
            <div style={{ marginTop: 16, fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
              Danh mục này không nuôi được bài nào. Đó là một câu trả lời hợp lệ — lý do từng mẫu nằm ngay bên dưới.
            </div>
          )}

          {scan.offered.map(idea => (
            <div key={idea.key} style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#fff', background: TEMPLATE_COLOR[idea.template] ?? '#64748b', padding: '2px 8px', borderRadius: 20 }}>
                {idea.label}
              </span>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>{idea.workingTitle}</div>
              <div style={{ fontSize: 12, color: '#16a34a' }}>{idea.why}</div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                  {idea.products.length} sản phẩm nguồn
                </summary>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                  {idea.products.map(p => (
                    <li key={p.url}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{slugOf(p.url)}</a>
                      <span style={{ color: '#94a3b8' }}> — {p.title}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}

          {scan.rejected.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                {scan.rejected.length} mẫu bị từ chối
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 10px', lineHeight: 1.6 }}>
                Hiện ra chứ không im lặng: một danh sách trống không nói được đâu là &ldquo;shop này không hợp&rdquo;, đâu là &ldquo;tính năng hỏng&rdquo;.
              </div>
              {scan.rejected.map(r => (
                <div key={r.template} style={{ marginTop: 8, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.6 }}>{r.reason}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, lineHeight: 1.6 }}>→ {r.needed}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
