/**
 * Mo ta bang loi cua mot lan chuyen canh -> ten `xfade` cua ffmpeg.
 *
 * ⚠️ VI SAO LA HAM THUAN, KHONG DE MODEL TU CHON: cung mot luat da lap o
 * `scoreImages()` — **model nhin, code quyet dinh**. Model nhin sau khung hinh
 * quanh diem cat va noi no thay gi ("anh moi truot vao tu ben phai"); viec dich
 * cau do sang mot ten ffmpeg hop le la viec cua code. De model tu tra ve ten thi
 * mot ngay nao do no tra `slide-left`, `slideLeft` hay `swipe_left` — ba chuoi
 * deu hop ly voi nguoi doc va deu lam ffmpeg do loi giua chung dung video.
 *
 * Danh sach duoi day lay tu chinh may nay:
 *   ffmpeg -h filter=xfade
 * ffmpeg 8.1.2 co 57 kieu (khong ke `custom`). Doi may hay doi ban ffmpeg thi
 * chay lai lenh do va doi danh sach — test se bat neu no chua mot ten khong ton tai.
 */

/** Cat cung — KHONG phai mot kieu `xfade`. Xem `DAI_CAT_CUNG` ben duoi. */
export const CAT_CUNG = 'cat'

/**
 * Cat cung duoc dung bang mot `xfade` dai DUNG MOT KHUNG HINH.
 *
 * Vi sao khong noi thang khong qua `xfade`: lam vay phai them mot nhanh ghep noi
 * hoan toan khac trong bo dung, va nhanh do se it duoc chay nen it duoc kiem.
 * Mot lan chuyen dai 1/30 giay thi mat thuong khong phan biet duoc voi mot cu
 * cat, ma duong di cua code van la MOT.
 */
export const DAI_CAT_CUNG = 1 / 30

export const XFADE_CO_SAN = [
  'fade', 'wipeleft', 'wiperight', 'wipeup', 'wipedown',
  'slideleft', 'slideright', 'slideup', 'slidedown',
  'circlecrop', 'rectcrop', 'distance', 'fadeblack', 'fadewhite', 'radial',
  'smoothleft', 'smoothright', 'smoothup', 'smoothdown',
  'circleopen', 'circleclose', 'vertopen', 'vertclose', 'horzopen', 'horzclose',
  'dissolve', 'pixelize', 'diagtl', 'diagtr', 'diagbl', 'diagbr',
  'hlslice', 'hrslice', 'vuslice', 'vdslice', 'hblur', 'fadegrays',
  'wipetl', 'wipetr', 'wipebl', 'wipebr', 'squeezeh', 'squeezev', 'zoomin',
  'fadefast', 'fadeslow', 'hlwind', 'hrwind', 'vuwind', 'vdwind',
  'coverleft', 'coverright', 'coverup', 'coverdown',
  'revealleft', 'revealright', 'revealup', 'revealdown',
] as const

export type XfadeName = typeof XFADE_CO_SAN[number]

export type KetQuaAnhXa = {
  /** Ten `xfade`, hoac `CAT_CUNG`. */
  type: XfadeName | typeof CAT_CUNG
  /**
   * `true` = KHONG nhan ra hieu ung nay, da phai thay bang `fade`.
   *
   * ⚠️ Truong nay ton tai de bao cao NOI THAT. CapCut co glitch, lat 3D, hat bay,
   * mat na hinh dang — `xfade` khong co gi tuong duong. Am tham tra ve `fade` roi
   * bao "da bat chuoc xong" la noi doi voi nguoi dung; ho se ngoi so tung khung
   * hinh de tim xem sai o dau.
   */
  thay: boolean
}

/**
 * Bo dau truoc khi khop.
 *
 * ⚠️ DO THAT 2026-08-22: viet luat bang chinh chu co dau roi khop truc tiep thi
 * HONG hai duong cung luc.
 *
 * Mot, bien gioi tu cua JavaScript chi biet [A-Za-z0-9_], nen no chay sai quanh
 * chu co dau. Hai, model luc viet co dau luc khong, nen mot bang luat co dau se
 * bo lo mot nua so cau.
 *
 * Bo dau mot lan o dau vao thi moi luat ben duoi chi con lam viec voi ASCII.
 */
const DAU_KET_HOP = /[̀-ͯ]/g

const boDau = (s: string): string =>
  s.normalize('NFD').replace(DAU_KET_HOP, '')
    // "đ" KHONG tach ra trong NFD nhu cac nguyen am co dau — phai thay tay.
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()

/** Huong, doc theo ca tieng Viet lan tieng Anh — model co the tra ve bat ky ben nao. */
const HUONG: [RegExp, string][] = [
  [/\b(trai|left|leftward)\b/, 'left'],
  [/\b(phai|right|rightward)\b/, 'right'],
  [/\b(len|tren|up|upward|upwards)\b/, 'up'],
  [/\b(xuong|duoi|down|downward|downwards)\b/, 'down'],
]

const docHuong = (s: string): string | null => HUONG.find(([re]) => re.test(s))?.[1] ?? null

/**
 * Bang luat, XET THEO THU TU — cai cu the dung truoc cai chung chung.
 *
 * "mo dan qua man trang" phai khop `fadewhite` TRUOC khi cham toi luat "mo" ->
 * `fade`, neu khong moi hieu ung co chu "mo" deu roi vao `fade`.
 *
 * Moi mau o day viet KHONG DAU — dau vao da qua `boDau()`.
 */
const LUAT: { re: RegExp; ten: (s: string) => string | null }[] = [
  // ── Cat cung ──
  { re: /(cat cung|cat thang|cat ngay|khong co hieu ung|khong hieu ung|hard cut|straight cut|no transition)/, ten: () => CAT_CUNG },

  // ── Mo qua mot mau ── (phai dung TRUOC luat "mo" chung)
  { re: /\b(trang|white)\b/, ten: s => /(mo |nhat|fade|flash|loe|chop)/.test(s) ? 'fadewhite' : null },
  { re: /\b(den|black)\b/, ten: s => /(mo |toi|fade)/.test(s) ? 'fadeblack' : null },
  { re: /\b(xam|den trang|grayscale|greyscale|gray|grey)\b/, ten: () => 'fadegrays' },

  // ── Truot / che / lo ──
  { re: /(truot|day sang|slide|push)/, ten: s => { const h = docHuong(s); return h ? `slide${h}` : 'slideleft' } },
  { re: /(che len|phu len|trum len|cover)/, ten: s => { const h = docHuong(s); return h ? `cover${h}` : 'coverleft' } },
  { re: /(lo ra|he ra|keo man|reveal|uncover)/, ten: s => { const h = docHuong(s); return h ? `reveal${h}` : 'revealleft' } },
  { re: /(xoa man|quet ngang|quet qua|gat sang|wipe|swipe)/, ten: s => { const h = docHuong(s); return h ? `wipe${h}` : 'wipeleft' } },
  { re: /(muot|troi muot|smooth)/, ten: s => { const h = docHuong(s); return h ? `smooth${h}` : 'smoothleft' } },
  { re: /(gio thoi|thoi bay|wind)/, ten: s => {
    const h = docHuong(s)
    return h === 'right' ? 'hrwind' : h === 'up' ? 'vuwind' : h === 'down' ? 'vdwind' : 'hlwind'
  } },
  { re: /(lat cat|soc|dai chay|slice|blinds)/, ten: s => {
    const h = docHuong(s)
    return h === 'right' ? 'hrslice' : h === 'up' ? 'vuslice' : h === 'down' ? 'vdslice' : 'hlslice'
  } },

  // ── Hinh dang ──
  { re: /(mo vong tron|vong tron mo|vong tron no|no ra|circle open|iris in)/, ten: () => 'circleopen' },
  { re: /(khep vong tron|vong tron khep|thu lai|circle close|iris out)/, ten: () => 'circleclose' },
  { re: /(vong tron|hinh tron|circle)/, ten: () => 'circlecrop' },
  { re: /(hinh chu nhat|khung chu nhat|rect)/, ten: () => 'rectcrop' },
  { re: /(mo doc|tach doc|vertical open|vert open)/, ten: () => 'vertopen' },
  { re: /(mo ngang|tach ngang|horizontal open|horz open)/, ten: () => 'horzopen' },
  { re: /(cheo|duong cheo|goc tren|goc duoi|diagonal|corner)/, ten: s => {
    if (/(duoi|bottom)/.test(s)) return /(phai|right)/.test(s) ? 'diagbr' : 'diagbl'
    return /(phai|right)/.test(s) ? 'diagtr' : 'diagtl'
  } },
  { re: /(bop|ep lai|nen lai|squeeze)/, ten: s => /(doc|dung|vertical)/.test(s) ? 'squeezev' : 'squeezeh' },

  // ── Hieu ung anh ──
  { re: /(vo hat|pixel|o vuong|mosaic|vo o)/, ten: () => 'pixelize' },
  { re: /(phong to|thu phong|zoom|scale up)/, ten: () => 'zoomin' },
  { re: /(nhoe|blur)/, ten: () => 'hblur' },
  { re: /(toa tron|quet quat|radial|clock)/, ten: () => 'radial' },
  { re: /(hoa tan|tan vao nhau|lan vao nhau|dissolve)/, ten: () => 'dissolve' },

  // ── Chung chung, DE CUOI CUNG ──
  { re: /(mo nhanh|fade nhanh|fast fade)/, ten: () => 'fadefast' },
  { re: /(mo cham|fade cham|slow fade)/, ten: () => 'fadeslow' },
  { re: /(mo dan|chuyen mo|nhat dan|fade|crossfade|cross-fade)/, ten: () => 'fade' },
]

/**
 * Nhung hieu ung CapCut KHONG co tuong duong trong `xfade` — xet TRUOC moi luat khac.
 *
 * ⚠️ Phai xet truoc, vi mo ta cua chung thuong chua chu cua mot luat khac va se bi
 * bat nham: "glitch nhieu soc mau" dinh luat `slice` ("soc") va tra ve `hlslice` voi
 * `thay: false` — tuc bao cao rang da bat chuoc dung, trong khi thuc te khong. Mot
 * bao cao sai con te hon mot hieu ung sai: no cuop mat co hoi sua tay.
 */
const KHONG_CO_TUONG_DUONG =
  /(glitch|nhieu song|nhieu hat|rung lac|giat hinh|lat 3d|lat trang|xoay 3d|hat bay|tan ra thanh hat|particle|mat na|mask|shape reveal|zoom xoay|spin)/

const HOP_LE = new Set<string>(XFADE_CO_SAN)

/**
 * Doc mot mo ta -> mot ten `xfade` chay duoc.
 *
 * Khong nhan ra thi tra `fade` kem `thay: true`. KHONG bao gio nem loi va khong
 * bao gio tra mot ten khong co trong bo loc — mot ten sai lam ffmpeg do giua
 * chung, tuc mat ca video chi vi mot cau mo ta la.
 */
export function mapTransition(moTa: string): KetQuaAnhXa {
  const s = boDau((moTa ?? '').trim())
  if (!s) return { type: 'fade', thay: true }
  if (KHONG_CO_TUONG_DUONG.test(s)) return { type: 'fade', thay: true }

  for (const luat of LUAT) {
    if (!luat.re.test(s)) continue
    const ten = luat.ten(s)
    if (!ten) continue
    if (ten === CAT_CUNG) return { type: CAT_CUNG, thay: false }
    if (HOP_LE.has(ten)) return { type: ten as XfadeName, thay: false }
  }
  return { type: 'fade', thay: true }
}
