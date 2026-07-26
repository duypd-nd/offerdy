import { client as readClient } from '@/sanity/client'
import SEOConfigForm from './SEOConfigForm'

export const dynamic = 'force-dynamic'

export default async function SEOConfigPage() {
  const data = await readClient.fetch(`*[_type == "configSEO"][0]`)
  return <SEOConfigForm initial={data ?? {}} />
}
