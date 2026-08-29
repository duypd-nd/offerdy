/**
 * PCM thô -> WAV, và các phép cắt/ghép quanh nó.
 *
 * Cả bộ này canh đúng một họ lỗi: **tệp âm thanh hỏng vẫn tải về được, vẫn mở
 * được, và chỉ lộ ra khi người dùng đã dựng xong video.** Không có mã lỗi nào,
 * không có ngoại lệ nào. Đó là lý do phần đầu WAV và phép cắt khoảng lặng được
 * kiểm từng byte chứ không chỉ kiểm "có chạy không".
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DAU_WAV, catKhoangLang, docRate, ghepPcm, giayCuaPcm, khoangLang,
  pcmTuWav, rateTuWav, wavTuPcm,
} from '@/lib/tts/pcmWav'

/** Một đoạn "có tiếng": sóng vuông biên độ `bien`. */
function tieng(giay: number, bien = 8000, rate = 24000): Uint8Array {
  const n = Math.round(giay * rate)
  const b = new Uint8Array(n * 2)
  const dv = new DataView(b.buffer)
  for (let i = 0; i < n; i++) dv.setInt16(i * 2, i % 20 < 10 ? bien : -bien, true)
  return b
}


test('docRate đọc đúng mimeType Gemini trả về, và lùi về mặc định khi lạ', () => {
  assert.equal(docRate('audio/L16;codec=pcm;rate=24000'), 24000)
  assert.equal(docRate('audio/L16; codec=pcm; rate=16000'), 16000)
  // Ngoài dải nghe được -> mặc định, chứ không phải nhận bừa rồi đổi cao độ giọng.
  assert.equal(docRate('audio/L16;codec=pcm;rate=999999'), 24000)
  assert.equal(docRate('audio/wav'), 24000)
  assert.equal(docRate(undefined), 24000)
})

test('phần đầu WAV đúng từng byte — sai một ô là trình phát ra tiếng rè', () => {
  const pcm = tieng(0.5)
  const wav = wavTuPcm(pcm, 24000)
  const chu = (vt: number, n: number) => String.fromCharCode(...wav.subarray(vt, vt + n))
  const dv = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)

  assert.equal(chu(0, 4), 'RIFF')
  assert.equal(chu(8, 4), 'WAVE')
  assert.equal(chu(12, 4), 'fmt ')
  assert.equal(chu(36, 4), 'data')
  assert.equal(dv.getUint32(4, true), 36 + pcm.length, 'cỡ RIFF = cả tệp trừ 8 byte đầu')
  assert.equal(dv.getUint32(16, true), 16, 'khối fmt của PCM dài đúng 16')
  assert.equal(dv.getUint16(20, true), 1, '1 = PCM không nén')
  assert.equal(dv.getUint16(22, true), 1, 'một kênh')
  assert.equal(dv.getUint32(24, true), 24000)
  assert.equal(dv.getUint32(28, true), 24000 * 2, 'byte mỗi giây = rate × 2')
  assert.equal(dv.getUint16(32, true), 2, 'cỡ một khung')
  assert.equal(dv.getUint16(34, true), 16, 'mười sáu bit')
  assert.equal(dv.getUint32(40, true), pcm.length, 'cỡ khối data')
  assert.equal(wav.length, DAU_WAV + pcm.length)
})

test('pcmTuWav / rateTuWav lấy lại đúng thứ wavTuPcm đã bọc vào', () => {
  const pcm = tieng(0.2)
  for (const rate of [16000, 24000]) {
    const wav = wavTuPcm(pcm, rate)
    assert.equal(rateTuWav(wav), rate)
    assert.deepEqual(Array.from(pcmTuWav(wav)), Array.from(pcm))
  }
})

test('⚠️ đoạn toàn lặng KHÔNG bị cắt thành rỗng', () => {
  // Cắt sạch là "đúng" về mặt số học và SAI về mặt hậu quả: nó giao một tệp câm
  // mà mọi dấu hiệu đều báo thành công. Thà trả đoạn lặng còn nghe ra được.
  const lang = khoangLang(1, 24000)
  const ra = catKhoangLang(lang, 24000)
  assert.ok(ra.length > 0, 'không được trả về khối rỗng')
  assert.equal(ra.length, lang.length)
})

test('cắt khoảng lặng hai đầu nhưng chừa lại phần đệm, không xén vào tiếng', () => {
  const rate = 24000
  const pcm = new Uint8Array([...khoangLang(0.5, rate), ...tieng(0.4, 8000, rate), ...khoangLang(0.6, rate)])
  const truoc = giayCuaPcm(pcm, rate)
  const sau = giayCuaPcm(catKhoangLang(pcm, rate), rate)

  assert.ok(Math.abs(truoc - 1.5) < 0.01, `dựng sai dữ liệu thử: ${truoc}`)
  // Còn lại phải là tiếng (0,4s) cộng hai phần đệm 0,04s — chứ không phải đúng 0,4s.
  assert.ok(sau > 0.4 && sau < 0.55, `còn ${sau.toFixed(2)}s, ngoài khoảng mong đợi`)
})

test('ngưỡng cắt bám theo đỉnh của chính đoạn đó — đoạn thu nhỏ tiếng không mất', () => {
  // Biên độ 700 nằm trên ngưỡng tuyệt đối 500 nên vẫn phải giữ được. Nếu ngưỡng
  // chỉ là một hằng số cứng cao hơn thì cả câu nói nhỏ biến mất không dấu vết.
  const rate = 24000
  const pcm = new Uint8Array([...khoangLang(0.3, rate), ...tieng(0.3, 700, rate), ...khoangLang(0.3, rate)])
  const sau = giayCuaPcm(catKhoangLang(pcm, rate), rate)
  assert.ok(sau > 0.3 && sau < 0.45, `còn ${sau.toFixed(2)}s — tiếng nhỏ bị xén mất`)
})

test('ghepPcm chèn nghỉ GIỮA các đoạn, không thêm ở hai đầu', () => {
  const rate = 24000
  const a = tieng(0.2, 8000, rate)
  const b = tieng(0.3, 8000, rate)
  const c = tieng(0.1, 8000, rate)
  const ra = ghepPcm([a, b, c], 0.35, rate)
  // 0,2 + 0,35 + 0,3 + 0,35 + 0,1 = 1,3 — hai khoảng nghỉ cho ba đoạn.
  assert.ok(Math.abs(giayCuaPcm(ra, rate) - 1.3) < 0.001, giayCuaPcm(ra, rate).toFixed(3))
  assert.equal(ra.length, a.length + b.length + c.length + khoangLang(0.35, rate).length * 2)
})

test('ghepPcm bỏ qua đoạn rỗng thay vì chèn một khoảng nghỉ thừa', () => {
  const rate = 24000
  const a = tieng(0.2, 8000, rate)
  assert.equal(ghepPcm([a], 0.35, rate).length, a.length, 'một đoạn thì không có nghỉ nào')
  assert.equal(ghepPcm([a, new Uint8Array(0)], 0.35, rate).length, a.length)
  assert.equal(ghepPcm([], 0.35, rate).length, 0)
})

test('ghép rồi bọc rồi bóc ra lại đúng bằng cái đã ghép — hai đầu ghép phải khớp', () => {
  // Máy chủ ghép ở `tieng/route.ts`, trình duyệt ghép ở `SocialKitClient`. Cả
  // hai gọi CÙNG hàm này; phép kiểm dưới đây là thứ giữ cho điều đó còn đúng.
  const rate = 24000
  const doan = [tieng(0.2, 8000, rate), tieng(0.15, 8000, rate)]
  const ghep = ghepPcm(doan, 0.35, rate)
  const vong = pcmTuWav(wavTuPcm(ghep, rate))
  assert.equal(vong.length, ghep.length)
  assert.deepEqual(Array.from(vong.subarray(0, 64)), Array.from(ghep.subarray(0, 64)))
})

