/**
 * Dong goi nhieu tep thanh MOT tep .zip — khong nen, chi xep canh nhau.
 *
 * ── VI SAO TU VIET CHU KHONG CAI THU VIEN ─────────────────────────
 *
 * Viec can lam chi la "bam mot cai tai het anh ve dien thoai". Anh JPEG/WebP da
 * duoc nen san roi, nen nen them mot lan nua vua ton CPU vua gan nhu khong giam
 * duoc byte nao — tuc phan DUY NHAT ma mot thu vien nen mang lai la thu ta khong
 * dung toi. Con dinh dang ZIP "store" thi co dinh va ngan: mot dau muc truoc moi
 * tep, mot bang thu muc o cuoi, va mot ban ghi ket. Ba thu do la het.
 *
 * ⚠️ CHI dung `store` (khong nen). Neu mot ngay nao do can nen thi phai doi CA
 * `method` lan `crc32`/kich thuoc trong CA HAI cho — dau muc va bang thu muc —
 * quen mot cho la tep zip mo duoc tren Windows nhung hong tren dien thoai.
 */

/**
 * Bang tra CRC-32 (da thuc IEEE 802.3), dung san mot lan.
 *
 * ⚠️ CRC PHAI DUNG. Windows van mo duoc tep zip co CRC sai, nhung bo giai nen
 * cua Android va iOS thi tu choi — tuc loi chi lo ra tren dung cai may nguoi
 * dung dinh dung.
 */
const BANG_CRC = (() => {
  const b = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    b[i] = c >>> 0
  }
  return b
})()

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = BANG_CRC[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export type TepZip = { ten: string; data: Uint8Array }

/**
 * Ten tep an toan trong zip.
 *
 * Bo dau gach cheo va `..` de mot ten do noi khac dua toi khong the ghi ra ngoai
 * thu muc giai nen. Giu chu cai, so, gach ngang, gach duoi va dau cham.
 */
export function tenAnToan(ten: string, duPhong = 'tep'): string {
  const t = String(ten ?? '')
    .replace(/[\\/]/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .slice(0, 80)
  return t && t !== '.' ? t : duPhong
}

const so2 = (n: number) => Uint8Array.from([n & 0xff, (n >>> 8) & 0xff])
const so4 = (n: number) => Uint8Array.from([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])

const noi = (phan: Uint8Array[]): Uint8Array => {
  const tong = phan.reduce((n, p) => n + p.length, 0)
  const ra = new Uint8Array(tong)
  let i = 0
  for (const p of phan) { ra.set(p, i); i += p.length }
  return ra
}

/**
 * Dong goi. Ten trung nhau duoc them so thu tu — hai anh cung ten trong mot tep
 * zip lam bo giai nen ghi de len nhau, tuc mat anh ma khong bao gi.
 */
export function zipStore(tep: TepZip[]): Uint8Array {
  const daDung = new Set<string>()
  const muc: Uint8Array[] = []
  const thuMuc: Uint8Array[] = []
  let viTri = 0

  for (const t of tep) {
    let ten = tenAnToan(t.ten)
    if (daDung.has(ten)) {
      const cham = ten.lastIndexOf('.')
      const goc = cham > 0 ? ten.slice(0, cham) : ten
      const duoi = cham > 0 ? ten.slice(cham) : ''
      let k = 2
      while (daDung.has(`${goc}-${k}${duoi}`)) k++
      ten = `${goc}-${k}${duoi}`
    }
    daDung.add(ten)

    const tenByte = new TextEncoder().encode(ten)
    const crc = crc32(t.data)

    // Dau muc dat ngay truoc du lieu cua tep do.
    const dauMuc = noi([
      so4(0x04034b50),           // chu ky
      so2(20), so2(0), so2(0),   // can ban 2.0 · khong co co · phuong phap 0 = store
      so2(0), so2(0),            // gio va ngay — de 0, khong ai doc toi
      so4(crc), so4(t.data.length), so4(t.data.length),
      so2(tenByte.length), so2(0),
      tenByte,
    ])
    muc.push(dauMuc, t.data)

    // Ban ghi tuong ung trong bang thu muc o cuoi tep.
    thuMuc.push(noi([
      so4(0x02014b50),
      so2(20), so2(20), so2(0), so2(0),
      so2(0), so2(0),
      so4(crc), so4(t.data.length), so4(t.data.length),
      so2(tenByte.length), so2(0), so2(0),
      so2(0), so2(0), so4(0),
      so4(viTri),                // ⚠️ vi tri cua DAU MUC, khong phai cua du lieu
      tenByte,
    ]))
    viTri += dauMuc.length + t.data.length
  }

  const banThuMuc = noi(thuMuc)
  const ketThuc = noi([
    so4(0x06054b50),
    so2(0), so2(0),
    so2(tep.length), so2(tep.length),
    so4(banThuMuc.length), so4(viTri),
    so2(0),
  ])
  return noi([...muc, banThuMuc, ketThuc])
}
