'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'

type SheetType = 'Stores' | 'Offers' | 'Posts' | 'Reviews'
type Row = Record<string, string | number | boolean | null>
type ImportResult = { imported: number; errors: { row: number; message: string }[] }

const SHEET_COLS: Record<SheetType, { key: string; label: string; required?: boolean }[]> = {
  Stores: [
    { key: 'name', label: 'name *', required: true },
    { key: 'category', label: 'category' },
    { key: 'abbr', label: 'abbr' },
    { key: 'maxOffer', label: 'maxOffer' },
    { key: 'website', label: 'website' },
    { key: 'affiliateLink', label: 'affiliateLink' },
    { key: 'shortDescription', label: 'shortDescription' },
    { key: 'description', label: 'description' },
    { key: 'metaTitle', label: 'metaTitle' },
    { key: 'metaKeywords', label: 'metaKeywords' },
    { key: 'metaDescription', label: 'metaDescription' },
  ],
  Offers: [
    { key: 'title', label: 'title *', required: true },
    { key: 'storeName', label: 'storeName *', required: true },
    { key: 'offerText', label: 'offerText *', required: true },
    { key: 'link', label: 'link *', required: true },
    { key: 'couponCode', label: 'couponCode' },
    { key: 'description', label: 'description' },
    { key: 'expiresAt', label: 'expiresAt' },
    { key: 'order', label: 'order' },
    { key: 'active', label: 'active' },
    { key: 'verified', label: 'verified' },
  ],
  Posts: [
    { key: 'title', label: 'title *', required: true },
    { key: 'excerpt', label: 'excerpt' },
    { key: 'category', label: 'category' },
    { key: 'author', label: 'author' },
    { key: 'publishedAt', label: 'publishedAt' },
    { key: 'coverEmoji', label: 'coverEmoji' },
    { key: 'coverBg', label: 'coverBg' },
    { key: 'readTime', label: 'readTime' },
    { key: 'content', label: 'content' },
    { key: 'externalImageUrl', label: 'externalImageUrl' },
  ],
  Reviews: [
    { key: 'title', label: 'title *', required: true },
    { key: 'excerpt', label: 'excerpt *', required: true },
    { key: 'stars', label: 'stars * (1-5)', required: true },
    { key: 'tag', label: 'tag (Review/Comparison)' },
    { key: 'emoji', label: 'emoji' },
    { key: 'publishedAt', label: 'publishedAt' },
    { key: 'imgBg', label: 'imgBg' },
    { key: 'content', label: 'content' },
    { key: 'externalImageUrl', label: 'externalImageUrl' },
  ],
}

const PREVIEW_COLS: Record<SheetType, string[]> = {
  Stores: ['name', 'category', 'abbr', 'maxOffer', 'website'],
  Offers: ['title', 'storeName', 'offerText', 'couponCode', 'link'],
  Posts: ['title', 'category', 'author', 'publishedAt', 'excerpt'],
  Reviews: ['title', 'stars', 'tag', 'publishedAt', 'excerpt'],
}

function generateTemplate(type: SheetType) {
  const cols = SHEET_COLS[type]
  const headers = cols.map((c) => c.key)
  const exampleRows: Record<string, string | number>[] = []

  if (type === 'Stores') {
    exampleRows.push({
      name: 'Amazon',
      category: 'general',
      abbr: 'AMZ',
      maxOffer: 70,
      website: 'https://amazon.com',
      affiliateLink: '',
      shortDescription: 'Mua sắm online lớn nhất thế giới',
      description: '',
      metaTitle: '',
      metaKeywords: '',
      metaDescription: '',
    })
  } else if (type === 'Offers') {
    exampleRows.push({
      title: 'Giảm 20% toàn bộ đơn hàng',
      storeName: 'Amazon',
      offerText: 'Nhập mã SAVE20 giảm ngay 20%',
      link: 'https://amazon.com',
      couponCode: 'SAVE20',
      description: '',
      expiresAt: '2026-12-31',
      order: 0,
      active: 'true',
      verified: 'true',
    })
  } else if (type === 'Posts') {
    exampleRows.push({
      title: 'Top 10 deal tốt nhất tháng 7',
      excerpt: 'Tổng hợp những deal hot nhất tháng này',
      category: 'Deals Roundup',
      author: 'Offerdy Team',
      publishedAt: '2026-07-01',
      coverEmoji: '🔥',
      coverBg: 'linear-gradient(135deg,#667eea,#764ba2)',
      readTime: 5,
      content: '',
      externalImageUrl: '',
    })
  } else if (type === 'Reviews') {
    exampleRows.push({
      title: 'Đánh giá Amazon 2026',
      excerpt: 'Amazon là sàn TMĐT lớn nhất thế giới với hàng triệu sản phẩm',
      stars: 4,
      tag: 'Review',
      emoji: '⭐',
      publishedAt: '2026-07-01',
      imgBg: 'linear-gradient(135deg,#f093fb,#f5576c)',
      content: '',
      externalImageUrl: '',
    })
  }

  const ws = XLSX.utils.json_to_sheet(exampleRows, { header: headers })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, type)
  XLSX.writeFile(wb, `template_${type.toLowerCase()}.xlsx`)
}

function generateFullTemplate() {
  const wb = XLSX.utils.book_new()
  const types: SheetType[] = ['Stores', 'Offers', 'Posts', 'Reviews']
  for (const type of types) {
    const cols = SHEET_COLS[type]
    const headers = cols.map((c) => c.key)
    const ws = XLSX.utils.json_to_sheet([], { header: headers })
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

  const validSheets: SheetType[] = ['Stores', 'Offers', 'Posts', 'Reviews']

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

      {/* Upload & Template */}
      <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Upload */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f1929', marginBottom: 10 }}>1. Chọn file Excel</div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 10,
                padding: '24px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#f8fafc',
                transition: 'border-color .2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#22c55e')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
              <div style={{ fontSize: 14, color: '#475569' }}>
                {fileName ? (
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ {fileName}</span>
                ) : (
                  'Click để chọn file .xlsx'
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {/* Template download */}
          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f1929', marginBottom: 10 }}>📥 Tải template</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={generateFullTemplate}
                style={{
                  background: '#0f1929',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                📋 Template đầy đủ (4 sheets)
              </button>
              {validSheets.map((t) => (
                <button
                  key={t}
                  onClick={() => generateTemplate(t)}
                  style={{
                    background: '#f1f5f9',
                    color: '#0f1929',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '7px 16px',
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {t === 'Stores' ? '🏪' : t === 'Offers' ? '🎁' : t === 'Posts' ? '📝' : '⭐'} Template {t}
                </button>
              ))}
            </div>
          </div>

          {/* Column guide */}
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f1929', marginBottom: 10 }}>📌 Tên cột bắt buộc</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {validSheets.map((t) => (
                <div key={t} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {t === 'Stores' ? '🏪' : t === 'Offers' ? '🎁' : t === 'Posts' ? '📝' : '⭐'} Sheet <b>{t}</b>
                  </div>
                  <div style={{ color: '#64748b', lineHeight: 1.7 }}>
                    {SHEET_COLS[t]
                      .filter((c) => c.required)
                      .map((c) => c.key)
                      .join(', ')}
                  </div>
                </div>
              ))}
            </div>
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
                      padding: '12px 20px',
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      borderBottom: activeTab === t ? '2.5px solid #22c55e' : '2.5px solid transparent',
                      background: 'none',
                      cursor: 'pointer',
                      color: activeTab === t ? '#22c55e' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'color .15s',
                    }}
                  >
                    {t === 'Stores' ? '🏪' : t === 'Offers' ? '🎁' : t === 'Posts' ? '📝' : '⭐'} {t}
                    <span
                      style={{
                        background: result
                          ? result.errors.length === 0
                            ? '#dcfce7'
                            : '#fee2e2'
                          : '#e2e8f0',
                        color: result
                          ? result.errors.length === 0
                            ? '#16a34a'
                            : '#dc2626'
                          : '#64748b',
                        borderRadius: 20,
                        padding: '1px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
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
                <div
                  style={{
                    background: currentResult.imported > 0 ? '#f0fdf4' : '#fff1f2',
                    border: `1.5px solid ${currentResult.imported > 0 ? '#86efac' : '#fecaca'}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 16,
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: currentResult.errors.length > 0 ? 8 : 0 }}>
                    ✅ Đã import: <span style={{ color: '#16a34a' }}>{currentResult.imported} dòng</span>
                    {currentResult.errors.length > 0 && (
                      <span style={{ color: '#dc2626', marginLeft: 12 }}>
                        ❌ Lỗi: {currentResult.errors.length} dòng
                      </span>
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

              {/* Import button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Xem trước <b>{currentRows.length}</b> dòng — chỉ hiển thị các cột chính
                </div>
                <button
                  onClick={() => handleImport(activeTab)}
                  disabled={loading || importedTabs.has(activeTab)}
                  style={{
                    background: importedTabs.has(activeTab) ? '#86efac' : loading ? '#94a3b8' : '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 22px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: loading || importedTabs.has(activeTab) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {loading ? '⏳ Đang import...' : importedTabs.has(activeTab) ? '✓ Đã import' : `⬆️ Import ${activeTab}`}
                </button>
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', width: 40 }}>#</th>
                      {previewCols.map((col) => (
                        <th
                          key={col}
                          style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.slice(0, 50).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 12px', color: '#94a3b8' }}>{i + 1}</td>
                        {previewCols.map((col) => (
                          <td
                            key={col}
                            style={{
                              padding: '7px 12px',
                              color: '#0f1929',
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
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
      {Object.keys(sheets).length === 0 && !fileName && (
        <div style={{ background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 14 }}>Upload file Excel để bắt đầu import dữ liệu vào Sanity</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Hỗ trợ 4 sheet: <b>Stores</b>, <b>Offers</b>, <b>Posts</b>, <b>Reviews</b></div>
        </div>
      )}

      {fileName && Object.keys(sheets).length === 0 && (
        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: 20, textAlign: 'center', color: '#c2410c', fontSize: 13 }}>
          ⚠️ File không có sheet nào tên là <b>Stores</b>, <b>Offers</b>, <b>Posts</b>, hoặc <b>Reviews</b>. Vui lòng dùng template đúng định dạng.
        </div>
      )}
    </div>
  )
}
