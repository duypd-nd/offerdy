import { writeClient } from '@/sanity/writeClient'
import SocialConfigForm from './SocialConfigForm'

export const dynamic = 'force-dynamic'

export default async function SocialConfigPage() {
  const data = await writeClient.fetch(`*[_type == "configSocial"][0]`)
  return <SocialConfigForm initial={data ?? {}} />
}
