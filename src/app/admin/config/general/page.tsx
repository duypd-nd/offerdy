import { writeClient } from '@/sanity/writeClient'
import GeneralConfigForm from './GeneralConfigForm'

export const dynamic = 'force-dynamic'

export default async function GeneralConfigPage() {
  const data = await writeClient.fetch(`*[_type == "configGeneral"][0]`)
  return <GeneralConfigForm initial={data ?? {}} />
}
