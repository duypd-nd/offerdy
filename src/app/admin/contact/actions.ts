'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

export type FaqItem = { _key: string; question: string; answer: string }

export type ContactData = {
  h1?: string
  heroLead?: string
  email?: string
  responseTime?: string
  phone?: string
  address?: string
  formHeading?: string
  formDesc?: string
  formAction?: string
  showFaq?: boolean
  faqHeading?: string
  faqItems?: FaqItem[]
  seoTitle?: string
  seoDescription?: string
  indexPage?: boolean
}

export async function saveContactPage(data: ContactData) {
  await writeClient.createIfNotExists({ _id: 'configContact', _type: 'configContact' })
  await writeClient.patch('configContact').set(data).commit()
  revalidatePath('/contact')
  revalidatePath('/admin/contact')
}

export async function getContactPage(): Promise<ContactData> {
  const doc = await writeClient.fetch(`*[_id == "configContact"][0]`)
  return doc ?? {}
}
