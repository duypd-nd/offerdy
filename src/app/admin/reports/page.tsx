import { writeClient } from '@/sanity/writeClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type OfferClickRow = {
  _id: string
  title: string
  clicks: number
  couponCode?: string
  storeId?: string
  storeName?: string
  storeSlug?: string
}

type StoreClickRow = {
  id: string
  name: string
  slug?: string
  directClicks: number
}

export default async function ReportsPage() {
  const [offers, stores] = await Promise.all([
    writeClient.fetch<OfferClickRow[]>(
      `*[_type == "offer" && clicks > 0] {
        _id, title, clicks, couponCode,
        "storeId": store._ref, "storeName": store->name, "storeSlug": store->slug.current
      }`
    ),
    writeClient.fetch<StoreClickRow[]>(
      `*[_type == "store"] { "id": _id, name, "slug": slug.current, "directClicks": coalesce(clicks, 0) }`
    ),
  ])

  const topOffers = [...offers].sort((a, b) => b.clicks - a.clicks).slice(0, 20)

  const storeTotals = new Map<string, { name: string; slug?: string; clicks: number }>()
  for (const s of stores) {
    storeTotals.set(s.id, { name: s.name, slug: s.slug, clicks: s.directClicks })
  }
  for (const o of offers) {
    if (!o.storeId) continue
    const entry = storeTotals.get(o.storeId)
    if (entry) entry.clicks += o.clicks
  }
  const topStores = [...storeTotals.values()]
    .filter(s => s.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20)

  const totalClicks = offers.reduce((sum, o) => sum + o.clicks, 0) + stores.reduce((sum, s) => sum + s.directClicks, 0)

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Báo cáo Click</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          Lượt click vào link affiliate (Get Code / Get Deal / Visit Website) — tổng cộng <b>{totalClicks}</b> lượt
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ReportTable
          title="Top Store được click nhiều nhất"
          emptyText="Chưa có lượt click nào"
          rows={topStores.map(s => ({
            label: s.name,
            href: s.slug ? `/stores/${s.slug}` : undefined,
            clicks: s.clicks,
          }))}
        />
        <ReportTable
          title="Top Offer được click nhiều nhất"
          emptyText="Chưa có lượt click nào"
          rows={topOffers.map(o => ({
            label: o.title,
            sub: o.storeName,
            href: o.storeSlug ? `/stores/${o.storeSlug}` : undefined,
            clicks: o.clicks,
          }))}
        />
      </div>
    </div>
  )
}

function ReportTable({ title, rows, emptyText }: {
  title: string
  emptyText: string
  rows: { label: string; sub?: string; href?: string; clicks: number }[]
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#374151' }}>
        {title}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : undefined }}>
              <td style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 28 }}>{i + 1}</td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: '#1e293b', fontWeight: 500, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.href ? (
                  <Link href={r.href} target="_blank" style={{ color: '#1e293b', textDecoration: 'none' }}>{r.label}</Link>
                ) : r.label}
                {r.sub && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {r.sub}</span>}
              </td>
              <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, color: '#16a34a', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {r.clicks}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
