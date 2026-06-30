import { getContactPage } from './actions'
import ContactForm from './ContactForm'

export const dynamic = 'force-dynamic'

export default async function ContactAdminPage() {
  const data = await getContactPage()
  return <ContactForm initial={data} />
}
