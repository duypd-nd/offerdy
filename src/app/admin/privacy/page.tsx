import { getLegalPage } from '../_legal/actions'
import LegalForm from '../_legal/LegalForm'

export const dynamic = 'force-dynamic'

const SECTIONS = [
  { _key: 's1', heading: 'Information We Collect', body: 'We collect information you provide directly (such as when you contact us) and automatically (such as pages visited, referring URLs, and browser type). We do not collect personally identifiable information unless you voluntarily provide it.' },
  { _key: 's2', heading: 'How We Use Your Information', body: 'We use collected information to improve our service, respond to enquiries, analyse site usage, and personalise your experience. We do not sell your personal data to third parties.' },
  { _key: 's3', heading: 'Cookies and Tracking', body: 'Offerdy uses cookies for analytics and to track affiliate referrals. See our <a href="/cookies">Cookie Policy</a> for detailed information on the cookies we use and how to manage them.' },
  { _key: 's4', heading: 'Third-Party Services', body: 'We use third-party services including Google Analytics and affiliate networks. These services may collect information according to their own privacy policies. Links to third-party sites are not covered by this policy.' },
  { _key: 's5', heading: 'Affiliate Tracking', body: 'When you click a deal link, an affiliate tracking cookie may be set. This allows us to receive a commission if you make a purchase. It does not identify you personally. See our <a href="/affiliate-disclosure">Affiliate Disclosure</a>.' },
  { _key: 's6', heading: 'Data Security', body: 'We take reasonable measures to protect information collected via this site. However, no internet transmission is completely secure, and we cannot guarantee absolute security.' },
  { _key: 's7', heading: 'Your Rights', body: 'Depending on your location, you may have rights regarding your personal data, including the right to access, correct, or delete it. To exercise these rights, <a href="/contact">contact us</a>.' },
  { _key: 's8', heading: 'Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will post the updated date at the top of this page. Continued use of Offerdy constitutes acceptance of any changes.' },
  { _key: 's9', heading: 'Contact', body: 'For privacy-related enquiries, <a href="/contact">contact us</a> and we\'ll respond within 24 hours.' },
]

export default async function PrivacyAdminPage() {
  const data = await getLegalPage('configPrivacy')
  return (
    <LegalForm
      configId="configPrivacy"
      pagePath="/privacy"
      adminTitle="Privacy Policy"
      adminSubtitle="Nội dung tại /privacy"
      initial={data}
      defaultH1="Privacy Policy"
      defaultSeoTitle="Privacy Policy — Offerdy"
      defaultSeoDesc="Read Offerdy's Privacy Policy. We explain what data we collect, how we use it, and your rights."
      defaultSections={SECTIONS}
    />
  )
}
