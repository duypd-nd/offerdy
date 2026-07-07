import { getMerchantHealthData } from '@/sanity/queries'
import MerchantHealthAdmin from './MerchantHealthAdmin'

export const dynamic = 'force-dynamic'

export default async function MerchantHealthPage() {
  const stores = await getMerchantHealthData()
  return <MerchantHealthAdmin stores={stores} />
}
