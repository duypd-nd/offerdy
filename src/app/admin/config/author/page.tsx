import { writeClient } from '@/sanity/writeClient'
import AuthorConfigForm from './AuthorConfigForm'

export const dynamic = 'force-dynamic'

export default async function AuthorConfigPage() {
  const data = await writeClient.fetch(`*[_type == "configAuthor"][0]`)
  return <AuthorConfigForm initial={data ?? {}} />
}
