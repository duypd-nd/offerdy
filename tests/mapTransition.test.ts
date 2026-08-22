/**
 * Mo ta bang loi -> ten `xfade`.
 *
 * ⚠️ Phep kiem quan trong nhat o day KHONG phai "map dung y dinh", ma la **moi
 * duong ra deu la mot ten ffmpeg chay duoc**. Mot ten sai lam ffmpeg do giua
 * chung dung video: mat ca video vi mot cau mo ta la.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mapTransition, XFADE_CO_SAN, CAT_CUNG, DAI_CAT_CUNG } from '../src/lib/video/mapTransition'

const HOP_LE = new Set<string>([...XFADE_CO_SAN, CAT_CUNG])

test('nhan ra huong cua hieu ung truot', () => {
  assert.equal(mapTransition('ảnh mới trượt vào từ bên phải').type, 'slideright')
  assert.equal(mapTransition('ảnh cũ bị đẩy sang trái').type, 'slideleft')
  assert.equal(mapTransition('ảnh mới trượt lên từ dưới').type, 'slideup')
  assert.equal(mapTransition('slide down to the next photo').type, 'slidedown')
})

test('mo dan qua mot mau phai khop TRUOC luat "mo" chung', () => {
  // Day la loi de mac nhat: moi hieu ung co chu "mờ" deu roi vao `fade` neu bang
  // luat khong xet cai cu the truoc.
  assert.equal(mapTransition('màn hình loé trắng rồi hiện ảnh mới').type, 'fadewhite')
  assert.equal(mapTransition('mờ dần qua màn đen').type, 'fadeblack')
  assert.equal(mapTransition('mờ dần sang ảnh sau').type, 'fade')
})

test('hinh dang: mo vong tron khac khep vong tron khac cat vong tron', () => {
  assert.equal(mapTransition('một vòng tròn mở rộng ra để lộ ảnh mới').type, 'circleopen')
  assert.equal(mapTransition('vòng tròn khép lại').type, 'circleclose')
  assert.equal(mapTransition('ảnh bị cắt theo hình tròn').type, 'circlecrop')
})

test('cac hieu ung anh thuong gap tren CapCut', () => {
  assert.equal(mapTransition('ảnh vỡ thành các ô vuông pixel').type, 'pixelize')
  assert.equal(mapTransition('phóng to rất nhanh rồi sang ảnh mới').type, 'zoomin')
  assert.equal(mapTransition('nhoè đi rồi rõ lại ở ảnh sau').type, 'hblur')
  assert.equal(mapTransition('hai ảnh hoà tan vào nhau').type, 'dissolve')
})

test('cat cung la mot ket qua rieng, khong phai mot kieu xfade', () => {
  assert.equal(mapTransition('cắt cứng, không có hiệu ứng gì').type, CAT_CUNG)
  assert.ok(!XFADE_CO_SAN.includes(CAT_CUNG as never))
  // Mot khung hinh o 30fps — mat thuong khong phan biet duoc voi mot cu cat.
  assert.ok(DAI_CAT_CUNG > 0 && DAI_CAT_CUNG < 0.05)
})

test('KHONG nhan ra thi ve `fade` va NOI RA la da phai thay', () => {
  // Nhung hieu ung CapCut khong co tuong duong trong xfade.
  for (const la of ['hiệu ứng glitch nhiễu sọc màu', 'lật 3D như trang sách', 'các hạt bay tán ra', '']) {
    const r = mapTransition(la)
    assert.equal(r.type, 'fade', la)
    assert.equal(r.thay, true, la)
  }
})

test('MOI duong ra deu la mot ten ffmpeg chay duoc', () => {
  const moTa = [
    'trượt sang phải', 'quét ngang từ trái', 'mờ dần', 'loé trắng', 'tối đen',
    'vòng tròn mở', 'vỡ pixel', 'phóng to', 'nhoè', 'hoà tan', 'chéo từ góc trên phải',
    'bóp dọc lại', 'gió thổi sang phải', 'sọc ngang chạy', 'che lên từ dưới',
    'kéo màn lộ ra ảnh sau', 'trôi mượt sang trái', 'xám dần', 'toả tròn như kim đồng hồ',
    'hình chữ nhật mở ra', 'cắt cứng', 'thứ gì đó không ai hiểu',
  ]
  for (const m of moTa) assert.ok(HOP_LE.has(mapTransition(m).type), `${m} -> ${mapTransition(m).type}`)
})

/**
 * Danh sach trang phai KHOP voi ban ffmpeg tren may.
 *
 * Bo qua khi khong co ffmpeg (CI, Vercel) — day la phep kiem ve moi truong, khong
 * phai ve logic, va bat buoc no se lam `npm test` do o noi khong dung video.
 */
test('danh sach trang khong chua ten ma ffmpeg khong co', t => {
  let raw = ''
  try {
    raw = execFileSync('ffmpeg', ['-h', 'filter=xfade'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {
    return t.skip('khong co ffmpeg tren may nay')
  }
  const coThat = new Set(
    raw.split(/\r?\n/)
      .map(d => d.trim().match(/^([a-z]+)\s+-?\d+\s/)?.[1])
      .filter((x): x is string => !!x)
  )
  const thieu = XFADE_CO_SAN.filter(t2 => !coThat.has(t2))
  assert.deepEqual(thieu, [], `ffmpeg tren may khong co: ${thieu.join(', ')}`)
})
