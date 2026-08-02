import type { Metadata } from 'next'

// Cong cu noi bo: khong de Google lap chi muc, va khong nam trong sitemap.ts.
export const metadata: Metadata = {
  title: 'Đo lường trên máy này — Offerdy',
  robots: { index: false, follow: false },
}

export default function NoTrackLayout({ children }: { children: React.ReactNode }) {
  return children
}
