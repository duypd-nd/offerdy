import Header from './Header'
import { getSiteSettings, getSearchableContent } from '@/sanity/queries'

export default async function HeaderWrapper() {
  const [settings, searchableContent] = await Promise.all([
    getSiteSettings(),
    getSearchableContent(),
  ])
  return (
    <Header
      navLinks={settings.navigation}
      logoUrl={settings.logoUrl}
      searchableContent={searchableContent}
    />
  )
}
