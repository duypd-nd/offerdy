import { getPartnerPage } from './actions'
import PartnerForm from './PartnerForm'

export const dynamic = 'force-dynamic'

export default async function PartnerAdminPage() {
  const data = await getPartnerPage()
  return <PartnerForm initial={data} />
}
