import { writeClient } from '@/sanity/writeClient'
import SEOConfigForm from './SEOConfigForm'

export const dynamic = 'force-dynamic'

export default async function SEOConfigPage() {
  const data = await writeClient.fetch(`*[_type == "configSEO"][0]`)
  return <SEOConfigForm initial={data ?? {}} />
}
