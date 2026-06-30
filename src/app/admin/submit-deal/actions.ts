'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

export type SubmitDealData = {
  h1?: string
  heroLead?: string
  formHeading?: string
  formDesc?: string
  formAction?: string
  steps?: { _key: string; title: string; desc: string }[]
  guidelines?: string[]
  seoTitle?: string
  seoDescription?: string
  indexPage?: boolean
}

export async function saveSubmitDealPage(data: SubmitDealData) {
  await writeClient.createIfNotExists({ _id: 'configSubmitDeal', _type: 'configSubmitDeal' })
  await writeClient.patch('configSubmitDeal').set(data).commit()
  revalidatePath('/submit-deal')
  revalidatePath('/admin/submit-deal')
}

export async function getSubmitDealPage(): Promise<SubmitDealData> {
  const doc = await writeClient.fetch(`*[_id == "configSubmitDeal"][0]`)
  return doc ?? {}
}
