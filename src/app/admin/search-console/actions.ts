'use server'

import { inspectUrl, type UrlInspectResult } from '@/lib/urlInspection'

/**
 * MOT URL mot lan goi — co y khong nhan ca mang.
 *
 * Du 12 URL nghe khong nhieu, du an nay da tra hoc phi cho bai hoc do hai lan
 * (`ai-content-nightly`, roi quet deep-link ca loat): gom nhieu luot goi mang vao
 * mot server action thi het gio la function bi giet giua chung va mat sach ket
 * qua da lam duoc. Goi le thi moi URL tu chot ket qua cua no, va nguoi van hanh
 * nhin thay tien do that thay vi mot vong xoay im lang.
 */
export async function inspectOneUrl(url: string): Promise<UrlInspectResult> {
  return inspectUrl(url, new Date())
}
