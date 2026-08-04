/**
 * Cau mau cho o "quan sat duoc gi" o `/admin/coupon-tests`.
 *
 * ⚠️ **Day la TU VUNG, khong phai cau tra loi.** Khong cai nao duoc chon san,
 * khong cai nao tu dien khi bam nut ket qua, va bo trong van luu duoc. May dua ra
 * *lua chon*, nguoi dua ra *khang dinh* — do la toan bo khac biet giua mot cau
 * quan sat that va mot nhan rong.
 *
 * Ly do phai noi ro: `codeTestNote` hien CONG KHAI duoi the offer kem ngay thang,
 * tuc no la mot loi khai ve hanh vi quay thanh toan cua mot shop ben thu ba. Cung
 * ly do ma `codeTestedAt` do may chu dat chu khong nhan tu client, va ca ba truong
 * nay cam cron ghi vao (xem PROJECT_CONTEXT.md muc "Coupon tests").
 *
 * ⚠️ **Tieng Anh, khong phai tieng Viet.** Phan cong tac ngon ngu cua du an:
 * trang public 100% tieng Anh, `/admin/*` tieng Viet. Cau nay thuoc ve trang
 * public — no in ra cho nguoi mua o My/EU doc. Cai nhan quanh o nhap thi tieng
 * Viet vi do la phan nguoi van hanh doc.
 */
export const NOTE_PHRASES = [
  'valid on all products sitewide',
  'valid sitewide',
  'applies to all items',
  'no minimum order required',
  'minimum order required',
  'not valid on sale items',
  'new customers only',
  "can't be combined with other offers",
  'code had expired',
] as const

const SEP = ', '

/** Tach ghi chu thanh cac manh da chuan hoa. Bo manh rong de "a, , b" khong sinh ra rac. */
function parts(note: string): string[] {
  return note.split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * Manh nay da nam trong ghi chu chua?
 *
 * So khop theo MANH da tach chu khong phai `includes()` tren ca chuoi: "minimum
 * order required" la chuoi con cua "no minimum order required", nen `includes()`
 * se bao rang da chon ca hai trong khi nguoi dung chi chon mot — va bam vao cai
 * con lai se go nham manh kia.
 */
export function hasPhrase(note: string, phrase: string): boolean {
  return parts(note).includes(phrase)
}

/**
 * Bam mot cau mau: chua co thi them vao cuoi, co roi thi go ra.
 *
 * Giu nguyen chu nguoi dung tu go — ghi chu van la mot o van ban tu do, cau mau
 * chi la duong tat. Bam hai lan khong nhan doi.
 */
export function togglePhrase(note: string, phrase: string): string {
  const list = parts(note)
  const i = list.indexOf(phrase)
  if (i >= 0) list.splice(i, 1)
  else list.push(phrase)
  return list.join(SEP)
}
