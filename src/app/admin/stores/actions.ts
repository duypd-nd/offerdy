'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'
import { revalidateStoreHostConsumers } from '@/lib/revalidateStoreHosts'
import { recordAudit, describeDoc } from '@/lib/adminAudit'

/** Trang rieng cua store, cong them moi noi doc bang `store-hosts` dung chung. */
function revalidateStoreDependents() {
  revalidatePath('/admin/stores')
  revalidatePath('/stores')
  revalidatePath('/stores/[slug]', 'page')
  revalidateStoreHostConsumers()
}

export async function updateStore(id: string, patch: Record<string, unknown>) {
  // O trong phai co nghia la "tra ve mac dinh", nen tach thanh unset thay vi set.
  //
  // ⚠️ Phai bat CA null LAN undefined: payload cua server action duoc React Flight
  // ma hoa, va `undefined` di qua ranh gioi do thi den noi thanh `null`. Da kiem
  // chung bang cach bat goi tin that — xoa trang o Max% gui len
  // {"published":true,"maxOffer":null,...}. Chi kiem tra `=== undefined` thi nhanh
  // nay khong bao gio chay.
  const set: Record<string, unknown> = {}
  const unset: string[] = []
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) unset.push(key)
    else set[key] = value
  }

  let tx = writeClient.patch(id)
  if (Object.keys(set).length) tx = tx.set(set)
  if (unset.length) tx = tx.unset(unset)
  await tx.commit()
  revalidateStoreDependents()
}

export async function deleteStore(id: string): Promise<{ ok: boolean; error?: string; deletedOfferCount?: number }> {
  try {
    // Offer -> Store la strong reference nen Sanity chan xoa store con offer gan vao.
    // Xoa ca offer lien quan trong cung 1 transaction, tranh de lai offer "mo coi"
    // hien thi sai tren web cong khai (dung y canh bao da co san o UI xac nhan).
    const label = await describeDoc(id)
    const offerIds: string[] = await writeClient.fetch(`*[_type == "offer" && references($id)]._id`, { id })
    const tx = writeClient.transaction()
    for (const offerId of offerIds) tx.delete(offerId)
    tx.delete(id)
    await tx.commit()

    // So offer bi cuon theo la phan quan trong nhat cua muc nhat ky nay: xoa
    // mot store co the am tham xoa hang chuc offer, va do la thu nguoi ta se
    // muon tra lai dung mot thang sau.
    await recordAudit({
      action: 'store.delete',
      target: id,
      label: offerIds.length ? `${label ?? id} · kéo theo ${offerIds.length} offer` : label,
    })

    revalidateStoreDependents()
    revalidatePath('/admin/offers')
    revalidatePath('/admin/coupon-codes')
    revalidatePath('/coupon-codes')
    return { ok: true, deletedOfferCount: offerIds.length }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function createStore(data: {
  name: string
  slug: string
  website?: string
  affiliateLink?: string
  category?: string
  maxOffer?: number
  abbr?: string
  shortDescription?: string
  description?: string
  published: boolean
}) {
  const doc = await writeClient.create({
    _type: 'store',
    ...data,
    slug: { _type: 'slug', current: data.slug },
  })
  // Tao store cung phai lam moi trang deal: mot store MOI co the la thu duy nhat
  // con thieu de hang chuc deal san co duoc gan ma ref. Do dung 2026-08-04 —
  // tao store Cloud Cushion Slides la 35 deal co san lap tuc gan duoc ref.
  revalidateStoreDependents()
  return doc
}

export async function uploadStoreImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file || file.size === 0) return null
  const asset = await writeClient.assets.upload('image', file, {
    filename: file.name,
    contentType: file.type,
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}

export async function getStoreDescription(id: string): Promise<string | undefined> {
  const result = await writeClient.fetch<{ description?: string } | null>(
    `*[_id == $id][0]{ description }`,
    { id }
  )
  return result?.description
}

export async function checkStoreSlug(slug: string, excludeId?: string): Promise<boolean> {
  if (!slug) return false
  const q = excludeId
    ? `*[_type == "store" && slug.current == $slug && _id != $excludeId][0]._id`
    : `*[_type == "store" && slug.current == $slug][0]._id`
  const res = await writeClient.fetch(q, { slug, excludeId: excludeId ?? null })
  return !!res
}

export async function uploadStoreImageFromUrl(url: string) {
  if (!url) return null
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Không tải được ảnh từ URL: ${res.status}`)
  const blob = await res.blob()
  const filename = url.split('/').pop()?.split('?')[0] || 'logo.jpg'
  const asset = await writeClient.assets.upload('image', blob, {
    filename,
    contentType: blob.type || 'image/jpeg',
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}
