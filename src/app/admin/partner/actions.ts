'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

export type Benefit = { _key: string; title: string; desc: string }

export type PartnerData = {
  h1?: string
  heroLead?: string
  benefitsHeading?: string
  benefits?: Benefit[]
  ctaHeading?: string
  ctaBody?: string
  contactEmail?: string
  seoTitle?: string
  seoDescription?: string
  indexPage?: boolean
}

export async function savePartnerPage(data: PartnerData) {
  await writeClient.createIfNotExists({ _id: 'configPartner', _type: 'configPartner' })
  await writeClient.patch('configPartner').set(data).commit()
  revalidatePath('/partner')
  revalidatePath('/admin/partner')
}

export async function getPartnerPage(): Promise<PartnerData> {
  const doc = await writeClient.fetch(`*[_id == "configPartner"][0]`)
  return doc ?? {}
}
