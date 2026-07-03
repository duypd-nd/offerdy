import Header from './Header'
import { getSiteSettings } from '@/sanity/queries'

export default async function HeaderWrapper() {
  const settings = await getSiteSettings()
  return (
    <Header
      navLinks={settings.navigation}
      logoUrl={settings.logoUrl}
    />
  )
}
