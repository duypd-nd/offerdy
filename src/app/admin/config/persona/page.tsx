// ⚠️ Doc bang `writeClient` (useCdn: false) chu KHONG phai client mac dinh.
// Trang vua-ghi-vua-doc: luu xong tai lai, CDN cua Sanity con tra ban cu nen dau
// vua sua trong nhu bi mat. Bay nay da can hai lan; `/admin/config/general` da
// doi tu 25/08, day la phan con lai cua nhom.
import { writeClient } from '@/sanity/writeClient'
import PersonaConfigForm from './PersonaConfigForm'

export const dynamic = 'force-dynamic'

export default async function PersonaConfigPage() {
  const data = await writeClient.fetch(`*[_type == "configPersona"][0]`)
  return <PersonaConfigForm initial={data ?? {}} />
}
