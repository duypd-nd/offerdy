/**
 * Chon va xep anh truoc khi dua vao video.
 *
 * ── VI SAO KHONG PHAI MOT HAM THUAN THEO URL ───────────────────────
 *
 * Ke hoach ban dau la "loai anh nho, anh trung, anh nhieu chu" bang chinh URL.
 * Do that 38 anh cua 5 deal da dung (2026-08-22) thi ke hoach do sup:
 *
 *   · nho nhat la 800x800 — KHONG co anh nho nao de loai
 *   · ten file toan ma bam (`S3d1732983fa34edf9b077624652cc1d2Z.webp`) — khong
 *     co tu khoa `size-chart` / `banner` / `detail` nao de bat
 *   · ti le gan vuong het, tru mot anh 1500x1105 va anh thoi trang 2:3 — khong
 *     co dang banner hay infographic de nhan ra
 *   · anh trung thi `dedupeImageUrls()` da cat tu truoc
 *
 * Tuc la mot bo loc theo URL se loai dung 0 anh, ke ca cai anh can canh vai co
 * vong phong to cua deal #1470 — cai da lam hong mot canh video that. Thu duy
 * nhat phan biet duoc anh do voi mot anh doi thuc la CHINH DIEM ANH.
 *
 * ── NEN: model NHIN, code QUYET DINH ───────────────────────────────
 *
 * `judgeImages()` goi Claude nhin tung anh va tra ve nhan xet. Ham nay — thuan,
 * test duoc — cam nhan xet do roi ap chinh sach: bo cai gi, giu cai gi, xep
 * theo thu tu nao. Chinh sach nam trong code vi day la cho de sai kieu im lang:
 * mot model "hoi kho tinh" ma bo het anh thi video con 3 canh, va khong ai biet
 * cho toi luc ngoi xem lai.
 */

/** Nhan xet cua model ve MOT tam anh. Hinh dang nay dung chung voi judgeImages. */
export type DanhGiaAnh = {
  /** Chi so trong mang anh dua vao. Model tra ve chi so, khong tra ve URL. */
  index: number
  /** Anh chu yeu la chu: bang so do, chu thich ky thuat, anh ghep nhieu o chu. */
  nhieuChu: boolean
  /** Thay duoc CA mon do (khac voi anh can canh mot goc vai, mot duong chi). */
  toanCanh: boolean
  /** 0-10: hop lam nen mot canh video doc den dau. */
  diem: number
  lyDo: string
}

export type KetQuaChamAnh = {
  /** Anh da loc va xep lai, tot nhat truoc. */
  anh: string[]
  /** Anh bi bo, kem ly do — de hien o `/admin/video`. */
  bo: { url: string; lyDo: string }[]
  /** Co nhan xet cua model khong. Sai thi ham chi tra lai nguyen thu tu cu. */
  daCham: boolean
}

/** Duoi diem nay thi bo. */
const NGUONG = 4

/** Diem mac dinh cho anh model khong noi gi toi: giu, khong uu tien. */
const DIEM_MAC_DINH = 5

/**
 * ⚠️ KHONG BAO GIO tut xuong duoi nguong nay.
 *
 * `buildSpec` quay vong anh (`images[i % length]`) nen it anh khong lam video
 * ngan di — no lam mot tam anh xuat hien bon lan. Ba tam la muc con nhin duoc.
 * Tha giu mot anh tam thuong con hon giao mot video nhap nhay mot tam anh.
 */
const TOI_THIEU = 3

export function scoreImages(
  anh: string[],
  danhGia?: DanhGiaAnh[] | null,
  toiThieu = TOI_THIEU,
): KetQuaChamAnh {
  if (!anh.length) return { anh: [], bo: [], daCham: false }

  // Khong co nhan xet (goi AI hong, hoac nguoi goi khong muon cham) -> tra lai
  // nguyen thu tu cu. ⚠️ Day la duong LUI AN TOAN: mot loi mang khong duoc phep
  // lam hong video, cung khong duoc phep am tham doi thu tu anh.
  if (!danhGia?.length) return { anh: [...anh], bo: [], daCham: false }

  const theoChiSo = new Map<number, DanhGiaAnh>()
  for (const d of danhGia) {
    if (Number.isInteger(d.index) && d.index >= 0 && d.index < anh.length) theoChiSo.set(d.index, d)
  }
  if (!theoChiSo.size) return { anh: [...anh], bo: [], daCham: false }

  const muc = anh.map((url, index) => {
    const d = theoChiSo.get(index)
    return {
      url,
      index,
      diem: d ? d.diem : DIEM_MAC_DINH,
      nhieuChu: d?.nhieuChu ?? false,
      toanCanh: d?.toanCanh ?? true,
      lyDo: d?.lyDo ?? '',
      // ⚠️ Anh so 0 la anh trong kho — nguoi van hanh da tu chon no khi tao
      // deal. No luon duoc giu va luon dung dau: canh mo dau phai la tam anh
      // ma khach da thay tren trang web, khong phai mot tam cao ve tu trang shop.
      ghim: index === 0,
    }
  })

  const dang = muc.filter(m => m.ghim || (!m.nhieuChu && m.diem >= NGUONG))
  const bo = muc.filter(m => !dang.includes(m))

  // ⚠️ Bu lai neu bo qua tay. Model kho tinh la chuyen binh thuong; mot video
  // 3 canh thi khong. Lay lai theo diem cao nhat truoc.
  const buLai = bo.sort((a, b) => b.diem - a.diem || a.index - b.index)
  while (dang.length < Math.min(toiThieu, anh.length) && buLai.length) dang.push(buLai.shift()!)

  // Xep: anh ghim dung dau, con lai theo diem giam dan, hoa diem thi giu thu tu
  // goc (thu vien san pham von da xep tu anh chinh tro di).
  dang.sort((a, b) => Number(b.ghim) - Number(a.ghim) || b.diem - a.diem || a.index - b.index)

  return {
    anh: dang.map(m => m.url),
    bo: buLai.map(m => ({ url: m.url, lyDo: lyDoNgan(m) })),
    daCham: true,
  }
}

function lyDoNgan(m: { nhieuChu: boolean; toanCanh: boolean; diem: number; lyDo: string }): string {
  const co = m.nhieuChu ? 'nhiều chữ' : !m.toanCanh ? 'ảnh cận cảnh chi tiết' : `điểm ${m.diem}/10`
  return m.lyDo ? `${co} — ${m.lyDo}` : co
}
