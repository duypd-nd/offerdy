import { client as readClient } from '@/sanity/client'
import AuthorConfigForm from './AuthorConfigForm'

export const dynamic = 'force-dynamic'

export default async function AuthorConfigPage() {
  const data = await readClient.fetch(`*[_type == "configAuthor"][0]`)
  return <AuthorConfigForm initial={data ?? {}} />
}
