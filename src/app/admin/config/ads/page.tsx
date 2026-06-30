import { writeClient } from '@/sanity/writeClient'
import AdsConfigForm from './AdsConfigForm'

export const dynamic = 'force-dynamic'

export default async function AdsConfigPage() {
  const data = await writeClient.fetch(`*[_type == "configAds"][0]`)
  return <AdsConfigForm initial={data ?? {}} />
}
