import { getLegalPage } from '../_legal/actions'
import LegalForm from '../_legal/LegalForm'

export const dynamic = 'force-dynamic'

const SECTIONS = [
  { _key: 's1', heading: 'What Is Affiliate Marketing?', body: 'Affiliate marketing is a way for websites like Offerdy to earn a small commission by recommending products or services. When you click a link on Offerdy and make a purchase, the merchant may pay us a referral fee.' },
  { _key: 's2', heading: 'Our Affiliate Relationships', body: 'Offerdy participates in affiliate programs operated by retailers, affiliate networks, and other third parties. We may earn a commission when you click a link and complete a qualifying purchase. This is how we keep Offerdy free for shoppers.' },
  { _key: 's3', heading: 'No Extra Cost to You', body: 'Affiliate commissions are paid by the merchant — not by you. You never pay more by using Offerdy links. In fact, our goal is to help you pay <em>less</em> through verified coupon codes and deals.' },
  { _key: 's4', heading: 'Our Editorial Independence', body: 'Affiliate relationships do not influence which stores we feature or how we present deals. We do not accept payment for positive reviews. Codes are listed because they work — not because of any commercial arrangement.' },
  { _key: 's5', heading: 'FTC Compliance', body: 'In accordance with the FTC\'s guidelines on endorsements and testimonials, we disclose that Offerdy may receive compensation from the companies and merchants featured on this site.' },
  { _key: 's6', heading: 'Contact', body: 'Questions about our affiliate relationships? <a href="/contact">Contact us</a>.' },
]

export default async function AffiliateDisclosureAdminPage() {
  const data = await getLegalPage('configAffiliateDisclosure')
  return (
    <LegalForm
      configId="configAffiliateDisclosure"
      pagePath="/affiliate-disclosure"
      adminTitle="Affiliate Disclosure"
      adminSubtitle="Nội dung tại /affiliate-disclosure"
      initial={data}
      defaultH1="Affiliate Disclosure"
      defaultSeoTitle="Affiliate Disclosure — Offerdy"
      defaultSeoDesc="Offerdy earns affiliate commissions when you shop through our links, at no extra cost to you. Read our full affiliate disclosure."
      defaultSections={SECTIONS}
    />
  )
}
