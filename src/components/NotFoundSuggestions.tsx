'use client'

/**
 * Goi y noi dung con song tren trang 404, dua tren chinh duong dan bi hong.
 *
 * VI SAO: 24 trong 28 luot bam tu Google (thang 7/2026) roi vao 404 — cac URL
 * store/review da xoa ma Google con xep hang. Ho vua go mot thu rat cu the roi
 * bam vao; tra ho hai nut "Browse Deals / Go Home" la vut di gan het luong khach
 * tu nhien it oi cua site.
 *
 * Vi sao la CLIENT component chu khong doc duong dan o server: `not-found.tsx`
 * cua App Router khong nhan duoc pathname, va moi cach de lay no o server deu
 * keo theo viec render mot trang binh thuong — tuc tra ve **200 thay vi 404**,
 * bien loi that thanh soft-404 va khien Google giu URL da chet trong chi muc
 * mai mai. Doc `window.location` giu nguyen ma 404 do server da tra.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { slugKeywords, slugLabel, matchesKeyword } from '@/lib/slugKeywords'

type SuggestItem = { name: string; sub: string; icon: string; imageUrl?: string; url: string }
type Suggestions = { stores: SuggestItem[]; deals: SuggestItem[]; reviews: SuggestItem[]; posts: SuggestItem[] }

const EMPTY: Suggestions = { stores: [], deals: [], reviews: [], posts: [] }

export default function NotFoundSuggestions() {
  // `usePathname` chu khong `window.location`: no chay duoc ca luc render tren
  // server, nen nhan hien thi khong nhay tu rong sang co. Nhan la gia tri DAN
  // XUAT, khong phai state — dat state cho no se la mot lan render thua.
  const pathname = usePathname()
  const label = slugLabel(pathname)
  const [items, setItems] = useState<SuggestItem[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    const keywords = slugKeywords(pathname)

    // Moi lenh dat state deu nam trong ham bat dong bo: dat state ngay trong
    // than effect la thu ESLint cua du an nay chan (react-hooks/set-state-in-effect).
    ;(async () => {
      if (keywords.length === 0) { if (!cancelled) setDone(true); return }
      // Thu tung tu khoa cho den khi co ket qua: `fuzzyMatch` so khop theo tung
      // tu, nen tu dac trung nhat (dai nhat) co co hoi cao nhat — nhung neu no
      // la ten rieng da bi xoa han thi phai lui ve tu chung hon.
      for (const q of keywords) {
        try {
          const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`)
          if (!res.ok) continue
          const data: Suggestions = { ...EMPTY, ...(await res.json()) }
          const merged = [...data.stores, ...data.reviews, ...data.deals, ...data.posts]
            // API dung `fuzzyMatch`, vong nay siet lai: phai khop tu DAU MOT TU.
            // Khong co no thi "/stores/pollo-ai" duoc goi y "Apollo Moda".
            .filter(item => matchesKeyword(item.name, q))
            .slice(0, 6)
          if (cancelled) return
          if (merged.length > 0) { setItems(merged); break }
        } catch { /* mang loi -> thu tu tiep theo */ }
      }
      if (!cancelled) setDone(true)
    })()

    return () => { cancelled = true }
  }, [pathname])

  // Chua tra loi xong thi khong hien gi — mot khoi "dang tim..." nhay len roi
  // bien mat con gay nhieu hon la khong co.
  if (!done && items.length === 0) return null

  return (
    <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid #E8EEF6' }}>
      {items.length > 0 ? (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>
            {label ? <>Looking for <span style={{ color: 'var(--muted)' }}>{label}</span>? These are live right now:</> : 'These are live right now:'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(item => (
              <Link
                key={item.url + item.name}
                href={item.url}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                  border: '1px solid #E8EEF6', background: '#F8FAFC',
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#fff', border: '1px solid #E8EEF6',
                  fontSize: 12, fontWeight: 800, color: 'var(--navy)', overflow: 'hidden',
                }}>
                  {/* Anh shop neu co; khong thi dung chu viet tat / emoji san co */}
                  {item.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : item.icon}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--light)' }}>{item.sub}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      ) : (
        label && (
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            We no longer carry <strong style={{ color: 'var(--navy)' }}>{label}</strong>.{' '}
            <Link href={`/search?q=${encodeURIComponent(label)}`} style={{ color: 'var(--green-dark, #15803d)', fontWeight: 600 }}>
              Search the whole site →
            </Link>
          </div>
        )
      )}
    </div>
  )
}
