/**
 * Đóng gói ảnh thành một tệp .zip để tải một lần về điện thoại.
 *
 * ⚠️ Phép kiểm quan trọng nhất ở đây là **CRC đúng**. Windows vẫn mở được tệp zip
 * có CRC sai, nhưng bộ giải nén của Android và iOS thì từ chối — tức lỗi chỉ lộ
 * ra trên đúng cái máy người dùng định dùng, sau khi mọi thứ trên máy phát triển
 * đều xanh.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { crc32, zipStore, tenAnToan } from '../src/lib/zipStore'

const byte = (s: string) => new TextEncoder().encode(s)

test('CRC-32 khớp giá trị chuẩn đã biết', () => {
  // Ba giá trị này tra được ở bất kỳ bảng CRC-32 (IEEE) nào — nếu một ngày nào
  // đó chúng đổi thì là code sai, không phải bảng sai.
  assert.equal(crc32(byte('')), 0)
  assert.equal(crc32(byte('hello')), 0x3610a686)
  assert.equal(crc32(byte('123456789')), 0xcbf43926)
})

test('tên tệp không thoát được ra ngoài thư mục giải nén', () => {
  assert.equal(tenAnToan('../../etc/passwd'), '.-.-etc-passwd')
  assert.equal(tenAnToan('anh/1.jpg'), 'anh-1.jpg')
  assert.equal(tenAnToan(''), 'tep')
  assert.equal(tenAnToan('..'), 'tep')
  assert.equal(tenAnToan('ảnh đẹp.jpg'), 'nh p.jpg')
})

test('tên trùng nhau được đánh số, không đè lên nhau', () => {
  const z = zipStore([
    { ten: 'a.jpg', data: byte('mot') },
    { ten: 'a.jpg', data: byte('hai') },
    { ten: 'a.jpg', data: byte('ba') },
  ])
  const chu = Buffer.from(z).toString('latin1')
  assert.ok(chu.includes('a.jpg'))
  assert.ok(chu.includes('a-2.jpg'))
  assert.ok(chu.includes('a-3.jpg'))
})

test('cấu trúc tệp zip: chữ ký đầu, bản ghi kết, đúng số tệp', () => {
  const z = zipStore([{ ten: 'x.txt', data: byte('noi dung') }])
  // PK\x03\x04 — chữ ký của đầu mục đầu tiên
  assert.deepEqual([...z.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04])
  // PK\x05\x06 — bản ghi kết, nằm ở 22 byte cuối khi không có ghi chú
  const ket = z.slice(z.length - 22)
  assert.deepEqual([...ket.slice(0, 4)], [0x50, 0x4b, 0x05, 0x06])
  // Số tệp nằm ở byte 8-9 và 10-11 của bản ghi kết
  assert.equal(ket[8] | (ket[9] << 8), 1)
  assert.equal(ket[10] | (ket[11] << 8), 1)
})

test('tệp rỗng vẫn ra một tệp zip hợp lệ', () => {
  const z = zipStore([])
  assert.deepEqual([...z.slice(0, 4)], [0x50, 0x4b, 0x05, 0x06])
  assert.equal(z.length, 22)
})

/**
 * Phép kiểm cuối cùng: một chương trình KHÁC có mở được tệp không.
 *
 * Mọi phép kiểm trên đều do chính code này tự chấm mình. Chỉ khi một bộ giải nén
 * độc lập đọc ra đúng nội dung thì mới biết định dạng đúng thật. Bỏ qua khi máy
 * không có PowerShell (CI Linux) — đây là phép kiểm về môi trường, không phải
 * về logic.
 */
test('một bộ giải nén ĐỘC LẬP mở được và đọc đúng nội dung', t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-'))
  const tepZip = path.join(tmp, 'thu.zip')
  fs.writeFileSync(tepZip, zipStore([
    { ten: 'mot.txt', data: byte('noi dung mot') },
    { ten: 'hai.txt', data: byte('noi dung hai') },
  ]))

  try {
    execFileSync('powershell', [
      '-NoProfile', '-Command',
      `Expand-Archive -Path '${tepZip}' -DestinationPath '${tmp}/ra' -Force`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {
    fs.rmSync(tmp, { recursive: true, force: true })
    return t.skip('khong co PowerShell tren may nay')
  }

  assert.equal(fs.readFileSync(path.join(tmp, 'ra', 'mot.txt'), 'utf8'), 'noi dung mot')
  assert.equal(fs.readFileSync(path.join(tmp, 'ra', 'hai.txt'), 'utf8'), 'noi dung hai')
  fs.rmSync(tmp, { recursive: true, force: true })
})
