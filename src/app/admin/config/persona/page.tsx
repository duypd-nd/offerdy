import { client as readClient } from '@/sanity/client'
import PersonaConfigForm from './PersonaConfigForm'

export const dynamic = 'force-dynamic'

export default async function PersonaConfigPage() {
  const data = await readClient.fetch(`*[_type == "configPersona"][0]`)
  return <PersonaConfigForm initial={data ?? {}} />
}
