import { CAT_CUNG, DAI_CAT_CUNG, type XfadeName } from './mapTransition'

/**
 * Phong cach hinh anh cua mot video — gom nhung con so ma truoc day nam rai rac
 * trong `buildSpec.ts` va `scripts/video-render.mjs` duoi dang hang so viet cung.
 *
 * ⚠️ VI SAO GOM LAI: de hoc phong cach tu mot video mau thi phai co CHO ma dat
 * ket qua do vao. Truoc day muon doi nhip cat phai sua `uocGiay()`, doi vi tri
 * chu phai sua chuoi `h-560` trong bo dung, doi chuyen canh thi khong sua duoc vi
 * ca video chi co MOT kieu. Ba con so o ba noi, khong so sanh duoc voi bat cu
 * video nao.
 *
 * ⚠️ VI SAO TINH THEO PHAN TRAM CHIEU CAO, KHONG PHAI PIXEL: video mau tai ve co
 * the la 720×1280 hay 1080×1920. So pixel khong so sanh duoc giua hai do phan
 * giai; ti le thi so duoc.
 */
export type PhongCachVideo = {
  ten: string

  /**
   * Cac kieu chuyen canh dung LUAN PHIEN theo thu tu canh.
   *
   * Mot phan tu = ca video mot kieu (nhu hom nay). Nhieu phan tu = canh 1 dung
   * cai dau, canh 2 cai thu hai, het thi quay lai tu dau.
   */
  chuyenCanh: readonly (XfadeName | typeof CAT_CUNG)[]

  /** Do dai moi lan chuyen canh, giay. */
  daiChuyen: number

  /**
   * Nhan vao thoi luong uoc tinh cua moi canh. 1 = giu nguyen toc do doc hien tai.
   * Nho hon 1 = cat nhanh hon (canh ngan hon cung mot cau noi).
   */
  nhipCanh: number

  /** Khoang cach tu DAY khung toi dong phu de dau tien, theo % chieu cao. */
  phuDeCachDay: number
  /** Co chu toi da cua phu de, theo % chieu cao. */
  phuDeCo: number
  /** Khoang cach tu DAY khung toi chu LON (% giam, ma, CTA), theo % chieu cao. */
  badgeCachDay: number
  /** Co chu toi da cua chu LON, theo % chieu cao. */
  badgeCo: number
  /**
   * Do day vien cua chu LON, theo % chieu cao. 0 = khong vien.
   *
   * ⚠️ Truoc day viet cung `vien: 8` trong bo dung. Tach ra vi mau `Giay.mp4`
   * dat chu **khong vien, khong nen** — nhung do la video mot nen studio phang,
   * con anh san pham cua ta thi du kieu. Bo vien han la co luc chu chim mat vao
   * anh. Nen phong cach nao muon mong hon thi HA XUONG, dung ha ve 0.
   */
  badgeVien: number

  /**
   * Bao nhieu giay thi doi anh mot lan. `null` = mot anh cho ca cau noi (nhu cu).
   *
   * ⚠️ DAY LA CHO TACH CANH HINH KHOI NHIP LOI. Do that 4 video mau TikTok:
   * 1,11 / 1,18 / 1,28 / 2,41 giay moi canh, trong khi video cua ta 4,5 giay.
   * Khong the rut ngan bang cach noi nhanh hon — mot cau tieng Anh khong doc
   * xong trong 1,3 giay. Nen anh phai doi GIUA CHUNG mot cau: giong doc va phu
   * de chay lien mach, con hinh thi cat.
   */
  giayMoiAnh: number | null

  /**
   * Chi dung bao nhieu nhip dau cua loi doc. `null` = dung het.
   *
   * Video mau dai 17-22 giay, cua ta 45. Cat bot nhip la duong duy nhat rut ngan
   * that su — moi nhip la mot cau phai doc xong.
   */
  soNhipToiDa: number | null

  /**
   * Co chu cua PHU DE CHAY, theo % chieu cao khung.
   *
   * Mot dong nhieu chu nen phai nho hon han ban "mot chu mot luc" truoc day
   * (104/1920) — neu khong mot dong bon chu se tran ra ngoai le.
   */
  chuChayCo: number

  /** Canh dai cua khung anh, theo % CHIEU RONG khung hinh. */
  anhKhung: number
  /** Canh dai cua khung anh o nhung canh co chu LON, theo % chieu rong. */
  anhKhungBadge: number
  /** Day khung anh len bao nhieu, theo % chieu cao. */
  anhLech: number
  /** Day khung anh len o canh co chu LON, theo % chieu cao. */
  anhLechBadge: number
}

/**
 * Phong cach mac dinh = **y het video hom nay**.
 *
 * Cac con so lay tu chinh `scripts/video-render.mjs` o khung 1080×1920:
 * phu de `y = h-560` (560/1920), co chu toi da 68 (68/1920); chu lon `y = h-830`
 * (830/1920), co chu toi da 92 (92/1920). Nho vay them lop phong cach nay KHONG
 * doi mot khung hinh nao cho toi khi co ai do gan mot phong cach khac vao.
 */
export const MAC_DINH: PhongCachVideo = {
  ten: 'mac-dinh',
  chuyenCanh: ['fade'],
  daiChuyen: 0.5,
  nhipCanh: 1,
  phuDeCachDay: 560 / 1920,
  phuDeCo: 68 / 1920,
  badgeCachDay: 830 / 1920,
  badgeCo: 92 / 1920,
  badgeVien: 8 / 1920,
  giayMoiAnh: null,
  soNhipToiDa: null,
  chuChayCo: 104 / 1920,
  anhKhung: 920 / 1080,
  anhKhungBadge: 720 / 1080,
  anhLech: 170 / 1920,
  anhLechBadge: 300 / 1920,
}

/**
 * Phong cach hoc tu 4 video mau TikTok (do ngay 2026-08-22).
 *
 * ⚠️ LAY PHAN CHUNG CUA CA BON, khong sao chep mot cai. Bon video khac nhau xa
 * (1,11 den 2,41 giay moi canh; co cai co chu, co cai khong), va hai trong so do
 * la TEMPLATE CapCut ghep nhieu lop anh dong — thu ma `xfade` khong dung duoc.
 * Nhung con so duoi day la nhung gi ca bon deu co VA bo dung nay lam duoc.
 *
 * Nguon tung con so:
 * - `giayMoiAnh` 1,3 — trung vi cua 1,11 / 1,18 / 1,28 / 2,41
 * - `daiChuyen` 0,4 — trung binh cua 0,29 / 0,38 / 0,47 / 0,51
 * - Ti le cat cung 2/8 = 25% — do that 13 cat cung tren 53 lan chuyen
 * - Danh sach hieu ung: nhung kieu THUC SU thay trong bon video do
 *
 * ⚠️ Vi tri chu GIU NGUYEN o 71% du mau dat cao hon (18-58%). Do la quyet dinh
 * co y: ca bon mau la video thoi trang ban bang hinh, chay bang nhac va chu
 * trang tri, khong co phu de loi doc. Ta ban bang ly do va gia, va phu de cua ta
 * la CAU DANG DUOC DOC — nguoi xem de may im tieng doc no thay vi nghe.
 */
export const PHONG_CACH_MAU: PhongCachVideo = {
  ten: 'mau-tiktok',
  chuyenCanh: [CAT_CUNG, 'slideleft', 'pixelize', 'circleopen', CAT_CUNG, 'wiperight', 'hblur', 'squeezeh'],
  daiChuyen: 0.4,
  nhipCanh: 1,
  /**
   * Phu de nam DUOI anh, trong dai nen mo — khong de len anh nua.
   *
   * ⚠️ CON SO NAY BI KEP GIUA HAI PHIA. Khung anh cao 1040 va duoc day len 60,
   * nen no ket thuc o y=1420; con giao dien TikTok (ten kenh, caption, nut) an
   * mat khoang **250 pixel cuoi**. Dai dat chu that su chi la 1420..1670, tuc
   * cach day tu 250 den 500. Dat 300 la nam gon trong do: duoi anh han, ma van
   * cao hon vach giao dien.
   *
   * Ha xuong duoi 250 thi chu bat dau bi chinh giao dien TikTok che — va do la
   * thu khong the phat hien duoc bang cach xem tep MP4 tren may.
   */
  phuDeCachDay: 300 / 1920,
  phuDeCo: 68 / 1920,
  badgeCachDay: 830 / 1920,
  badgeCo: 92 / 1920,
  badgeVien: 8 / 1920,
  giayMoiAnh: 1.3,
  soNhipToiDa: 4,
  // Chu NHO hon va anh TO hon ban mac dinh, va chu duoc phep de len anh.
  //
  // ⚠️ Ba con so nay di voi nhau: anh to len thi khong con dai trong duoi de dat
  // chu, nen chu buoc phai de len anh; va chu de len anh thi phai nho lai, neu
  // khong no che mat chinh mon hang dang ban.
  chuChayCo: 62 / 1920,
  anhKhung: 1040 / 1080,
  anhKhungBadge: 900 / 1080,
  anhLech: 60 / 1920,
  anhLechBadge: 120 / 1920,
}

/**
 * Phong cach hoc tu `.scratch/mau/Giay.mp4` (do ngay 2026-08-23).
 *
 * ⚠️ Khac han `mau-tiktok` o CHO DAT CHU, va do moi la dau nhan dang cua mau
 * nay: chu LON nam GIUA MAN, de len anh, in hoa, vien mong. Mau do duoc
 * `44% tinh tu dinh` — tuc 56% tinh tu day — va cao `7% chieu cao khung`, gap
 * doi cho chu lon cua ta (92/1920 = 4,8%).
 *
 * Nguon tung con so (bang do cua `npm run video:analyze .scratch/mau/Giay.mp4`):
 * - `giayMoiAnh` 1,1  — canh trung binh do duoc 1,107s (ngan nhat 0,10 · dai nhat 4,72)
 * - `daiChuyen` 0,29  — trung binh 0,288s
 * - Ti le cat cung 3/11 = 27% — mau do 5/19 = 26%
 * - `badgeCachDay` 0,56 — mau dat chu o 44% tinh tu dinh
 * - `badgeCo` 134/1920 = 7,0% — dung bang mau
 * - Danh sach hieu ung: dung nhung kieu THUC SU thay trong mau
 *   (coverleft, coverup, fadewhite, slideleft, hblur, slideright, zoomin, fadeblack)
 *
 * ⚠️ BA CHO CO TINH KHONG SAO CHEP MAU — va ly do:
 *
 * 1. **Van giu phu de duoi day.** Mau chi co chu o 2/12 canh: no la video chay
 *    bang nhac, chu chi de trang tri. Ta ban bang loi doc, va phu de la CAU
 *    DANG DUOC DOC — bo di la mat nguoi xem de may im tieng. Chu lon giua man
 *    va phu de duoi day khong dam nhau: mot cai o 56% tu day, mot cai o 16%.
 *
 * 2. **Vien mong (3) chu khong bo han.** Mau ghi "khong vien, khong nen" —
 *    nhung do la mot nen studio phang mau xam. Anh san pham cua ta du kieu nen
 *    va do sang; bo vien han la co luc chu chim mat vao anh.
 *
 * 3. **Anh KHONG tran kin khung.** Mau la video quay doc 9:16 nen hinh phu kin
 *    man. Anh san pham cua ta phan lon vuong hoac doc 3:4 — muon phu kin 9:16
 *    thi phai cat mat hai ben, tuc **cat mat chinh mon hang dang ban**. Giu
 *    1040/1080 nhu `mau-tiktok`: gan kin be ngang, khong cat gi.
 */
export const PHONG_CACH_GIAY: PhongCachVideo = {
  ten: 'mau-giay',
  chuyenCanh: [
    CAT_CUNG, 'coverleft', 'coverup', CAT_CUNG, 'fadewhite',
    'slideleft', 'hblur', CAT_CUNG, 'slideright', 'zoomin', 'fadeblack',
  ],
  daiChuyen: 0.29,
  nhipCanh: 1,
  phuDeCachDay: 300 / 1920,
  phuDeCo: 68 / 1920,
  // Chu lon len GIUA MAN: 44% tinh tu dinh = 56% tinh tu day.
  badgeCachDay: 0.56,
  badgeCo: 134 / 1920,
  badgeVien: 3 / 1920,
  giayMoiAnh: 1.1,
  soNhipToiDa: 4,
  chuChayCo: 62 / 1920,
  anhKhung: 1040 / 1080,
  // ⚠️ Canh co chu lon KHONG thu anh nho lai — chu de LEN anh, dung ben duoi
  // anh nhu hai phong cach kia. Thu anh lai la mat chinh cai ve cua mau nay.
  anhKhungBadge: 1040 / 1080,
  anhLech: 60 / 1920,
  anhLechBadge: 60 / 1920,
}

/**
 * Danh sach phong cach cho nguoi van hanh chon.
 *
 * ⚠️ Moi phong cach doi ca nhip lan so canh, nen phai la mot lua chon CO Y THUC
 * — khong ap len moi video roi de nguoi dung tu phat hien ra video cua minh vua
 * khac han.
 */
export const DANH_SACH_PHONG_CACH = [
  { ten: 'mac-dinh', nhan: 'Mặc định — một ảnh mỗi câu, 45 giây' },
  { ten: 'mau-tiktok', nhan: 'Theo video mẫu — cắt 1,3 giây, ~30 giây' },
  { ten: 'mau-giay', nhan: 'Theo mẫu Giay.mp4 — chữ lớn giữa màn, cắt 1,1 giây' },
] as const

export type TenPhongCach = typeof DANH_SACH_PHONG_CACH[number]['ten']

/**
 * ⚠️ Tra ve `MAC_DINH` khi ten la rong HOAC khong nhan ra. Mot ten go sai lam
 * ra video mac dinh 45 giay thay vi bao loi — nhung do la duong an toan: bo
 * dung van chay, chi la khac phong cach.
 */
export function phongCachTheoTen(ten?: string | null): PhongCachVideo {
  if (ten === 'mau-tiktok') return PHONG_CACH_MAU
  if (ten === 'mau-giay') return PHONG_CACH_GIAY
  return MAC_DINH
}

export type ChuyenCanhCanh = { type: string; duration: number }

/**
 * Chuyen canh RA khoi canh thu `i`.
 *
 * `CAT_CUNG` duoc doi thanh mot `fade` dai dung mot khung hinh — xem ly do o
 * `mapTransition.ts`. Nho vay kich ban ghi ra CHI chua ten `xfade` that, bo dung
 * khong can biet toi khai niem "cat cung".
 */
export function chuyenCanhCho(pc: PhongCachVideo, i: number): ChuyenCanhCanh {
  const ds = pc.chuyenCanh.length ? pc.chuyenCanh : MAC_DINH.chuyenCanh
  const kieu = ds[i % ds.length]
  return kieu === CAT_CUNG
    ? { type: 'fade', duration: DAI_CAT_CUNG }
    : { type: kieu, duration: pc.daiChuyen }
}

/**
 * Chuyen canh khong duoc dai bang canh no noi.
 *
 * `xfade` lay phan cuoi cua doan truoc chong len phan dau cua doan sau. Chuyen
 * canh dai hon chinh canh do thi ffmpeg tra ve mot doan ngan hon du kien va MOI
 * moc thoi gian phia sau lech theo — ma tieng noi duoc dat theo cac moc do, nen
 * hau qua la tieng troi khoi hinh. Cat bot o day, mot lan, thay vi de bo dung
 * doan.
 */
export function keoVuaCanh(dai: number, canhTruoc: number, canhSau: number): number {
  const tran = Math.min(canhTruoc, canhSau) * 0.6
  return Math.max(DAI_CAT_CUNG, Math.min(dai, tran))
}
