// ⚠️ Doc bang `writeClient` (useCdn: false) chu KHONG phai `readClient`.
// Day la trang vua-ghi-vua-doc: luu xong roi tai lai, CDN cua Sanity con
// tra ban cu nen ten vua doi trong nhu bi mat. Bay nay da can hai lan.
import { writeClient } from '@/sanity/writeClient'
import GeneralConfigForm from './GeneralConfigForm'

export const dynamic = 'force-dynamic'

export default async function GeneralConfigPage() {
  const data = await writeClient.fetch(`*[_type == "configGeneral"][0]`)
  return <GeneralConfigForm initial={data ?? {}} />
}
