/**
 * Đọc chữ thành tiếng bằng Gemini TTS — chạy được **trên Vercel**.
 *
 * ── VÌ SAO KHÔNG DÙNG LẠI `scripts/tts.mjs` ────────────────────────
 *
 * Bộ đọc trong `scripts/` có ba nhà: ElevenLabs (đã huỷ gói), edge-tts (cần
 * `python -m edge_tts`, tức một tiến trình con), SAPI (chỉ có trên Windows).
 * Cả ba đều cần **máy tính của người dùng đang bật**. Người dùng làm việc này
 * trên điện thoại, nên cả ba đều vô dụng ở đây.
 *
 * Gemini TTS chỉ là một lần gọi HTTPS, và `GEMINI_API_KEY` đã có sẵn trên
 * Vercel cho bộ định tuyến AI. Không thêm khoá mới, không thêm dịch vụ mới.
 *
 * ── HAI HẠN MỨC, KHÔNG PHẢI MỘT ────────────────────────────────────
 *
 * Đo thật 29/08, lấy thẳng từ lỗi 429 chứ không phải đọc tài liệu:
 *
 *   GenerateRequestsPerMinutePerProjectPerModel-FreeTier = 3   (retryDelay 15s)
 *   generate_content_free_tier_requests                  = 10
 *
 * Cái đầu là **mỗi phút** — chờ 15 giây là qua. Cái thứ hai KHÔNG hồi lại sau
 * ba lần chờ 21 giây, nên cửa sổ của nó dài hơn nhiều; gần như chắc chắn là
 * **mỗi ngày**. Đó là trần thật của tính năng này: ~10 lần đọc mỗi khoá mỗi
 * ngày. Bốn nhịp một video, tức khoảng hai video rưỡi.
 *
 * ⚠️ Con số 10 mới chỉ quan sát được một lần, chưa thấy nó reset. Nếu ngày mai
 * đọc được ngay từ sáng thì đúng là mỗi ngày; đừng ghi nó thành sự thật cho tới
 * lúc đó.
 *
 * **Hai khoá, hai hạn mức riêng.** Đo cùng lúc: `GEMINI_API_KEY` đã cạn trả 429
 * trong khi `GEMINI_API_KEY_2` vẫn trả 200. Nên xoay khoá không phải tối ưu vụn
 * vặt — nó là thứ nhân đôi số video làm được trong ngày.
 *
 * Hạn mức mỗi phút cũng cấm hẳn một kiểu thiết kế: gói cả bốn đoạn vào MỘT hàm
 * serverless thì hàm đó phải tự ngủ ~15 giây giữa chừng, và ngân sách thời gian
 * của một hàm trên Vercel không rộng đến thế. Vì vậy **mỗi đoạn là một request
 * riêng**, mỗi request ~4 giây; phía trình duyệt xếp hàng và chờ giúp.
 *
 * ── ĐỌC NHANH LÊN BẰNG CHỈ DẪN, KHÔNG BẰNG THAM SỐ ─────────────────
 *
 * Gemini TTS không có ô `rate`. Nó nhận **chỉ dẫn bằng tiếng Anh** đặt trước
 * lời đọc, và câu chỉ dẫn đó KHÔNG bị đọc lên. Đo trên cùng một câu:
 *
 *   đọc thô                        3,10s tiếng thật
 *   kèm chỉ dẫn đọc nhanh/hào hứng 2,14s tiếng thật
 *
 * 2,14s lọt được khung HOOK 0–2 giây; 3,10s thì không. Chỉ dẫn là bắt buộc,
 * không phải trang trí.
 */
import { khoaCuaNha } from '@/lib/ai/router/registry'
import { GIONG_MAC_DINH, laGiongHopLe } from './giongNoi'
import { catKhoangLang, docRate, giayCuaPcm } from './pcmWav'

const URL_TTS = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'gemini-2.5-flash-preview-tts'

/**
 * Chỉ dẫn cách đọc, đặt trước lời. Không bị đọc lên thành tiếng.
 *
 * ⚠️ Dấu hai chấm ở cuối là phần có tác dụng: thiếu nó thì mô hình dễ coi cả
 * câu chỉ dẫn là chữ cần đọc.
 */
const CHI_DAN = 'Read this as a fast, upbeat social video voiceover for a young '
  + 'American audience. Energetic but natural, no announcer voice, no pause '
  + 'before the first word:'

export type KetQuaDoc =
  | { ok: true; pcm: Uint8Array; rate: number; giay: number }
  | { ok: false; loi: string; choGiay?: number }

/** Số giây phải chờ, đọc từ `retryDelay` kiểu `"15s"` mà Google trả về. */
export function docChoGiay(j: unknown): number | undefined {
  const details = (j as { error?: { details?: { retryDelay?: string }[] } })?.error?.details
  for (const d of details ?? []) {
    const m = /^(\d+(?:\.\d+)?)s$/.exec(d?.retryDelay ?? '')
    if (m) return Math.ceil(Number(m[1]))
  }
  return undefined
}

/**
 * Đọc `chu` thành PCM 16-bit.
 *
 * Trả lỗi có chữ chứ không ném ngoại lệ: nơi gọi là một Route Handler của trang
 * admin, và người vận hành cần đọc được *vì sao* hỏng ngay trên màn hình điện
 * thoại — 429 vì hạn mức khác hẳn 400 vì sai tên giọng, mà cả hai đều là "không
 * ra tệp".
 */
export async function docThanhPcm(
  chu: string,
  giong: string = GIONG_MAC_DINH,
  env: Record<string, string | undefined> = process.env,
): Promise<KetQuaDoc> {
  // Dùng lại đúng danh sách khoá của bộ định tuyến AI. Đọc thẳng `GEMINI_API_KEY`
  // ở đây là bỏ quên khoá thứ hai — tức vứt đi một nửa hạn mức mỗi ngày.
  //
  // ⚠️ `khoaCuaNha` trả về **giá trị** khoá, không phải tên biến (tên biến là
  // `tenBienKhoa`). Tra `env[...]` một lần nữa lên giá trị đó thì ra rỗng, và
  // lỗi hiện ra là "chưa có GEMINI_API_KEY" — nghe y hệt như chưa khai báo khoá.
  const keys = khoaCuaNha('gemini', env)
  if (keys.length === 0) return { ok: false, loi: 'Chưa có GEMINI_API_KEY trên môi trường này.' }

  const loi = chu.trim()
  if (!loi) return { ok: false, loi: 'Chưa có chữ để đọc.' }
  if (!laGiongHopLe(giong)) return { ok: false, loi: `Giọng không hợp lệ: ${giong}` }

  let cuoi: KetQuaDoc = { ok: false, loi: 'Không khoá nào đọc được.' }
  for (const key of keys) {
    const r = await goiMotKhoa(loi, giong, key)
    // Chỉ hết hạn mức mới đáng thử khoá sau. Sai tên giọng hay chữ rỗng thì khoá
    // nào cũng hỏng như nhau — thử tiếp chỉ làm người dùng chờ lâu gấp đôi.
    if (r.ok || r.choGiay === undefined) return r
    cuoi = r
  }
  return cuoi
}

async function goiMotKhoa(loi: string, giong: string, key: string): Promise<KetQuaDoc> {
  let res: Response
  try {
    res = await fetch(`${URL_TTS}/${MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${CHI_DAN}\n\n${loi}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: giong } } },
        },
      }),
      cache: 'no-store',
    })
  } catch (e) {
    return { ok: false, loi: `Không gọi được Gemini TTS: ${(e as Error).message}` }
  }

  const j = await res.json().catch(() => null)
  if (!res.ok) {
    const mo = (j as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
    if (res.status !== 429) return { ok: false, loi: mo.slice(0, 200) }

    // ⚠️ HAI hạn mức khác hẳn nhau cùng trả về 429. Gộp chúng làm một là bảo
    // người dùng "chờ 15 giây rồi bấm lại" cho một cái trần mỗi ngày — họ sẽ
    // bấm lại mãi mà không bao giờ được gì, và tưởng là code hỏng.
    if (/generate_content_free_tier_requests/.test(mo)) {
      return { ok: false, loi: 'Hết hạn mức ĐỌC của hôm nay (khoảng 10 lần mỗi khoá). Chờ sang ngày mai, chờ vài phút không giải quyết được.' }
    }
    const cho = docChoGiay(j) ?? 15
    return { ok: false, choGiay: cho, loi: `Hết hạn mức tạm thời (3 lần/phút). Chờ ${cho} giây rồi bấm lại.` }
  }

  const phan = (j as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
  })?.candidates?.[0]?.content?.parts?.[0]?.inlineData

  if (!phan?.data) return { ok: false, loi: 'Gemini trả lời nhưng không kèm âm thanh.' }

  const rate = docRate(phan.mimeType)
  const pcm = catKhoangLang(Uint8Array.from(Buffer.from(phan.data, 'base64')), rate)
  // ⚠️ Một khối rỗng nghĩa là tệp câm — mà tệp câm vẫn tải về được, vẫn mở được,
  // và chỉ lộ ra khi người dùng đã dựng xong video. Chặn ở đây.
  if (pcm.length === 0) return { ok: false, loi: 'Đọc ra một đoạn rỗng — thử lại hoặc đổi giọng.' }

  return { ok: true, pcm, rate, giay: giayCuaPcm(pcm, rate) }
}
