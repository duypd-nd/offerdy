import type { Metadata } from 'next'
import { getSiteName } from '@/sanity/queries'

// Cong cu noi bo: khong de Google lap chi muc, va khong nam trong sitemap.ts.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Đo lường trên máy này — ${await getSiteName()}`,
    robots: { index: false, follow: false },
  }
}

export default function NoTrackLayout({ children }: { children: React.ReactNode }) {
  return children
}
