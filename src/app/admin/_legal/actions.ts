'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

export type LegalSection = { _key: string; heading: string; body: string }

export type LegalData = {
  h1?: string
  lastUpdated?: string
  intro?: string
  sections?: LegalSection[]
  seoTitle?: string
  seoDescription?: string
  indexPage?: boolean
}

export async function saveLegalPage(configId: string, pagePath: string, data: LegalData) {
  await writeClient.createIfNotExists({ _id: configId, _type: configId })
  await writeClient.patch(configId).set(data).commit()
  revalidatePath(pagePath)
  revalidatePath(`/admin/${pagePath.replace('/', '')}`)
}

export async function getLegalPage(configId: string): Promise<LegalData> {
  const doc = await writeClient.fetch(`*[_id == $id][0]`, { id: configId })
  return doc ?? {}
}
