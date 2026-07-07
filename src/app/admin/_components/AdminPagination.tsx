'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function AdminPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const hrefFor = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (p <= 1) params.delete('page')
    else params.set('page', String(p))
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const goTo = (p: number) => router.push(hrefFor(Math.max(1, Math.min(p, totalPages))))

  return (
    <div className="oa-pagination">
      <button className="oa-page-btn" onClick={() => goTo(1)} disabled={page === 1} title="Trang đầu">«</button>
      <button className="oa-page-btn" onClick={() => goTo(page - 1)} disabled={page === 1}>← Trước</button>
      <span className="oa-page-info">{page} / {totalPages}</span>
      <button className="oa-page-btn" onClick={() => goTo(page + 1)} disabled={page === totalPages}>Sau →</button>
      <button className="oa-page-btn" onClick={() => goTo(totalPages)} disabled={page === totalPages} title="Trang cuối">»</button>
    </div>
  )
}
