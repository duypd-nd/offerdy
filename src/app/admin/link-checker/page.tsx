import { writeClient } from '@/sanity/writeClient'
import LinkCheckerClient from './LinkCheckerClient'

export const dynamic = 'force-dynamic'

export type LinkItem = {
  offerId: string
  title: string
  link: string
  storeName?: string
  storeSlug?: string
}

export default async function LinkCheckerPage() {
  const items = await writeClient.fetch<LinkItem[]>(
    `*[_type == "offer" && active == true && defined(link) && link != ""] {
      "offerId": _id, title, link,
      "storeName": store->name, "storeSlug": store->slug.current
    } | order(storeName asc)`
  )

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Kiểm tra Link Chết</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          Quét {items.length} offer đang hoạt động để tìm link bị hỏng (404, timeout, lỗi kết nối)
        </p>
      </div>
      <LinkCheckerClient items={items} />
    </div>
  )
}
