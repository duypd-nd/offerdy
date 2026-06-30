import { getLegalPage } from '../_legal/actions'
import LegalForm from '../_legal/LegalForm'

export const dynamic = 'force-dynamic'

const SECTIONS = [
  { _key: 's1', heading: 'Acceptance of Terms', body: 'By accessing or using Offerdy, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our website.' },
  { _key: 's2', heading: 'Use of Service', body: 'Offerdy provides verified coupon codes and promotional deals for informational purposes. You may use this service for personal, non-commercial purposes only. You agree not to misuse, scrape, or reproduce our content without prior written consent.' },
  { _key: 's3', heading: 'Affiliate Relationships', body: 'Offerdy participates in affiliate marketing programs. When you click a link and make a purchase, we may earn a commission at no additional cost to you. See our <a href="/affiliate-disclosure">Affiliate Disclosure</a> for full details.' },
  { _key: 's4', heading: 'Accuracy of Information', body: 'We make every effort to ensure coupon codes are valid and up-to-date. However, we cannot guarantee the accuracy, completeness, or availability of any deal. Promotional offers are subject to change by the merchant at any time.' },
  { _key: 's5', heading: 'Intellectual Property', body: 'All content on Offerdy — including text, graphics, logos, and design — is the property of Offerdy and protected by applicable copyright laws. Unauthorised use is prohibited.' },
  { _key: 's6', heading: 'Limitation of Liability', body: 'Offerdy is provided "as is" without warranties of any kind. We are not liable for any direct, indirect, or consequential damages arising from your use of this website or reliance on any information herein.' },
  { _key: 's7', heading: 'Changes to Terms', body: 'We reserve the right to update these Terms of Use at any time. Continued use of Offerdy after changes are posted constitutes your acceptance of the revised terms.' },
  { _key: 's8', heading: 'Contact', body: 'Questions about these terms? <a href="/contact">Contact us</a> and we\'ll be happy to help.' },
]

export default async function TermsAdminPage() {
  const data = await getLegalPage('configTerms')
  return (
    <LegalForm
      configId="configTerms"
      pagePath="/terms"
      adminTitle="Terms of Use"
      adminSubtitle="Nội dung tại /terms"
      initial={data}
      defaultH1="Terms of Use"
      defaultSeoTitle="Terms of Use — Offerdy"
      defaultSeoDesc="Read the Terms of Use for Offerdy. By using our coupon code platform, you agree to these terms."
      defaultSections={SECTIONS}
    />
  )
}
