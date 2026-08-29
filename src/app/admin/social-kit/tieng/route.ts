import { NextResponse, type NextRequest } from 'next/server'
import { currentAdmin } from '@/lib/adminSession'
import { tenAnToan } from '@/lib/zipStore'
import { docGopMotLan, docThanhPcm } from '@/lib/tts/geminiVoice'
import { ghepPcm, giayCuaPcm, wavTuPcm } from '@/lib/tts/pcmWav'

/**
 * Đọc một nhịp lời thành tệp WAV tải về được.
 *
 * ── MỘT NHỊP MỘT REQUEST — VÌ SAO ──────────────────────────────────
 *
 * Hạn mức Gemini TTS đo được ngày 29/08, lấy thẳng từ phần `details` của lỗi
 * 429: `GenerateRequestsPerMinutePerProjectPerModel-FreeTier = 3`, thử lại sau
 * 15 giây. Gói cả bốn nhịp vào một hàm serverless thì hàm đó buộc phải tự ngủ
 * ~15 giây giữa chừng để chờ hạn mức — nuốt gần hết ngân sách thời gian của
 * một hàm, và nếu vượt thì mất trắng cả bốn nhịp chứ không phải một.
 *
 * Tách ra thì mỗi request chỉ ~4 giây, và một nhịp hỏng chỉ cần đọc lại nhịp
 * đó. Việc xếp hàng và chờ do trình duyệt lo — nó có sẵn thời gian, hàm
 * serverless thì không.
 *
 * ── VÌ SAO WAV CHỨ KHÔNG PHẢI MP3 ──────────────────────────────────
 *
 * Đóng mp3 cần ffmpeg, mà `/admin/*` chạy trên Vercel thì không có ffmpeg (xem
 * PROJECT_CONTEXT mục "Rendering runs locally"). WAV chỉ là 44 byte đầu ghép
 * với mẫu thô, làm được bằng JS thuần. CapCut nhập WAV bình thường; đổi lại là
 * tệp nặng hơn — khoảng 1 MB cho hai mươi giây, vẫn nhẹ để tải trên điện thoại.
 *
 * ⚠️ Đường này TIÊU HẠN MỨC API và chỉ mở cho người đã đăng nhập. Nó nằm dưới
 * `/admin` nên `src/proxy.ts` đã gác sẵn; kiểm phiên lần nữa ở đây vì một cái
 * cổng tiêu tiền thì không nên chỉ dựa vào một lớp bảo vệ.
 */

/** Chặn trên cho một nhịp. Nhịp dài nhất trong `NHIP` là 8 giây ≈ 18 chữ. */
const TOI_DA_CHU = 400
/** Khoảng nghỉ chèn giữa các nhịp khi ghép cả bài thành một tệp. */
const NGHI_GIAY = 0.35

type ThanBai = {
  chu?: unknown; doan?: unknown; giong?: unknown; ten?: unknown
  /** Đọc cả bài trong MỘT lần gọi rồi cắt lại — tiết kiệm hạn mức gấp bốn. */
  gop?: unknown
}

function docDoan(than: ThanBai): string[] | { loi: string } {
  if (typeof than.chu === 'string') {
    return than.chu.trim() ? [than.chu.trim()] : { loi: 'Chưa có chữ để đọc.' }
  }
  if (Array.isArray(than.doan)) {
    const ds = than.doan.filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
      .map(d => d.trim())
    // ⚠️ Chặn ở 3: đó đúng bằng hạn mức mỗi phút. Cho phép 4 nhịp trong một
    // request nghĩa là request cuối chắc chắn ăn 429 sau khi đã tiêu 3 lần gọi
    // — tốn hạn mức mà không ra tệp nào.
    if (ds.length === 0) return { loi: 'Danh sách đoạn rỗng.' }
    // 6 là trần an toàn cho ĐƯỜNG GỘP (một lần gọi). Đường từng-nhịp bên dưới
    // tự chịu hạn mức 3 lần/phút và trình duyệt lo việc chờ.
    if (ds.length > 6) return { loi: 'Nhiều nhất 6 đoạn một lần.' }
    return ds
  }
  return { loi: 'Thiếu `chu` hoặc `doan`.' }
}

export async function POST(request: NextRequest) {
  if (!(await currentAdmin())) return new NextResponse('Chưa đăng nhập', { status: 401 })

  let than: ThanBai
  try { than = await request.json() } catch { return new NextResponse('Thân yêu cầu không phải JSON', { status: 400 }) }

  const doan = docDoan(than)
  if ('loi' in doan) return new NextResponse(doan.loi, { status: 400 })
  if (doan.some(d => d.length > TOI_DA_CHU)) {
    return new NextResponse(`Một đoạn dài quá ${TOI_DA_CHU} ký tự.`, { status: 400 })
  }

  const giong = typeof than.giong === 'string' ? than.giong : undefined
  const ten = tenAnToan(typeof than.ten === 'string' ? than.ten : 'loi-doc', 'loi-doc')

  // ── Đường GỘP: một lần gọi cho cả bài ────────────────────────
  //
  // Hạn mức là ~10 lần đọc mỗi khoá mỗi ngày, nên bốn lần gọi cho một video là
  // ~5 video/ngày, còn một lần gọi là ~20. Khác biệt đó lớn hơn mọi thứ khác ở
  // đường này.
  if (than.gop === true && doan.length >= 2) {
    const r = await docGopMotLan(doan, giong)
    // ⚠️ Gộp hỏng thì trả lỗi và DỪNG, không lặng lẽ rơi xuống đọc từng nhịp
    // bên dưới. Đường lùi nằm ở phía trình duyệt — nó đã có sẵn vòng đọc từng
    // nhịp, biết chờ hạn mức, và quan trọng hơn: người dùng nhìn thấy nó đang
    // làm gì. Một hàm serverless lặng lẽ tiêu bốn lần gọi thay vì một thì
    // người vận hành không có cách nào biết hạn mức đi đâu mất.
    if (!r.ok) {
      return new NextResponse(r.loi, {
        status: r.choGiay ? 429 : 502,
        headers: r.choGiay ? { 'Retry-After': String(r.choGiay) } : undefined,
      })
    }
    // ⚠️ `r.doan === null` nghĩa là ĐỌC ĐƯỢC nhưng không tìm đủ khoảng lặng để
    // cắt chắc. Khi đó giao một tệp LIỀN và nói rõ qua `x-cat: khong` — không
    // bao giờ cắt bừa, vì clip đứt giữa từ vẫn mở được và chỉ lộ ra sau khi
    // người dùng đã dựng xong video.
    return traWav(wavTuPcm(r.pcm, r.rate), ten, giayCuaPcm(r.pcm, r.rate), {
      'x-cat': r.doan ? r.doan.map(d => d.length).join(',') : 'khong',
      'x-rate': String(r.rate),
    })
  }

  const khoi: Uint8Array[] = []
  let rate = 0

  for (const d of doan) {
    const r = await docThanhPcm(d, giong)
    if (!r.ok) {
      // ⚠️ Trả đúng 429 khi là 429, kèm `Retry-After`. Gộp mọi lỗi thành 500 thì
      // phía trình duyệt không phân biệt được "chờ 15 giây là chạy" với "hỏng
      // thật", nên nó sẽ thử lại vô ích hoặc bỏ cuộc vô cớ.
      const status = r.choGiay ? 429 : 502
      return new NextResponse(r.loi, {
        status,
        headers: r.choGiay ? { 'Retry-After': String(r.choGiay) } : undefined,
      })
    }
    khoi.push(r.pcm)
    rate = r.rate
  }

  const pcm = khoi.length === 1 ? khoi[0] : ghepPcm(khoi, NGHI_GIAY, rate)
  // ⚠️ KHÔNG gửi `x-cat` ở đây. Đường này ghép các nhịp KÈM khoảng nghỉ
  // NGHI_GIAY, nên độ dài từng khối không phải mốc cắt — trình duyệt cắt theo
  // đó sẽ lệch dần từ đoạn thứ hai trở đi. Mốc cắt chỉ có nghĩa ở đường gộp.
  return traWav(wavTuPcm(pcm, rate), ten, giayCuaPcm(pcm, rate), { 'x-rate': String(rate) })
}

function traWav(wav: Uint8Array, ten: string, giay: number, them: Record<string, string>) {
  return new NextResponse(wav as unknown as BodyInit, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Disposition': `attachment; filename="${ten}.wav"`,
      'Content-Length': String(wav.length),
      // Để giao diện in ra độ dài thật thay vì ước lượng theo số chữ.
      'x-giay': giay.toFixed(2),
      'Cache-Control': 'no-store',
      ...them,
    },
  })
}
