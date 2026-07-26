import { client as readClient } from '@/sanity/client'
import AdsConfigForm from './AdsConfigForm'

export const dynamic = 'force-dynamic'

export default async function AdsConfigPage() {
  const data = await readClient.fetch(`*[_type == "configAds"][0]`)
  return <AdsConfigForm initial={data ?? {}} />
}
