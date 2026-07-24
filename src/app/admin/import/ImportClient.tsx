'use client'

import { useRef, useState } from 'react'
import type { CellValue, Worksheet } from 'exceljs'

type SheetType = 'Stores' | 'Deals' | 'Posts' | 'Reviews'
type Row = Record<string, string | number | boolean | null>
type ImportResult = {
  imported: number
  errors: { row: number; message: string }[]
  warnings?: { row: number; message: string }[]
  aiDrafts?: { storeId: string; storeName: string; ok: boolean }[]
}

const STORES_COLS = [
  { key: 'store_name', required: true,  note: 'Tên store' },
  { key: 'abbr',       required: true,  note: 'Viết tắt, tối đa 3 ký tự, VD: AMZ' },
  { key: 'website',    required: false, note: 'Website chính thức, VD: example.com' },
  { key: 'link',       required: true,  note: 'Link affiliate — dùng cho cả store lẫn offer' },
  { key: 'category',   required: false, note: 'electronics|fashion|beauty|home|sports|food|travel|books|gaming|general' },
  { key: 'maxOffer',   required: false, note: 'Giảm tối đa (%), VD: 70' },
  { key: 'store_imageUrl',    required: false, note: 'URL ảnh logo store (link trực tiếp tới file ảnh, VD: https://example.com/logo.png) — lưu ý dịch vụ logo.clearbit.com đã ngừng hoạt động' },
  { key: 'store_description', required: false, note: 'Mô tả ngắn / tagline — hiện dưới tên store' },
  { key: 'store_about',       required: false, note: 'HTML thô cho khối About. Bỏ trống nếu dùng 7 cột about_* bên dưới (about_* được ưu tiên)' },
  { key: 'about_tagline',              required: false, note: '1 câu hiện ngay dưới tiêu đề "About {Store}"' },
  { key: 'about_badge',                required: false, note: '1 emoji đại diện thương hiệu, VD: 👜 (mặc định 🛍️)' },
  { key: 'about_intro',                required: false, note: '⚠️ 2-4 câu, PHẢI bắt đầu bằng CHỮ THƯỜNG + động từ, VD: "specializes in..." — vì hệ thống ghép ngay sau tên store thành 1 câu liền. Đừng lặp lại tên store' },
  { key: 'about_product_range',        required: false, note: 'Thẻ 1 — Bán những gì (chỉ nhập nội dung, tiêu đề "Product Range" tự có)' },
  { key: 'about_customer_benefits',    required: false, note: 'Thẻ 2 — Vì sao mua ở đây tốt (chất lượng/bảo hành/hỗ trợ, KHÔNG nói giảm giá)' },
  { key: 'about_shopping_experience',  required: false, note: 'Thẻ 3 — Thanh toán, giao hàng, dễ dùng' },
  { key: 'about_why_choose',           required: false, note: 'Thẻ 4 — Điểm khác biệt / lý do tin tưởng' },
  { key: 'metaTitle',                  required: false, note: 'SEO Meta Title, nên ≤60 ký tự' },
  { key: 'metaKeywords',               required: false, note: 'SEO Keywords, 5-8 từ khoá cách nhau dấu phẩy' },
  { key: 'metaDescription',            required: false, note: 'SEO Meta Description, nên ≤160 ký tự' },
  { key: 'faq',                        required: false, note: 'Câu hỏi + trả lời, mỗi cặp cách nhau 1 DÒNG TRỐNG. VD trong 1 ô: "Câu hỏi 1?\\nTrả lời 1\\n\\nCâu hỏi 2?\\nTrả lời 2" (Alt+Enter để xuống dòng)' },
  { key: 'pros',                       required: false, note: 'Ưu điểm, mỗi ý 1 dòng trong ô (Alt+Enter)' },
  { key: 'cons',                       required: false, note: 'Nhược điểm, mỗi ý 1 dòng trong ô (Alt+Enter)' },
  { key: 'offer_title',       required: true,  note: 'Câu mô tả ĐẦY ĐỦ của offer, VD: "Giảm 30% toàn bộ sản phẩm"' },
  { key: 'Offer',             required: true,  note: 'Nhãn NGẮN dạng badge (khác offer_title), VD: "30% Off", "Free Shipping"' },
  { key: 'couponCode',        required: false, note: 'Mã giảm giá (nếu có)' },
  { key: 'expiresAt',         required: false, note: 'Ngày hết hạn, VD: 2026-12-31' },
  { key: 'verified',          required: false, note: 'TRUE/FALSE (mặc định TRUE)' },
  { key: 'active',            required: false, note: 'TRUE/FALSE (mặc định TRUE)' },
  { key: 'order',             required: false, note: 'Thứ tự hiển thị (số)' },
]

const DEALS_COLS = [
  { key: 'title',            required: true,  note: 'Tên deal — ĐỒNG THỜI là khoá khớp. Trùng tiêu đề deal đã có = cập nhật; tiêu đề mới = tạo deal mới' },
  { key: 'store',            required: false, note: 'Tên cửa hàng hiển thị, VD: Apple · Best Buy — BẮT BUỘC khi tạo deal mới' },
  { key: 'priceSale',        required: false, note: 'Giá sau giảm, VD: $189 — BẮT BUỘC khi tạo deal mới' },
  { key: 'priceOrig',        required: false, note: 'Giá gốc, VD: $249 — BẮT BUỘC khi tạo deal mới' },
  { key: 'discount',         required: false, note: '% giảm, số 1–99 — BẮT BUỘC khi tạo deal mới' },
  { key: 'discountByAmount', required: false, note: 'TRUE = hiển thị "$100 OFF" thay vì %. Mặc định FALSE' },
  { key: 'category',         required: false, note: 'Tên hoặc slug danh mục, VD: fashion, tech--gadgets. Không khớp = bỏ qua + cảnh báo' },
  { key: 'imageUrl',         required: false, note: 'URL ảnh sản phẩm (tự tải về Sanity). Bỏ trống → dùng emoji' },
  { key: 'emoji',            required: false, note: 'Emoji hiện khi không có ảnh, VD: 🎧 👟 📺' },
  { key: 'imgClass',         required: false, note: 'Nền thẻ khi dùng emoji: di-tech | di-home | di-fashion | di-beauty' },
  { key: 'dealUrl',          required: false, note: 'Link affiliate của deal' },
  { key: 'expiresAt',        required: false, note: 'Ngày hết hạn, VD: 2026-12-31' },
  { key: 'isExpiring',       required: false, note: 'TRUE = gắn nhãn "Sắp hết hạn"' },
  { key: 'verified',         required: false, note: 'TRUE/FALSE (mặc định TRUE)' },
  { key: 'summary',          required: false, note: 'Tóm tắt "vì sao đáng mua" — nội dung như AI tạo, hiện trên trang /deals/[slug]' },
  { key: 'metaTitle',        required: false, note: 'SEO Meta Title' },
  { key: 'metaDescription',  required: false, note: 'SEO Meta Description' },
  { key: 'faq',              required: false, note: 'Câu hỏi + trả lời, mỗi cặp cách nhau 1 DÒNG TRỐNG (Alt+Enter để xuống dòng)' },
  { key: 'pros',             required: false, note: 'Ưu điểm, mỗi ý 1 dòng trong ô (Alt+Enter)' },
  { key: 'cons',             required: false, note: 'Nhược điểm, mỗi ý 1 dòng trong ô (Alt+Enter)' },
]

const POSTS_COLS = [
  { key: 'title',            required: true,  note: 'Tiêu đề bài viết' },
  { key: 'excerpt',          required: false, note: 'Tóm tắt ngắn, hiện ở danh sách' },
  { key: 'category',         required: false, note: 'Tips & Guides|Comparison|Store Guide|Deals Roundup|News' },
  { key: 'author',           required: false, note: 'Tên tác giả' },
  { key: 'publishedAt',      required: false, note: 'VD: 2026-07-01 — để trống hoặc dùng khung lên lịch bên dưới' },
  { key: 'coverEmoji',       required: false, note: 'Emoji hiện thay ảnh nếu không có externalImageUrl' },
  { key: 'coverBg',          required: false, note: 'CSS gradient nền, VD: linear-gradient(135deg,#f00,#00f)' },
  { key: 'readTime',         required: false, note: 'Số phút đọc, VD: 5' },
  { key: 'content',          required: false, note: 'Nội dung bài viết, hỗ trợ HTML' },
  { key: 'externalImageUrl', required: false, note: 'URL ảnh cover — ưu tiên hơn coverEmoji nếu có' },
]

const REVIEWS_COLS = [
  { key: 'title',            required: true,  note: 'Tiêu đề review' },
  { key: 'excerpt',          required: true,  note: 'Tóm tắt ngắn, hiện ở danh sách' },
  { key: 'stars',            required: true,  note: 'Số sao, từ 1–5' },
  { key: 'tag',              required: false, note: 'Review hoặc Comparison' },
  { key: 'author',           required: false, note: 'Tên tác giả' },
  { key: 'emoji',            required: false, note: 'Emoji hiện thay ảnh nếu không có externalImageUrl' },
  { key: 'publishedAt',      required: false, note: 'VD: 2026-07-01 — để trống hoặc dùng khung lên lịch bên dưới' },
  { key: 'imgBg',            required: false, note: 'CSS gradient nền, VD: linear-gradient(135deg,#f00,#00f)' },
  { key: 'content',          required: false, note: 'Nội dung review, hỗ trợ HTML' },
  { key: 'externalImageUrl', required: false, note: 'URL ảnh cover — ưu tiên hơn emoji nếu có' },
  { key: 'productUrl',       required: false, note: 'Link sản phẩm gốc' },
  { key: 'affiliateUrl',     required: false, note: 'Link affiliate cho nút CTA & link trong bài — để trống = dùng productUrl' },
  { key: 'pros',             required: false, note: 'Ưu điểm, mỗi ý 1 dòng trong ô (Alt+Enter để xuống dòng)' },
  { key: 'cons',             required: false, note: 'Nhược điểm, mỗi ý 1 dòng trong ô (Alt+Enter để xuống dòng)' },
  { key: 'faq',              required: false, note: 'Câu hỏi + trả lời, mỗi cặp cách nhau 1 dòng trống. VD trong 1 ô: "Câu hỏi 1?\\nTrả lời 1\\n\\nCâu hỏi 2?\\nTrả lời 2"' },
  { key: 'metaTitle',        required: false, note: 'SEO Meta Title — để trống = dùng title' },
  { key: 'metaDescription',  required: false, note: 'SEO Meta Description — để trống = dùng excerpt' },
]

type ColDef = { key: string; required: boolean; note?: string }
const COLS_MAP: Record<SheetType, ColDef[]> = {
  Stores: STORES_COLS,
  Deals: DEALS_COLS,
  Posts: POSTS_COLS,
  Reviews: REVIEWS_COLS,
}

const PREVIEW_COLS: Record<SheetType, string[]> = {
  Stores: ['store_name', 'link', 'offer_title', 'Offer', 'couponCode'],
  Deals: ['title', 'store', 'priceSale', 'discount', 'summary'],
  Posts: ['title', 'category', 'author', 'publishedAt', 'excerpt'],
  Reviews: ['title', 'stars', 'tag', 'author', 'publishedAt', 'excerpt'],
}

const SHEET_ICON: Record<SheetType, string> = {
  Stores: '🏪',
  Deals: '🏷️',
  Posts: '📝',
  Reviews: '⭐',
}

const SHEET_LABEL: Record<SheetType, string> = {
  Stores: 'Stores & Offers',
  Deals: 'Deals',
  Posts: 'Posts',
  Reviews: 'Reviews',
}

// --- exceljs helpers (replaces SheetJS/xlsx — see route.ts normalizePublishedAt) ---
// exceljs is dynamically imported inside the handlers so its ~912KB browser bundle
// stays out of the initial admin page load and only loads on first read/download.

// Flatten an exceljs cell value to the primitive the import API expects.
// Date cells come back as JS Date objects (xlsx used to return Excel serial
// numbers) — emit an ISO `yyyy-mm-dd` string so both `expiresAt`
// (new Date(...)) and `publishedAt` (normalizePublishedAt) parse correctly.
function cellToPrimitive(v: CellValue): string | number | boolean {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if ('result' in v) return cellToPrimitive(v.result as CellValue)
    if ('richText' in v) return v.richText.map((t) => t.text).join('')
    if ('hyperlink' in v) return typeof v.text === 'string' ? v.text : ''
    if ('text' in v) return String(v.text)
    return '' // formula without cached result, or error cell
  }
  return v
}

// Convert a worksheet to an array of header-keyed row objects (row 1 = headers),
// mirroring XLSX.utils.sheet_to_json({ defval: '' }) — empty cells become '',
// fully-empty rows are skipped.
function worksheetToRows(ws: Worksheet): Row[] {
  const headers: string[] = []
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cellToPrimitive(cell.value)).trim()
  })
  const lastCol = headers.length - 1
  const rows: Row[] = []
  for (let r = 2; r <= ws.rowCount; r++) {
    const wsRow = ws.getRow(r)
    const obj: Row = {}
    let hasValue = false
    for (let c = 1; c <= lastCol; c++) {
      const key = headers[c]
      if (!key) continue
      const value = cellToPrimitive(wsRow.getCell(c).value)
      obj[key] = value
      if (value !== '') hasValue = true
    }
    if (hasValue) rows.push(obj)
  }
  return rows
}

type SheetSpec = { name: string; headers: string[]; rows: Record<string, string | number>[] }

// Build an .xlsx workbook in the browser and trigger a download.
async function downloadWorkbook(specs: SheetSpec[], fileName: string) {
  const { Workbook } = await import('exceljs')
  const wb = new Workbook()
  for (const spec of specs) {
    const ws = wb.addWorksheet(spec.name)
    ws.columns = spec.headers.map((h) => ({ header: h, key: h, width: Math.max(h.length + 2, 16) }))
    for (const row of spec.rows) ws.addRow(row)
  }
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking synchronously right after click() cancels the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Deliberately unmistakable placeholder data. An earlier version used realistic
// "Amazon"/"Nike" rows with plausible codes, which got imported into the live
// dataset by accident — fake merchants and dead coupon codes are exactly what
// this project must never publish. Keep every value here obviously disposable.
const EXAMPLE_STORE = 'VÍ DỤ — XOÁ DÒNG NÀY'

function makeStoresExample() {
  const storeCols = {
    store_name: EXAMPLE_STORE, abbr: 'VD', website: 'example.com',
    link: 'https://example.com', category: 'general', maxOffer: 30,
    store_imageUrl: '',
    store_description: 'Dòng ví dụ minh hoạ định dạng import — xoá trước khi dùng thật',
    store_about: '',
    about_tagline: 'Example tagline shown under the About heading',
    about_badge: '🛍️',
    // Starts lowercase with a verb on purpose — it is rendered straight after
    // "<strong>{Store}</strong> " to form one sentence.
    about_intro: 'is an example row used only to demonstrate the import format. Delete it before importing real data.',
    about_product_range: 'Describe here what the store actually sells.',
    about_customer_benefits: 'Describe quality, guarantees or support — not discounts.',
    about_shopping_experience: 'Describe checkout, delivery and site usability.',
    about_why_choose: 'Describe what genuinely sets this store apart.',
    metaTitle: 'Example Meta Title (≤60 characters)',
    metaKeywords: 'example, keywords, comma, separated',
    metaDescription: 'Example meta description, kept under 160 characters.',
    faq: 'Example question one?\nExample answer one.\n\nExample question two?\nExample answer two.',
    pros: 'Example advantage one\nExample advantage two',
    cons: 'Example drawback one\nExample drawback two',
  }
  return [
    // Row 1 carries the store content...
    {
      ...storeCols,
      offer_title: 'Example offer description written in full', Offer: 'Example Badge',
      couponCode: 'EXAMPLECODE', expiresAt: '2026-12-31', verified: 'TRUE', active: 'TRUE', order: 1,
    },
    // ...row 2 is the SAME store with a second offer. Content columns are left
    // blank on purpose: store content is read once, from the first row that has it.
    {
      store_name: EXAMPLE_STORE, abbr: 'VD', website: 'example.com',
      link: 'https://example.com', category: 'general', maxOffer: 30,
      offer_title: 'Second offer for the same store', Offer: 'Example Badge 2',
      couponCode: '', expiresAt: '', verified: 'TRUE', active: 'TRUE', order: 2,
    },
  ]
}

function makeDealsExample() {
  return [
    {
      title: EXAMPLE_STORE, store: 'Example Store',
      priceSale: '$48', priceOrig: '$60', discount: 20, discountByAmount: 'FALSE',
      category: 'fashion', imageUrl: '', emoji: '🕶️', imgClass: 'di-fashion',
      dealUrl: 'https://example.com', expiresAt: '2026-12-31', isExpiring: 'FALSE', verified: 'TRUE',
      summary: 'Example summary explaining why this deal is worth buying — delete this row before importing real data.',
      metaTitle: 'Example Deal Meta Title', metaDescription: 'Example meta description kept under 160 characters.',
      faq: 'Example question one?\nExample answer one.\n\nExample question two?\nExample answer two.',
      pros: 'Example advantage one\nExample advantage two',
      cons: 'Example drawback one\nExample drawback two',
    },
  ]
}

function exampleRows(type: SheetType): Record<string, string | number>[] {
  if (type === 'Stores') return makeStoresExample()
  if (type === 'Deals') return makeDealsExample()
  return []
}

function generateTemplate(type: SheetType) {
  const headers = COLS_MAP[type].map((c) => c.key)
  return downloadWorkbook([{ name: type, headers, rows: exampleRows(type) }], `template_${type.toLowerCase()}.xlsx`)
}

function generateFullTemplate() {
  const types: SheetType[] = ['Stores', 'Deals', 'Posts', 'Reviews']
  const specs: SheetSpec[] = types.map((type) => ({
    name: type,
    headers: COLS_MAP[type].map((c) => c.key),
    rows: exampleRows(type),
  }))
  return downloadWorkbook(specs, 'offerdy_import_template.xlsx')
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
  const [scheduleMode, setScheduleMode] = useState<'now' | 'spread'>('now')
  const [postsPerDay, setPostsPerDay] = useState(3)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [guideTab, setGuideTab] = useState<SheetType>('Stores')

  const validSheets: SheetType[] = ['Stores', 'Deals', 'Posts', 'Reviews']

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setSheets({})
    setActiveTab(null)
    setResults({})
    setImportedTabs(new Set())

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const data = ev.target?.result
      if (!data || typeof data === 'string') return
      try {
        const { Workbook } = await import('exceljs')
        const wb = new Workbook()
        await wb.xlsx.load(data)
        const parsed: Partial<Record<SheetType, Row[]>> = {}
        let firstSheet: SheetType | null = null

        for (const ws of wb.worksheets) {
          const sheetName = ws.name as SheetType
          if (!validSheets.includes(sheetName)) continue
          const rows = worksheetToRows(ws)
          if (rows.length > 0) {
            parsed[sheetName] = rows
            if (!firstSheet) firstSheet = sheetName
          }
        }

        setSheets(parsed)
        setActiveTab(firstSheet)
      } catch (err) {
        console.error('Không đọc được file Excel', err)
        setSheets({})
        setActiveTab(null)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const BATCH_SIZE = 50

  async function handleImport(type: SheetType) {
    const rows = sheets[type]
    if (!rows || rows.length === 0) return
    setLoading(true)
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE)
    const combined: ImportResult = { imported: 0, errors: [], warnings: [], aiDrafts: [] }
    setProgress({ done: 0, total: totalBatches })

    try {
      for (let b = 0; b < totalBatches; b++) {
        const offset = b * BATCH_SIZE
        const batchRows = rows.slice(offset, offset + BATCH_SIZE)
        try {
          const schedule = (type === 'Posts' || type === 'Reviews') && scheduleMode === 'spread'
            ? { postsPerDay, startDate, startIndex: offset }
            : undefined
          const res = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type.toLowerCase(), rows: batchRows, schedule }),
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
          combined.aiDrafts!.push(...(batchResult.aiDrafts ?? []))
        } catch (err) {
          combined.errors.push({ row: offset + 2, message: String(err) })
        }
        setProgress({ done: b + 1, total: totalBatches })
        setResults((prev) => ({
          ...prev,
          [type]: { ...combined, errors: [...combined.errors], warnings: [...combined.warnings!], aiDrafts: [...combined.aiDrafts!] },
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
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Sheet: <b>Stores</b>, <b>Deals</b>, <b>Posts</b>, <b>Reviews</b></div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />

          {/* Column guide — tabbed by sheet type */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {validSheets.map((t) => (
                <button
                  key={t}
                  onClick={() => setGuideTab(t)}
                  style={{
                    padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: 'pointer',
                    border: guideTab === t ? '1px solid #0f1929' : '1px solid #e2e8f0',
                    background: guideTab === t ? '#0f1929' : '#fff',
                    color: guideTab === t ? '#fff' : '#475569',
                  }}
                >
                  {SHEET_ICON[t]} {t}
                </button>
              ))}
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f1929', marginBottom: 8 }}>📌 Sheet {guideTab} — cấu trúc cột</div>
            {guideTab === 'Stores' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                Nhiều dòng cùng <code style={{ background: '#fef3c7', padding: '0 4px', borderRadius: 3 }}>store_name</code> → tự gộp 1 store, mỗi dòng tạo 1 offer riêng
              </div>
            )}
            {guideTab === 'Deals' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#166534', marginBottom: 10 }}>
                Khớp theo <code style={{ background: '#dcfce7', padding: '0 4px', borderRadius: 3 }}>title</code>: trùng deal đã có → cập nhật (ô trống không đụng tới), tiêu đề mới → tạo deal mới (cần store + giá + %)
              </div>
            )}
            {(guideTab === 'Posts' || guideTab === 'Reviews') && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1e40af', marginBottom: 10 }}>
                Mỗi dòng tạo 1 {guideTab === 'Posts' ? 'bài viết' : 'review'} riêng — không gộp dòng như sheet Stores
              </div>
            )}
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
                  {COLS_MAP[guideTab].map((col, i) => (
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
              📋 Template đầy đủ (4 sheets)
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

          <div style={{ marginTop: 16, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#c2410c' }}>
            ⚠️ <b>Xoá dòng ví dụ</b> trong template trước khi import — nếu không, store <code style={{ fontSize: 11 }}>VÍ DỤ</code> và mã <code style={{ fontSize: 11 }}>EXAMPLECODE</code> sẽ lên website thật.
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
                  {(currentResult.aiDrafts?.length ?? 0) > 0 && (
                    <div style={{ marginTop: 8, color: '#16a34a', fontSize: 12 }}>
                      🤖 {currentResult.aiDrafts!.filter((d) => d.ok).length} draft nội dung AI đã sẵn sàng —{' '}
                      <a href="/admin/ai-review" style={{ color: '#16a34a', textDecoration: 'underline' }}>xem tại AI Review Queue</a>
                    </div>
                  )}
                </div>
              )}

              {/* Schedule bar — chỉ hiện cho Posts/Reviews */}
              {(activeTab === 'Posts' || activeTab === 'Reviews') && !importedTabs.has(activeTab) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                  background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 14, fontSize: 13,
                }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Lịch đăng bài:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="radio" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} />
                    Đăng ngay tất cả
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="radio" checked={scheduleMode === 'spread'} onChange={() => setScheduleMode('spread')} />
                    Chia đều theo ngày
                  </label>
                  {scheduleMode === 'spread' && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Số bài/ngày:
                        <input
                          type="number" min={1} max={50} value={postsPerDay}
                          onChange={e => setPostsPerDay(Math.max(1, Number(e.target.value) || 1))}
                          style={{ width: 56, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Bắt đầu từ:
                        <input
                          type="date" value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
                        />
                      </label>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>
                        → sẽ đăng dần trong {Math.ceil(currentRows.length / postsPerDay)} ngày (9h sáng mỗi ngày)
                      </span>
                    </>
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
          ⚠️ File không có sheet nào tên là <b>Stores</b>, <b>Deals</b>, <b>Posts</b>, hoặc <b>Reviews</b>.
        </div>
      )}
    </div>
  )
}
