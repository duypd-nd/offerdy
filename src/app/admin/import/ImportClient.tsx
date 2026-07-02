'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'

type SheetType = 'Stores' | 'Posts' | 'Reviews'
type Row = Record<string, string | number | boolean | null>
type ImportResult = {
  imported: number
  errors: { row: number; message: string }[]
  warnings?: { row: number; message: string }[]
}

const STORES_COLS = [
  { key: 'store_name', required: true,  note: 'Tên store' },
  { key: 'abbr',       required: true,  note: 'Viết tắt, tối đa 3 ký tự, VD: AMZ' },
  { key: 'website',    required: false, note: 'Website chính thức, VD: amazon.com' },
  { key: 'link',       required: true,  note: 'Link affiliate — dùng cho cả store lẫn offer' },
  { key: 'category',   required: false, note: 'electronics|fashion|beauty|home|sports|food|travel|books|gaming|general' },
  { key: 'maxOffer',   required: false, note: 'Giảm tối đa (%), VD: 70' },
  { key: 'store_imageUrl',    required: false, note: 'URL ảnh logo store (link trực tiếp tới file ảnh, VD: https://example.com/logo.png) — lưu ý dịch vụ logo.clearbit.com đã ngừng hoạt động' },
  { key: 'store_description', required: false, note: 'Mô tả ngắn / tagline' },
  { key: 'store_about',       required: false, note: 'Mô tả dài, hỗ trợ HTML' },
  { key: 'offer_title',       required: true,  note: 'Tiêu đề offer' },
  { key: 'offerText',         required: true,  note: 'Mô tả ngắn của offer' },
  { key: 'couponCode',        required: false, note: 'Mã giảm giá (nếu có)' },
  { key: 'expiresAt',         required: false, note: 'Ngày hết hạn, VD: 2026-12-31' },
  { key: 'verified',          required: false, note: 'TRUE/FALSE (mặc định TRUE)' },
  { key: 'active',            required: false, note: 'TRUE/FALSE (mặc định TRUE)' },
  { key: 'order',             required: false, note: 'Thứ tự hiển thị (số)' },
]

const POSTS_COLS = [
  { key: 'title',            required: true },
  { key: 'excerpt',          required: false },
  { key: 'category',         required: false, note: 'Tips & Guides|Comparison|Store Guide|Deals Roundup|News' },
  { key: 'author',           required: false },
  { key: 'publishedAt',      required: false, note: 'VD: 2026-07-01' },
  { key: 'coverEmoji',       required: false },
  { key: 'coverBg',          required: false, note: 'CSS gradient' },
  { key: 'readTime',         required: false, note: 'Phút đọc' },
  { key: 'content',          required: false, note: 'HTML' },
  { key: 'externalImageUrl', required: false },
]

const REVIEWS_COLS = [
  { key: 'title',            required: true },
  { key: 'excerpt',          required: true },
  { key: 'stars',            required: true, note: '1–5' },
  { key: 'tag',              required: false, note: 'Review hoặc Comparison' },
  { key: 'emoji',            required: false },
  { key: 'publishedAt',      required: false, note: 'VD: 2026-07-01' },
  { key: 'imgBg',            required: false, note: 'CSS gradient' },
  { key: 'content',          required: false, note: 'HTML' },
  { key: 'externalImageUrl', required: false },
]

type ColDef = { key: string; required: boolean; note?: string }
const COLS_MAP: Record<SheetType, ColDef[]> = {
  Stores: STORES_COLS,
  Posts: POSTS_COLS,
  Reviews: REVIEWS_COLS,
}

const PREVIEW_COLS: Record<SheetType, string[]> = {
  Stores: ['store_name', 'link', 'offer_title', 'offerText', 'couponCode'],
  Posts: ['title', 'category', 'author', 'publishedAt', 'excerpt'],
  Reviews: ['title', 'stars', 'tag', 'publishedAt', 'excerpt'],
}

const SHEET_ICON: Record<SheetType, string> = {
  Stores: '🏪',
  Posts: '📝',
  Reviews: '⭐',
}

const SHEET_LABEL: Record<SheetType, string> = {
  Stores: 'Stores & Offers',
  Posts: 'Posts',
  Reviews: 'Reviews',
}

function makeStoresExample() {
  return [
    {
      store_name: 'Amazon', abbr: 'AMZ', website: 'amazon.com',
      link: 'https://amzn.to/xxx', category: 'electronics', maxOffer: 70,
      store_imageUrl: 'https://logo.clearbit.com/amazon.com',
      store_description: 'Shop millions of products',
      store_about: '<p>Amazon la nen tang thuong mai dien tu hang dau the gioi.</p>',
      offer_title: '20% Off Electronics', offerText: '20% Off Electronics',
      couponCode: 'TECH20', expiresAt: '2026-12-31', verified: 'TRUE', active: 'TRUE', order: 1,
    },
    {
      store_name: 'Amazon', abbr: 'AMZ', website: 'amazon.com',
      link: 'https://amzn.to/xxx', category: 'electronics', maxOffer: 70,
      store_imageUrl: 'https://logo.clearbit.com/amazon.com',
      store_description: 'Shop millions of products',
      store_about: '<p>Amazon la nen tang thuong mai dien tu hang dau the gioi.</p>',
      offer_title: 'Free Shipping on Orders $35+', offerText: 'Free Shipping $35+',
      couponCode: '', expiresAt: '', verified: 'TRUE', active: 'TRUE', order: 2,
    },
    {
      store_name: 'Nike', abbr: 'NIKE', website: 'nike.com',
      link: 'https://nike.com/aff', category: 'sports', maxOffer: 50,
      store_imageUrl: 'https://logo.clearbit.com/nike.com',
      store_description: 'The world\'s leading sports brand',
      store_about: '<p>Nike la thuong hieu the thao hang dau the gioi.</p>',
      offer_title: 'Extra 25% Off Sale Items', offerText: '25% Off Sale',
      couponCode: 'EXTRA25', expiresAt: '2026-08-31', verified: 'TRUE', active: 'TRUE', order: 1,
    },
  ]
}

function generateTemplate(type: SheetType) {
  const headers = COLS_MAP[type].map((c) => c.key)
  const rows = type === 'Stores' ? makeStoresExample() : []
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 16) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, type)
  XLSX.writeFile(wb, `template_${type.toLowerCase()}.xlsx`)
}

function generateFullTemplate() {
  const wb = XLSX.utils.book_new()
  const types: SheetType[] = ['Stores', 'Posts', 'Reviews']
  for (const type of types) {
    const headers = COLS_MAP[type].map((c) => c.key)
    const rows = type === 'Stores' ? makeStoresExample() : []
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 16) }))
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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

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

  const BATCH_SIZE = 50

  async function handleImport(type: SheetType) {
    const rows = sheets[type]
    if (!rows || rows.length === 0) return
    setLoading(true)
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE)
    const combined: ImportResult = { imported: 0, errors: [], warnings: [] }
    setProgress({ done: 0, total: totalBatches })

    try {
      for (let b = 0; b < totalBatches; b++) {
        const offset = b * BATCH_SIZE
        const batchRows = rows.slice(offset, offset + BATCH_SIZE)
        try {
          const res = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type.toLowerCase(), rows: batchRows }),
          })
          const text = await res.text()
          let batchResult: ImportResult
          try {
            batchResult = JSON.parse(text)
          } catch {
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
          }
          if (!res.ok) {
            throw new Error((batchResult as unknown as { error?: string }).error || `HTTP ${res.status}`)
          }
          combined.imported += batchResult.imported
          combined.errors.push(
            ...batchResult.errors.map((e) => ({ ...e, row: offset + e.row }))
          )
          combined.warnings!.push(
            ...(batchResult.warnings ?? []).map((w) => ({ ...w, row: offset + w.row }))
          )
        } catch (err) {
          combined.errors.push({ row: offset + 2, message: String(err) })
        }
        setProgress({ done: b + 1, total: totalBatches })
        setResults((prev) => ({
          ...prev,
          [type]: { ...combined, errors: [...combined.errors], warnings: [...combined.warnings!] },
        }))
      }
      setImportedTabs((prev) => new Set([...prev, type]))
    } finally {
      setLoading(false)
      setProgress(null)
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, marginBottom: 20 }}>

        {/* Left: Upload + Column guide */}
        <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f1929', marginBottom: 12 }}>1. Upload file Excel</div>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed #cbd5e1', borderRadius: 10, padding: '24px 20px',
              textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#22c55e')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 14, color: '#475569' }}>
              {fileName
                ? <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ {fileName}</span>
                : 'Click để chọn file .xlsx'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Sheet: <b>Stores</b>, <b>Posts</b>, <b>Reviews</b></div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />

          {/* Column guide — Stores */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f1929', marginBottom: 8 }}>📌 Sheet Stores — cấu trúc cột</div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 10 }}>
              Nhiều dòng cùng <code style={{ background: '#fef3c7', padding: '0 4px', borderRadius: 3 }}>store_name</code> → tự gộp 1 store, mỗi dòng tạo 1 offer riêng
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Cột</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', width: 50 }}>BắtBuộc</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {STORES_COLS.map((col, i) => (
                    <tr key={col.key} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: col.required ? 700 : 400, color: col.required ? '#0f1929' : '#475569', whiteSpace: 'nowrap' }}>
                        {col.key}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {col.required && <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 11 }}>{col.note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Template */}
        <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f1929', marginBottom: 12 }}>2. Tải template mẫu</div>
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
                {SHEET_ICON[t]} Template {SHEET_LABEL[t]}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#166534' }}>
            <b>store_imageUrl:</b> Dùng Clearbit logo:<br />
            <code style={{ fontSize: 11, wordBreak: 'break-all' }}>https://logo.clearbit.com/amazon.com</code>
          </div>
        </div>
      </div>

      {/* Preview & Import */}
      {Object.keys(sheets).length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #e4eaf2', background: '#f8fafc' }}>
            {validSheets
              .filter((t) => (sheets[t]?.length ?? 0) > 0)
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
                    {SHEET_ICON[t]} {SHEET_LABEL[t]}
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
                  <div style={{ fontWeight: 700, marginBottom: (currentResult.errors.length > 0 || (currentResult.warnings?.length ?? 0) > 0) ? 8 : 0 }}>
                    ✅ Đã import: <span style={{ color: '#16a34a' }}>{currentResult.imported} dòng</span>
                    {currentResult.errors.length > 0 && (
                      <span style={{ color: '#dc2626', marginLeft: 12 }}>❌ Lỗi: {currentResult.errors.length} dòng</span>
                    )}
                    {(currentResult.warnings?.length ?? 0) > 0 && (
                      <span style={{ color: '#b45309', marginLeft: 12 }}>⚠️ Cảnh báo: {currentResult.warnings!.length} dòng</span>
                    )}
                  </div>
                  {currentResult.errors.length > 0 && (
                    <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                      {currentResult.errors.map((e, idx) => (
                        <div key={idx} style={{ color: '#dc2626', fontSize: 12, lineHeight: 1.8 }}>
                          Dòng {e.row}: {e.message}
                        </div>
                      ))}
                    </div>
                  )}
                  {(currentResult.warnings?.length ?? 0) > 0 && (
                    <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: currentResult.errors.length > 0 ? 8 : 0 }}>
                      {currentResult.warnings!.map((w, idx) => (
                        <div key={idx} style={{ color: '#b45309', fontSize: 12, lineHeight: 1.8 }}>
                          Dòng {w.row}: {w.message}
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
                    color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px',
                    fontSize: 13, fontWeight: 700,
                    cursor: loading || importedTabs.has(activeTab) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {loading
                    ? `⏳ Đang import... ${progress ? `(${progress.done}/${progress.total})` : ''}`
                    : importedTabs.has(activeTab)
                      ? '✓ Đã import'
                      : `⬆️ Import ${SHEET_LABEL[activeTab]}`}
                </button>
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', width: 36 }}>#</th>
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
          ⚠️ File không có sheet nào tên là <b>Stores</b>, <b>Posts</b>, hoặc <b>Reviews</b>.
        </div>
      )}
    </div>
  )
}
