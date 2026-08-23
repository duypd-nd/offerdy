/**
 * Ba phong cach video — moi con so deu phai truy duoc ve mot phep do.
 *
 * ⚠️ Phep kiem quan trong nhat o day KHONG phai "con so dung y dinh", ma la
 * **moi ten chuyen canh deu la mot ten `xfade` chay duoc**. Mot ten sai lam
 * ffmpeg do giua chung: mat ca video vi mot chuoi go nham.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAC_DINH, PHONG_CACH_MAU, PHONG_CACH_GIAY,
  DANH_SACH_PHONG_CACH, phongCachTheoTen, type PhongCachVideo,
} from '../src/lib/video/videoStyle'
import { XFADE_CO_SAN, CAT_CUNG } from '../src/lib/video/mapTransition'

const TAT_CA: PhongCachVideo[] = [MAC_DINH, PHONG_CACH_MAU, PHONG_CACH_GIAY]
const HOP_LE = new Set<string>([...XFADE_CO_SAN, CAT_CUNG])

test('mọi chuyển cảnh của mọi phong cách đều là tên xfade chạy được', () => {
  for (const pc of TAT_CA) {
    assert.ok(pc.chuyenCanh.length > 0, pc.ten)
    for (const c of pc.chuyenCanh) {
      assert.ok(HOP_LE.has(c), `${pc.ten}: "${c}" không phải tên xfade có thật`)
    }
  }
})

test('danh sách cho người vận hành khớp đúng ba phong cách có thật', () => {
  assert.equal(DANH_SACH_PHONG_CACH.length, 3)
  for (const { ten } of DANH_SACH_PHONG_CACH) {
    assert.equal(phongCachTheoTen(ten).ten, ten, ten)
  }
  // ⚠️ Tên gõ sai hoặc bỏ trống phải rơi về mặc định, KHÔNG được ném lỗi:
  // bộ dựng vẫn chạy, chỉ là khác phong cách.
  for (const xau of [null, undefined, '', 'khong-co-that', 'MAU-GIAY']) {
    assert.equal(phongCachTheoTen(xau).ten, 'mac-dinh', String(xau))
  }
})

test('mọi phong cách khai đủ trường — thiếu một cái là bộ dựng rơi về số cứng', () => {
  const canCo: (keyof PhongCachVideo)[] = [
    'ten', 'chuyenCanh', 'daiChuyen', 'nhipCanh',
    'phuDeCachDay', 'phuDeCo', 'badgeCachDay', 'badgeCo', 'badgeVien',
    'chuChayCo', 'anhKhung', 'anhKhungBadge', 'anhLech', 'anhLechBadge',
  ]
  for (const pc of TAT_CA) {
    for (const k of canCo) {
      assert.notEqual(pc[k], undefined, `${pc.ten} thiếu "${String(k)}"`)
    }
  }
})

test('mọi tỉ lệ nằm trong khoảng vẽ được trên khung hình', () => {
  for (const pc of TAT_CA) {
    // Chữ và ảnh tính theo % khung; vượt 1 là vẽ ra ngoài màn.
    for (const k of ['phuDeCachDay', 'phuDeCo', 'badgeCachDay', 'badgeCo', 'chuChayCo', 'anhLech', 'anhLechBadge'] as const) {
      assert.ok(pc[k] >= 0 && pc[k] <= 1, `${pc.ten}.${k} = ${pc[k]}`)
    }
    // ⚠️ Ảnh vượt 1 chiều rộng khung là bị CẮT MẤT hai bên — với trang affiliate
    // thì đó là cắt mất chính món hàng đang bán, không phải lỗi thẩm mỹ.
    assert.ok(pc.anhKhung <= 1, `${pc.ten}.anhKhung = ${pc.anhKhung} — ảnh sẽ bị cắt`)
    assert.ok(pc.anhKhungBadge <= 1, `${pc.ten}.anhKhungBadge = ${pc.anhKhungBadge}`)
    assert.ok(pc.daiChuyen > 0 && pc.daiChuyen < 1, `${pc.ten}.daiChuyen = ${pc.daiChuyen}`)
  }
})

test('phụ đề không bị giao diện TikTok che', () => {
  // ⚠️ Giao diện TikTok (tên kênh, caption, nút) ăn mất ~250/1920 = 13% cuối màn.
  // Chữ đặt thấp hơn mốc đó thì KHÔNG thể phát hiện bằng cách xem tệp MP4 trên máy.
  for (const pc of TAT_CA) {
    assert.ok(pc.phuDeCachDay >= 250 / 1920, `${pc.ten}: phụ đề cách đáy ${pc.phuDeCachDay}`)
  }
})

test('mau-giay: từng con số truy được về bảng đo Giay.mp4', () => {
  // Bảng đo `npm run video:analyze .scratch/mau/Giay.mp4` ngày 2026-08-23:
  //   cảnh trung bình 1,107s · chuyển 0,288s · cắt cứng 5/19 = 26%
  //   chữ ở 44% tính từ đỉnh · cao 7,0% chiều cao khung
  const g = PHONG_CACH_GIAY
  assert.ok(Math.abs((g.giayMoiAnh ?? 0) - 1.107) < 0.06, `giayMoiAnh ${g.giayMoiAnh}`)
  assert.ok(Math.abs(g.daiChuyen - 0.288) < 0.02, `daiChuyen ${g.daiChuyen}`)

  // Chữ lớn ở 44% từ đỉnh = 56% từ đáy — đây là dấu nhận dạng của mẫu này.
  assert.ok(Math.abs(g.badgeCachDay - 0.56) < 0.02, `badgeCachDay ${g.badgeCachDay}`)
  assert.ok(Math.abs(g.badgeCo - 0.07) < 0.005, `badgeCo ${g.badgeCo}`)

  // Tỉ lệ cắt cứng trong vòng lặp phải xấp xỉ 26% của mẫu.
  const catCung = g.chuyenCanh.filter(c => c === CAT_CUNG).length
  const tiLe = catCung / g.chuyenCanh.length
  assert.ok(Math.abs(tiLe - 0.26) < 0.06, `tỉ lệ cắt cứng ${(tiLe * 100).toFixed(0)}%`)
})

test('mau-giay khác mau-tiktok đúng ở chỗ nó phải khác', () => {
  // Nếu hai phong cách ra cùng một video thì thêm phong cách là vô nghĩa.
  assert.notEqual(PHONG_CACH_GIAY.badgeCachDay, PHONG_CACH_MAU.badgeCachDay)
  assert.ok(PHONG_CACH_GIAY.badgeCo > PHONG_CACH_MAU.badgeCo, 'chữ lớn phải TO hơn')
  assert.ok(PHONG_CACH_GIAY.badgeVien < PHONG_CACH_MAU.badgeVien, 'viền phải MỎNG hơn')
  assert.ok((PHONG_CACH_GIAY.giayMoiAnh ?? 9) < (PHONG_CACH_MAU.giayMoiAnh ?? 9), 'cắt phải NHANH hơn')

  // ⚠️ Nhưng viền KHÔNG được về 0. Mẫu ghi "không viền" vì nó quay trên một nền
  // studio phẳng; ảnh sản phẩm của ta đủ kiểu nền, bỏ viền hẳn là có lúc chữ
  // chìm mất vào ảnh.
  assert.ok(PHONG_CACH_GIAY.badgeVien > 0, 'viền 0 sẽ có lúc chữ chìm vào ảnh')

  // ⚠️ Và ảnh KHÔNG được to hơn mau-tiktok: mẫu quay dọc 9:16 nên hình phủ kín
  // màn, còn ảnh sản phẩm của ta phần lớn vuông — phủ kín 9:16 là phải cắt hai bên.
  assert.equal(PHONG_CACH_GIAY.anhKhung, PHONG_CACH_MAU.anhKhung)
})
