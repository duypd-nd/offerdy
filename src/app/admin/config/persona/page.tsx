import { writeClient } from '@/sanity/writeClient'
import PersonaConfigForm from './PersonaConfigForm'

export const dynamic = 'force-dynamic'

export default async function PersonaConfigPage() {
  const data = await writeClient.fetch(`*[_type == "configPersona"][0]`)
  return <PersonaConfigForm initial={data ?? {}} />
}
