import { getLegalPage } from '../_legal/actions'
import LegalForm from '../_legal/LegalForm'

export const dynamic = 'force-dynamic'

const SECTIONS = [
  { _key: 's1', heading: 'What Are Cookies?', body: 'Cookies are small text files placed on your device when you visit a website. They help websites remember your preferences, understand how you use the site, and improve your experience.' },
  { _key: 's2', heading: 'Cookies We Use', body: '<strong>Analytics cookies</strong> — We use Google Analytics to understand how visitors interact with Offerdy (pages viewed, time on site, referring sources). This data is aggregated and anonymous.<br><br><strong>Affiliate tracking cookies</strong> — When you click a deal link, a tracking cookie is set by the merchant or affiliate network. This allows us to earn a commission if a purchase is made. These cookies do not identify you personally.<br><br><strong>Preference cookies</strong> — We may store basic preferences (such as recently viewed deals) to improve your experience.' },
  { _key: 's3', heading: 'Third-Party Cookies', body: 'Advertisers and affiliate networks may also set cookies when you click their links. Offerdy does not control third-party cookies. Please review the privacy policies of those services for more information.' },
  { _key: 's4', heading: 'Managing Cookies', body: 'You can control and delete cookies through your browser settings. Disabling cookies may affect some features of Offerdy. Most browsers allow you to:<br><ul><li>View cookies that have been set</li><li>Block cookies from specific sites</li><li>Block third-party cookies</li><li>Clear all cookies when you close your browser</li></ul>' },
  { _key: 's5', heading: 'Contact', body: 'Questions about our use of cookies? <a href="/contact">Contact us</a>.' },
]

export default async function CookiesAdminPage() {
  const data = await getLegalPage('configCookies')
  return (
    <LegalForm
      configId="configCookies"
      pagePath="/cookies"
      adminTitle="Cookie Policy"
      adminSubtitle="Nội dung tại /cookies"
      initial={data}
      defaultH1="Cookie Policy"
      defaultSeoTitle="Cookie Policy — Offerdy"
      defaultSeoDesc="Learn how Offerdy uses cookies for analytics and affiliate tracking, and how to manage your cookie preferences."
      defaultSections={SECTIONS}
    />
  )
}
