'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

export async function saveConfigDoc(type: string, patch: Record<string, unknown>) {
  await writeClient.createIfNotExists({ _id: type, _type: type })
  const toSet: Record<string, unknown> = {}
  const toUnset: string[] = []
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) toUnset.push(key)
    else toSet[key] = value
  }
  let op = writeClient.patch(type)
  if (Object.keys(toSet).length) op = op.set(toSet)
  if (toUnset.length) op = op.unset(toUnset)
  await op.commit()
  revalidatePath('/', 'layout')
  revalidatePath('/admin/config/' + type.replace('config', '').toLowerCase())
}
