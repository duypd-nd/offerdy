import { client as readClient } from '@/sanity/client'
import GeneralConfigForm from './GeneralConfigForm'

export const dynamic = 'force-dynamic'

export default async function GeneralConfigPage() {
  const data = await readClient.fetch(`*[_type == "configGeneral"][0]`)
  return <GeneralConfigForm initial={data ?? {}} />
}
