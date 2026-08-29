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
  DAU_WAV, catKhoangLang, catThanhDoan, docRate, ghepPcm, giayCuaPcm, khoangLang, timKheIm,
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


// ── Cắt một lần đọc thành nhiều nhịp ──────────────────────────
//
// Gộp bốn nhịp vào MỘT lần gọi rồi cắt lại là khác biệt giữa ~5 video/ngày và
// ~20 (hạn mức ~10 lần đọc mỗi khoá mỗi ngày). Nhưng cắt sai thì giao một clip
// đứt giữa từ — tệp vẫn mở được, vẫn phát được, và chỉ lộ ra khi người dùng đã
// dựng xong video. Nên `catThanhDoan` phải trả `null` chứ không đoán.
//
// 📌 Số dùng ở đây lấy từ đo thật 29/08 trên bốn nhịp của deal #1471:
//    ranh giới giữa các nhịp: 0,54 – 0,76s
//    khe dài nhất TRONG câu:  0,10s
// Ngưỡng 0,30s nằm giữa, cách mỗi bên hơn ba lần.

/** Dựng một khối tiếng gồm `doan` đoạn, cách nhau `khe` giây im. */
function dungBai(doan: number[], khe: number[], rate = 24000): Uint8Array {
  const phan: Uint8Array[] = []
  for (let i = 0; i < doan.length; i++) {
    if (i > 0) phan.push(khoangLang(khe[i - 1], rate))
    phan.push(tieng(doan[i], 8000, rate))
  }
  const tong = phan.reduce((s, p) => s + p.length, 0)
  const ra = new Uint8Array(tong)
  let vt = 0
  for (const p of phan) { ra.set(p, vt); vt += p.length }
  return ra
}

test('cắt đúng bốn nhịp khi có đúng ba khoảng lặng dài — theo số đo thật', () => {
  const pcm = dungBai([1.6, 2.6, 8.7, 3.1], [0.72, 0.76, 0.72])
  const ra = catThanhDoan(pcm, 4, 24000)
  assert.ok(ra, 'phải cắt được')
  assert.equal(ra!.length, 4)
  // Mỗi đoạn phải gần đúng độ dài đã dựng (đã trừ phần cắt khoảng lặng hai đầu).
  const mong = [1.6, 2.6, 8.7, 3.1]
  ra!.forEach((d, i) => {
    const g = giayCuaPcm(d, 24000)
    assert.ok(Math.abs(g - mong[i]) < 0.3, `đoạn ${i + 1}: ${g.toFixed(2)}s, mong ${mong[i]}s`)
  })
})

test('khe ngắn cỡ nghỉ trong câu KHÔNG bị coi là ranh giới', () => {
  // 0,10s là khe dài nhất trong câu đo được. Nếu nó bị tính là ranh giới thì
  // một câu có dấu phẩy sẽ bị cắt làm đôi.
  const pcm = dungBai([2, 3], [0.1])
  // ⚠️ `assert.equal(..., null)` in ra CA mang byte khi trượt — một lần chạy mất
  // 27 giây chỉ để dựng thông báo lỗi. `assert.ok` với thông điệp tự viết thì
  // hỏng hay đạt đều xong trong tích tắc.
  assert.ok(catThanhDoan(pcm, 2, 24000) === null, 'khe 0,10s không được coi là ranh giới')
})

test('⚠️ thiếu hoặc thừa khe thì trả null, KHÔNG đoán chỗ cắt', () => {
  // Mô hình nghỉ thiếu một chỗ -> ba đoạn thay vì bốn.
  assert.ok(catThanhDoan(dungBai([2, 3, 4], [0.7, 0.7]), 4, 24000) === null, 'thiếu khe')
  // Mô hình nghỉ thừa -> bốn khe cho bốn đoạn.
  assert.ok(catThanhDoan(dungBai([2, 2, 2, 2, 2], [0.7, 0.7, 0.7, 0.7]), 4, 24000) === null, 'thừa khe')
})

test('⚠️ đoạn ngắn bất thường làm cả phép cắt bị từ chối', () => {
  // Một đoạn 0,1 giây gần như chắc chắn là cắt hỏng chứ không phải một nhịp.
  // Thà trả null để nơi gọi giao tệp liền, còn hơn giao một clip câm.
  assert.ok(catThanhDoan(dungBai([2, 0.1, 3, 2], [0.7, 0.7, 0.7]), 4, 24000) === null,
    'nhịp 0,1 giây phải làm cả phép cắt bị từ chối')
})

test('cắt xong ghép lại vẫn ra tệp WAV hợp lệ — vòng khép kín', () => {
  const ra = catThanhDoan(dungBai([1.6, 2.6, 3.1], [0.7, 0.7]), 3, 24000)!
  for (const d of ra) {
    const wav = wavTuPcm(d, 24000)
    assert.equal(rateTuWav(wav), 24000)
    assert.equal(pcmTuWav(wav).length, d.length)
  }
})

test('timKheIm bỏ qua khoảng lặng ở ĐẦU tệp — nó là phần đệm, không phải ranh giới', () => {
  const rate = 24000
  const pcm = new Uint8Array([...khoangLang(0.8, rate), ...tieng(2, 8000, rate),
    ...khoangLang(0.7, rate), ...tieng(2, 8000, rate)])
  const khe = timKheIm(pcm, rate).filter(k => k.giay >= 0.3)
  assert.equal(khe.length, 1, 'chỉ khe GIỮA mới tính')
  assert.equal(catThanhDoan(pcm, 2, rate)?.length, 2)
})

test('một đoạn thì trả nguyên khối, không cần tìm khe nào', () => {
  const pcm = tieng(2)
  assert.equal(catThanhDoan(pcm, 1, 24000)?.length, 1)
  assert.ok(catThanhDoan(pcm, 0, 24000) === null)
})
