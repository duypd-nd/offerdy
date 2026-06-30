import { getSubmitDealPage } from './actions'
import SubmitDealForm from './SubmitDealForm'

export const dynamic = 'force-dynamic'

export default async function SubmitDealAdminPage() {
  const data = await getSubmitDealPage()
  return <SubmitDealForm initial={data} />
}
