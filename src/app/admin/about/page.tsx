import { getAboutPage } from './actions'
import AboutForm from './AboutForm'

export const dynamic = 'force-dynamic'

export default async function AboutAdminPage() {
  const data = await getAboutPage()
  return <AboutForm initial={data} />
}
