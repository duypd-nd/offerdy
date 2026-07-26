import { client as readClient } from '@/sanity/client'
import ContentConfigForm from './ContentConfigForm'

export const dynamic = 'force-dynamic'

export default async function ContentConfigPage() {
  const data = await readClient.fetch(`*[_type == "configContent"][0]`)
  return <ContentConfigForm initial={data ?? {}} />
}
