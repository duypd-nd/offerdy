import { writeClient } from '@/sanity/writeClient'
import ContentConfigForm from './ContentConfigForm'

export const dynamic = 'force-dynamic'

export default async function ContentConfigPage() {
  const data = await writeClient.fetch(`*[_type == "configContent"][0]`)
  return <ContentConfigForm initial={data ?? {}} />
}
