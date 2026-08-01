'use server'

import { writeClient } from '@/sanity/writeClient'

// ⚠️ Day la duong GHI mo cho nguoi la: bat ky ai vao trang store deu goi duoc.
// Vi vay moi ban ghi deu phai qua kiem tra o duoi, va khong bao gio tra ve chi
// tiet loi cho client (khong lo cau truc du lieu cho nguoi do tim).
//
// Han che con lai, ghi ra de sau nay khong tuong da an toan tuyet doi: chua co
// gioi han theo IP. Mot script co the tao nhieu ban ghi voi email khac nhau. Chan
// duoc that su thi can captcha hoac rate limit o tang ha tang; hien tai doi lay
// su don gian, va hau qua xau nhat la rac trong /admin/coupon-alerts chu khong
// pham gi toi du lieu dang song.

const EMAIL_MAX = 254 // gioi han do dai dia chi email theo RFC 5321
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function subscribeCouponAlert(input: {
  email: string
  storeId: string
  storeName: string
}): Promise<{ ok: boolean; already?: boolean; error?: string }> {
  const email = (input.email ?? '').trim().toLowerCase()
  const { storeId, storeName } = input

  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' }
  }
  if (!storeId) return { ok: false, error: 'Something went wrong. Please try again.' }

  try {
    // Dang ky lai cung mot email cho cung mot store thi coi nhu da co — tra ve
    // thanh cong chu khong bao loi: nguoi dung khong lam gi sai, va bao loi o day
    // chi khien ho tuong minh chua dang ky duoc roi bam them lan nua.
    const existing = await writeClient.fetch<string | null>(
      `*[_type == "couponAlert" && email == $email && store._ref == $storeId][0]._id`,
      { email, storeId }
    )
    if (existing) return { ok: true, already: true }

    await writeClient.create({
      _type: 'couponAlert',
      email,
      store: { _type: 'reference', _ref: storeId, _weak: true },
      storeName,
      createdAt: new Date().toISOString(),
    })
    return { ok: true }
  } catch {
    // Nuot chi tiet loi co chu dich. Nguoi dung chi can biet la chua luu duoc.
    return { ok: false, error: 'Could not save your email right now. Please try again later.' }
  }
}
