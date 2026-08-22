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
