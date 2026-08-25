import { client as readClient } from '@/sanity/client'
import { getSiteName } from '@/sanity/queries'
import SEOConfigForm from './SEOConfigForm'

export const dynamic = 'force-dynamic'

export default async function SEOConfigPage() {
  const data = await readClient.fetch(`*[_type == "configSEO"][0]`)
  return <SEOConfigForm initial={data ?? {}} siteName={await getSiteName()} />
}
