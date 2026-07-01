'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'

type SheetType = 'Stores' | 'Posts' | 'Reviews'
type Row = Record<string, string | number | boolean | null>
type ImportResult = { imported: number; errors: { row: number; message: string }[] }

const SHEET_INFO: Record<SheetType, { icon: string; label: string; desc: string }> = {
  Stores: { icon: '🏪', label: 'Stores & Offers', desc: 'Mỗi dòng = 1 offer. Cùng tên store → tự gộp chung.' },
  Posts: { icon: '📝', label: 'Posts', desc: 'Bài viết blog.' },
  Reviews: { icon: '⭐', label: 'Reviews', desc: 'Đánh giá store/sản phẩm.' },
}

// Columns for each sheet type
const SHEET_COLS: Record<SheetType, { key: string; label: string; required?: boolean; note?: string }[]> = {
  Stores: [
    { key: 'name', label: 'name', required: true, note: 'Tên store' },
    { key: 'affiliateLink', label: 'affiliateLink', required: true, note: 'Link affiliate — dùng cho cả store lẫn offer' },
    { key: 'offerText', label: 'offerText', note: 'Mô tả ngắn của offer (bỏ trống = chỉ tạo store)' },
    { key: 'couponCode', label: 'couponCode', note: 'Mã giảm giá (nếu có)' },
    { key: 'title', label: 'title', note: 'Tiêu đề offer (tự động nếu bỏ trống)' },
    { key: 'category', label: 'category', note: 'electronics|fashion|beauty|home|sports|food|travel|books|gaming|general' },
    { key: 'abbr', label: 'abbr', note: 'Viết tắt, tối đa 3 ký tự' },
    { key: 'maxOffer', label: 'maxOffer', note: 'Giảm tối đa (%), VD: 70' },
    { key: 'website', label: 'website', note: 'Website chính thức' },
    { key: 'shortDescription', label: 'shortDescription', note: 'Tagline ngắn' },
    { key: 'expiresAt', label: 'expiresAt', note: 'Ngày hết hạn offer, VD: 2026-12-31' },
    { key: 'order', label: 'order', note: 'Ưu tiên hiển thị (số lớn = lên trên)' },
    { key: 'active', label: 'active', note: 'true/false (mặc định true)' },
    { key: 'verified', label: 'verified', note: 'true/false (mặc định true)' },
  ],
  Posts: [
    { key: 'title', label: 'title', required: true },
    { key: 'excerpt', label: 'excerpt' },
    { key: 'category', label: 'category', note: 'Tips & Guides|Comparison|Store Guide|Deals Roundup|News' },
    { key: 'author', label: 'author' },
    { key: 'publishedAt', label: 'publishedAt', note: 'VD: 2026-07-01' },
    { key: 'coverEmoji', label: 'coverEmoji' },
    { key: 'coverBg', label: 'coverBg', note: 'CSS gradient' },
    { key: 'readTime', label: 'readTime', note: 'Phút đọc' },
    { key: 'content', label: 'content', note: 'HTML' },
    { key: 'externalImageUrl', label: 'externalImageUrl' },
  ],
  Reviews: [
    { key: 'title', label: 'title', required: true },
    { key: 'excerpt', label: 'excerpt', required: true },
    { key: 'stars', label: 'stars', required: true, note: '1–5' },
    { key: 'tag', label: 'tag', note: 'Review hoặc Comparison' },
    { key: 'emoji', label: 'emoji' },
    { key: 'publishedAt', label: 'publishedAt', note: 'VD: 2026-07-01' },
    { key: 'imgBg', label: 'imgBg', note: 'CSS gradient' },
    { key: 'content', label: 'content', note: 'HTML' },
    { key: 'externalImageUrl', label: 'externalImageUrl' },
  ],
}

const PREVIEW_COLS: Record<SheetType, string[]> = {
  Stores: ['name', 'affiliateLink', 'offerText', 'couponCode', 'category'],
  Posts: ['title', 'category', 'author', 'publishedAt', 'excerpt'],
  Reviews: ['title', 'stars', 'tag', 'publishedAt', 'excerpt'],
}

function generateTemplate(type: SheetType) {
  const cols = SHEET_COLS[type]
  const headers = cols.map((c) => c.key)
  let exampleRows: Row[] = []

  if (type === 'Stores') {
    exampleRows = [
      {
        name: 'Amazon', affiliateLink: 'https://amzn.to/xxx',
        offerText: 'Giam 20% toan bo don hang', couponCode: 'SAVE20',
        title: 'Giam 20% khi nhap ma SAVE20',
        category: 'general', abbr: 'AMZ', maxOffer: 70,
        website: 'https://amazon.com', shortDescription: 'Mua sam online',
        expiresAt: '2026-12-31', order: 0, active: 'true', verified: 'true',
      },
      {
        name: 'Amazon', affiliateLink: 'https://amzn.to/xxx',
        offerText: 'Mien phi ship don tu 300k', couponCode: '',
        title: 'Free ship don tu 300k',
        category: '', abbr: '', maxOffer: '',
        website: '', shortDescription: '',
        expiresAt: '', order: 0, active: 'true', verified: 'true',
      },
      {
        name: 'Shopee', affiliateLink: 'https://s.shopee.vn/xxx',
        offerText: 'Giam 50k don dau', couponCode: 'NEWUSER',
        title: 'Giam 50k cho khach hang moi',
        category: 'general', abbr: 'SPE', maxOffer: 50,
        website: 'https://shopee.vn', shortDescription: 'San TMDT hang dau Dong Nam A',
        expiresAt: '2026-09-30', order: 0, active: 'true', verified: 'true',
      },
    ]
  } else if (type === 'Posts') {
    exampleRows = [{
      title: 'Top 10 deal tot nhat thang 7',
      excerpt: 'Tong hop nhung deal hot nhat thang nay',
      category: 'Deals Roundup', author: 'Offerdy Team',
      publishedAt: '2026-07-01', coverEmoji: '🔥',
      coverBg: 'linear-gradient(135deg,#667eea,#764ba2)',
      readTime: 5, content: '', externalImageUrl: '',
    }]
  } else if (type === 'Reviews') {
    exampleRows = [{
      title: 'Danh gia Amazon 2026',
      excerpt: 'Amazon la san TMDT lon nhat the gioi',
      stars: 4, tag: 'Review', emoji: '⭐',
      publishedAt: '2026-07-01',
      imgBg: 'linear-gradient(135deg,#f093fb,#f5576c)',
      content: '', externalImageUrl: '',
    }]
  }

  const ws = XLSX.utils.json_to_sheet(exampleRows, { header: headers })

  // Auto column width
  const colWidths = headers.map((h) => ({ wch: Math.max(h.length, 18) }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, type)
  XLSX.writeFile(wb, `template_${type.toLowerCase()}.xlsx`)
}

function generateFullTemplate() {
  const wb = XLSX.utils.book_new()
  const types: SheetType[] = ['Stores', 'Posts', 'Reviews']
  for (const type of types) {
    const cols = SHEET_COLS[type]
    const headers = cols.map((c) => c.key)
    const ws = XLSX.utils.json_to_sheet([], { header: headers })
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length, 18) }))
    XLSX.utils.book_append_sheet(wb, ws, type)
  }
  XLSX.writeFile(wb, 'offerdy_import_template.xlsx')
}

export default function ImportClient() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [sheets, setSheets] = useState<Partial<Record<SheetType, Row[]>>>({})
  const [activeTab, setActiveTab] = useState<SheetType | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Partial<Record<SheetType, ImportResult>>>({})
  const [importedTabs, setImportedTabs] = useState<Set<SheetType>>(new Set())

  const validSheets: SheetType[] = ['Stores', 'Posts', 'Reviews']

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setSheets({})
    setActiveTab(null)
    setResults({})
    setImportedTabs(new Set())

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      if (!data) return
      const wb = XLSX.read(data, { type: 'array' })
      const parsed: Partial<Record<SheetType, Row[]>> = {}
      let firstSheet: SheetType | null = null

      for (const sheetName of wb.SheetNames) {
        if (!validSheets.includes(sheetName as SheetType)) continue
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' })
        if (rows.length > 0) {
          parsed[sheetName as SheetType] = rows
          if (!firstSheet) firstSheet = sheetName as SheetType
        }
      }

      setSheets(parsed)
      setActiveTab(firstSheet)
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport(type: SheetType) {
    const rows = sheets[type]
    if (!rows || rows.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type.toLowerCase(), rows }),
      })
      const result: ImportResult = await res.json()
      setResults((prev) => ({ ...prev, [type]: result }))
      setImportedTabs((prev) => new Set([...prev, type]))
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [type]: { imported: 0, errors: [{ row: 0, message: String(err) }] },
      }))
    } finally {
      setLoading(false)
    }
  }

  const currentRows = activeTab ? sheets[activeTab] ?? [] : []
  const previewCols = activeTab ? PREVIEW_COLS[activeTab] : []
  const currentResult = activeTab ? results[activeTab] : undefined

  return (
    <div className="oa-wrap">
      <div className="oa-header">
        <div>
          <h1 className="oa-title">Import Excel</h1>
          <div className="oa-breadcrumb">Home / Import</div>
        </div>
      </div>

      {/* Upload + Template + Column guide */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20, marginBottom: 20 }}>

        {/* Left: Upload */}
        <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f1929', marginBottom: 12 }}>1. Upload file Excel</div>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed #cbd5e1', borderRadius: 10, padding: '28px 20px',
              textAlign: 'center', cursor: 'pointer', background: '#f8fafc', transition: 'border-color .2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#22c55e')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 14, color: '#475569' }}>
              {fileName
                ? <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ {fileName}</span>
                : 'Click để chọn file .xlsx'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              Sheet hợp lệ: <b>Stores</b>, <b>Posts</b>, <b>Reviews</b>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />

          {/* Column guide */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f1929', marginBottom: 10 }}>📌 Cấu trúc cột</div>
            {validSheets.map((t) => {
              const required = SHEET_COLS[t].filter((c) => c.required)
              const optional = SHEET_COLS[t].filter((c) => !c.required)
              return (
                <div key={t} style={{ marginBottom: 12, background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {SHEET_INFO[t].icon} Sheet <b>{t}</b>
                    <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>{SHEET_INFO[t].desc}</span>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>Bắt buộc: </span>
                    {required.map((c) => (
                      <span key={c.key} style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 4, padding: '1px 6px', marginRight: 4, fontFamily: 'monospace' }}>{c.key}</span>
                    ))}
                  </div>
                  <div style={{ color: '#64748b' }}>
                    <span style={{ fontWeight: 600 }}>Tùy chọn: </span>
                    {optional.map((c) => (
                      <span key={c.key} title={c.note} style={{ background: '#f1f5f9', borderRadius: 4, padding: '1px 6px', marginRight: 4, fontFamily: 'monospace', cursor: 'help' }}>{c.key}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Download template */}
        <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f1929', marginBottom: 12 }}>2. Tải template</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={generateFullTemplate}
              style={{ background: '#0f1929', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
            >
              📋 Template đầy đủ (3 sheets)
            </button>
            {validSheets.map((t) => (
              <button
                key={t}
                onClick={() => generateTemplate(t)}
                style={{ background: '#f1f5f9', color: '#0f1929', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
              >
                {SHEET_INFO[t].icon} Template {SHEET_INFO[t].label}
              </button>
            ))}
          </div>

          {/* Note */}
          <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#92400e' }}>
            <b>Sheet Stores:</b> Nhiều dòng cùng <code>name</code> → tự gộp vào 1 store, mỗi dòng tạo 1 offer riêng.
          </div>
        </div>
      </div>

      {/* Preview & Import */}
      {Object.keys(sheets).length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #e4eaf2', background: '#f8fafc' }}>
            {validSheets
              .filter((t) => sheets[t] && (sheets[t]?.length ?? 0) > 0)
              .map((t) => {
                const result = results[t]
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    style={{
                      padding: '12px 20px', fontSize: 13, fontWeight: 600,
                      border: 'none', background: 'none', cursor: 'pointer',
                      borderBottom: activeTab === t ? '2.5px solid #22c55e' : '2.5px solid transparent',
                      color: activeTab === t ? '#22c55e' : '#64748b',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {SHEET_INFO[t].icon} {SHEET_INFO[t].label}
                    <span style={{
                      background: result ? (result.errors.length === 0 ? '#dcfce7' : '#fee2e2') : '#e2e8f0',
                      color: result ? (result.errors.length === 0 ? '#16a34a' : '#dc2626') : '#64748b',
                      borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700,
                    }}>
                      {sheets[t]?.length ?? 0}
                    </span>
                    {importedTabs.has(t) && <span style={{ fontSize: 11, color: '#22c55e' }}>✓</span>}
                  </button>
                )
              })}
          </div>

          {activeTab && (
            <div style={{ padding: 20 }}>
              {/* Result banner */}
              {currentResult && (
                <div style={{
                  background: currentResult.imported > 0 ? '#f0fdf4' : '#fff1f2',
                  border: `1.5px solid ${currentResult.imported > 0 ? '#86efac' : '#fecaca'}`,
                  borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: currentResult.errors.length > 0 ? 8 : 0 }}>
                    ✅ Đã import: <span style={{ color: '#16a34a' }}>{currentResult.imported} dòng</span>
                    {currentResult.errors.length > 0 && (
                      <span style={{ color: '#dc2626', marginLeft: 12 }}>❌ Lỗi: {currentResult.errors.length} dòng</span>
                    )}
                  </div>
                  {currentResult.errors.length > 0 && (
                    <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                      {currentResult.errors.map((e, i) => (
                        <div key={i} style={{ color: '#dc2626', fontSize: 12, lineHeight: 1.8 }}>
                          Dòng {e.row}: {e.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Xem trước <b>{currentRows.length}</b> dòng (hiển thị tối đa 50)
                </div>
                <button
                  onClick={() => handleImport(activeTab)}
                  disabled={loading || importedTabs.has(activeTab)}
                  style={{
                    background: importedTabs.has(activeTab) ? '#86efac' : loading ? '#94a3b8' : '#22c55e',
                    color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px',
                    fontSize: 13, fontWeight: 700, cursor: loading || importedTabs.has(activeTab) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {loading ? '⏳ Đang import...' : importedTabs.has(activeTab) ? '✓ Đã import' : `⬆️ Import ${SHEET_INFO[activeTab].label}`}
                </button>
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', width: 40 }}>#</th>
                      {previewCols.map((col) => (
                        <th key={col} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.slice(0, 50).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{i + 1}</td>
                        {previewCols.map((col) => (
                          <td key={col} style={{ padding: '7px 12px', color: '#0f1929', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {currentRows.length > 50 && (
                      <tr>
                        <td colSpan={previewCols.length + 1} style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                          ... và {currentRows.length - 50} dòng nữa (tất cả sẽ được import)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!fileName && (
        <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 14, color: '#475569' }}>Upload file Excel để import dữ liệu vào Sanity</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Tải template mẫu ở cột bên phải để bắt đầu</div>
        </div>
      )}

      {fileName && Object.keys(sheets).length === 0 && (
        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: 20, textAlign: 'center', color: '#c2410c', fontSize: 13 }}>
          ⚠️ File không có sheet nào tên là <b>Stores</b>, <b>Posts</b>, hoặc <b>Reviews</b>. Vui lòng dùng template đúng định dạng.
        </div>
      )}
    </div>
  )
}
