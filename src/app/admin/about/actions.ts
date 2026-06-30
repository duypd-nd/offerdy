'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

export type AboutData = {
  h1?: string
  heroLead?: string
  storyQuote?: string
  storyBody?: string
  founderName?: string
  foundingYear?: string
  stats?: { _key: string; num: string; label: string }[]
  verifyHeading?: string
  verifyLead?: string
  steps?: { _key: string; title: string; desc: string }[]
  coverageHeading?: string
  categories?: { _key: string; title: string; desc: string }[]
  promiseTitle?: string
  promiseBody?: string
  seoTitle?: string
  seoDescription?: string
  showStory?: boolean
  showStats?: boolean
  showCoverage?: boolean
  indexPage?: boolean
}

export async function saveAboutPage(data: AboutData) {
  await writeClient.createIfNotExists({ _id: 'configAbout', _type: 'configAbout' })
  await writeClient.patch('configAbout').set(data).commit()
  revalidatePath('/about')
  revalidatePath('/admin/about')
}

export async function getAboutPage(): Promise<AboutData> {
  const doc = await writeClient.fetch(`*[_id == "configAbout"][0]`)
  return doc ?? {}
}
