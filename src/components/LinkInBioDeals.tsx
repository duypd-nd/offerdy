'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'
import { fuzzyMatch, fuzzyScore } from '@/lib/fuzzy'
import { formatDealCode, parseDealCode } from '@/lib/dealCode'
import type { Deal } from '@/data/deals'

// So deal hien khi CHUA tim. Link-in-bio la de luot nhanh tren dien thoai, khong
// phai trang danh muc — nhieu qua thi loang, nut "View all deals" o cuoi lo phan
// con lai. Khi co tu khoa thi tim tren TOAN BO danh sach, khong gioi han.
const PREVIEW_COUNT = 12

// Tim ngay tai cho (khong goi API): ca danh sach deal da nam trong HTML tra ve tu
// server, nen loc bang JS cho ket qua tuc thi — quan trong voi traffic bio
// Instagram/TikTok, gan nhu 100% la 4G tren dien thoai.
// fuzzyMatch/fuzzyScore duoc thiet ke cho MOT tu (so tu khoa voi tung tu cua van
// ban). Nem ca cum "fat tire ebike" vao thi chi khop khi trung nguyen chuoi con —
// go 2-3 tu la ra 0 ket qua. Nen tach tu khoa thanh token va bat buoc MOI token
// phai khop (AND), tung token van duoc chiu loi chinh ta cua fuzzyMatch.
function haystack(deal: Deal): string {
  return deal.store ? `${deal.title} ${deal.store}` : deal.title
}

function matchScore(deal: Deal, tokens: string[]): number | null {
  const text = haystack(deal)
  let score = 0
  for (const token of tokens) {
    if (!fuzzyMatch(text, token)) return null
    // fuzzyScore: cang NHO cang khop sat (xem src/lib/fuzzy.ts)
    score += fuzzyScore(text, token)
  }
  return score
}

function search(deals: Deal[], raw: string): Deal[] {
  const q = raw.trim()
  if (!q) return []

  // Ma khop chinh xac thang duy nhat: khach go "#1005" tu caption thi ho muon
  // dung san pham do, khong phai mot danh sach goi y.
  const code = parseDealCode(q)
  if (code !== null) {
    const exact = deals.filter(d => d.code === code)
    if (exact.length) return exact
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  const byText = deals
    .map(d => ({ deal: d, score: matchScore(d, tokens) }))
    .filter((r): r is { deal: Deal; score: number } => r.score !== null)
    .sort((a, b) => a.score - b.score)
    .map(r => r.deal)

  // Dang go dan mot ma ("10" -> "1000"): hien truoc cac ma bat dau bang so vua go.
  // Van giu ket qua theo ten phia sau vi co ten san pham bat dau bang so
  // ("1500W Fat Tire E-Bike") — go "1500" phai ra ca hai kha nang.
  const digits = /^#?\d+$/.test(q) ? q.replace(/^#/, '') : null
  const byCodePrefix = digits
    ? deals.filter(d => d.code != null && String(d.code).startsWith(digits) && !byText.includes(d))
    : []

  return [...byCodePrefix, ...byText]
}

export default function LinkInBioDeals({ deals }: { deals: Deal[] }) {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => search(deals, query), [deals, query])
  const searching = query.trim().length > 0
  const visible = searching ? results : deals.slice(0, PREVIEW_COUNT)

  // Enter khi chi con 1 ket qua: vao thang san pham do. Go ma tu caption -> 1 lan
  // cham la den trang deal.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (results.length === 1 && results[0].slug) {
      inputRef.current?.blur()
      router.push(`/deals/${results[0].slug}`)
    }
  }

  return (
    <>
      <form className="lb-search" role="search" onSubmit={handleSubmit}>
        <span className="lb-search-ico" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or code (e.g. 1000)"
          aria-label="Search deals by product name or product code"
          autoComplete="off"
          enterKeyHint="search"
        />
        {searching && (
          <button
            type="button"
            className="lb-search-clear"
            aria-label="Clear search"
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
          >
            &times;
          </button>
        )}
      </form>

      <div className="lb-sec">
        <span className="lb-sec-t">{searching ? 'Results' : 'Latest deals'}</span>
        <span className="lb-sec-line" />
        {searching && (
          <span className="lb-count" aria-live="polite">
            {results.length} of {deals.length}
          </span>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="lb-list">
          {visible.map((deal, i) => {
            const badge = dealDiscountBadge(deal)
            const code = formatDealCode(deal.code)
            return (
              <Link key={deal.id} href={`/deals/${deal.slug}`} className="lb-card">
                <div className="lb-thumb">
                  {deal.imageUrl && (
                    <Image
                      src={deal.imageUrl}
                      alt={deal.title}
                      fill
                      // 2 cot: moi anh chiem ~nua chieu rong man hinh, tru
                      // padding trang va khe giua 2 cot.
                      sizes="(max-width: 520px) 45vw, 230px"
                      style={{ objectFit: 'cover' }}
                      // Anh dau tien la LCP cua trang (hero chi co chu).
                      // Trang nay nhan traffic tu bio Instagram/TikTok — gan nhu
                      // 100% la 4G tren dien thoai, nen uu tien tai no truoc.
                      priority={i === 0 && !searching}
                    />
                  )}
                  <span className="lb-badge">
                    {badge.main}{badge.sub && <i>{badge.sub}</i>}
                  </span>
                  {/* Ma hien tren card de khach doi chieu voi so trong caption,
                      va de chinh chu copy lai khi soan bai dang moi. */}
                  {code && <span className="lb-code">{code}</span>}
                </div>

                <div className="lb-body">
                  <div className="lb-title">{deal.title}</div>
                  <div className="lb-price">
                    <span className="lb-now">{deal.priceSale}</span>
                    {deal.priceOrig && <span className="lb-was">{deal.priceOrig}</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="lb-empty">
          No product matches <strong>{query.trim()}</strong>.
          <br />
          Try a shorter keyword, or the product code from our post.
          <button type="button" className="lb-empty-btn" onClick={() => { setQuery(''); inputRef.current?.focus() }}>
            Show all deals
          </button>
        </div>
      )}
    </>
  )
}
