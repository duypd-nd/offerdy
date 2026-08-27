# Bộ định tuyến nhà cung cấp AI

> Dựng 27/08/2026. Mục tiêu **không** phải sinh thêm nội dung — là **thôi trả tiền** cho
> những việc rẻ, và không để cron chết khi hết credit.

## Vì sao có nó

Đêm 26/08, production:

```
2026-08-26T01:11 UTC · release bf2e2ac · environment production
Error 400: "Your credit balance is too low to access the Anthropic API."
```

Cron `daily-report` chết vì hết credit. Năm generator loại "việc ngắn" đều gọi thẳng
Anthropic, nên không có đường lui nào.

## Việc nào đã đi qua router

| Việc | File | Ghi chú |
|---|---|---|
| `store-content` · `offer-content` · `deal-content` | `generateStoreContent/Offer/Deal.ts` | cron đêm |
| `caption` | `generateCaption.ts` | |
| `daily-report` | `generateDailyReport.ts` | ✅ đã chạy thật bằng `groq/openai/gpt-oss-20b` 27/08 |
| `article-names` | `nameArticleIdeas.ts` | **nối 28/08** — xem mục ngay dưới |

## `article-names` — nối 28/08, và ba thứ phép đo lật ngược

Đo thật trên IBIZ Jewel (250 sản phẩm quét từ Shopify, 8 ý tưởng qua cổng kiểm),
cùng đầu vào, **chỉ đổi nhà**:

| Nhà | Model | Thời gian | Đặt được / hậu kiểm loại |
|---|---|---|---|
| groq | openai/gpt-oss-20b | 506ms | ❌ **HTTP 413** — TPM 8000 < 16.303 token của một lần gọi |
| gemini | gemini-3.5-flash-lite | 5.337ms | 2 / **6 bị loại** |
| gemini | gemini-3.6-flash | ❌ **hết 30s × 2 khoá** | — |
| openrouter | nemotron-3-super-120b | **72.625ms** | **8 / 0** |

1. **Groq không dùng được cho việc này.** Không phải vì model dở — vì *prompt dài*.
   Đặt tên gửi cả danh mục sản phẩm đi, 16.303 token, vượt hạn mức 8.000 token/phút
   của free tier. Router chuyển nhà đúng như thiết kế, nên **không ai thấy gì cả**;
   chỉ có dòng log mới nói ra.
2. **"0 bị loại" không có nghĩa là tên hay.** Nemotron qua hết hậu kiểm nhưng đẻ ra
   `Round Cut Stud Earrings V1 vs V2 vs V3 vs V4` — `V1/V2/V3` là hậu tố kỹ thuật
   trong slug. Hậu kiểm cho qua vì mọi từ **truy ngược được** về tên sản phẩm nguồn;
   nó chưa bao giờ là thước đo hay/dở. Còn Gemini bị loại 6/8 vì dùng những từ tự
   nhiên hơn — *collection*, *styles*, *comparing* — mà không truy ngược được.
   **Hàng rào này được hiệu chỉnh cho Claude**; đổi nhà thì trượt theo kiểu khác.
3. **72,6 giây** trong khi thời hạn khai báo là 30 — xem mục ngay dưới.

## ⚠️ Hàng rào thời hạn từng tồn tại mà không chặn gì

`clearTimeout` nằm ngay sau `fetch()`, tức đồng hồ bị dọn khi **header** về. API sinh
chữ trả header gần như tức thì rồi mới sinh nội dung, nên **đoạn lâu nhất của cả lần
gọi không có hàng rào nào**. Gemini che mất lỗi này vì nó không trả header sớm.

Hậu quả thật: `maxDuration = 60` → Vercel giết function trước, và thứ nhìn thấy chỉ là
một cron chết không rõ lý do.

Sửa 28/08: đồng hồ sống tới khi đọc xong thân. Test `⚠️ thoi han phai phu ca luc DOC
THAN` bắt đúng hình đó — gỡ bản vá ra thì nó mất 3.014ms và **thành công**, lắp vào thì
91ms và ném lỗi. `AI_TIMEOUT_MS` có để test đo được mà không phải chờ 30 giây.

## Nó KHÔNG làm gì

⚠️ Router chỉ phục vụ **một kiểu gọi**: sinh một object đúng schema
(`generateStructured`). Sau khi nối `article-names` (28/08) còn **đúng 5 file** gọi
thẳng Anthropic, chia hai nhóm:

- **Streaming thuần** — `generateArticleContent`, `generateReviewContent`,
  `generateVideoScript`. Dùng `messages.stream` + `finalMessage()`, lý do đã trả giá
  ở ngay dưới.
- **Có ảnh thật** — `judgeImages`, `judgeTransitions` gửi ảnh base64. Router chưa có
  đường ảnh; nối được nhưng phải viết phần gửi ảnh riêng cho từng nhà.

📌 `generateArticleContent` **không** gửi ảnh cho model — `[IMAGE:n]` chỉ là ô chèn
dạng chữ. Nó thuộc nhóm streaming, đừng xếp nhầm sang nhóm ảnh.

Vì sao ba file streaming không nối được:

1. `max_tokens` chặn **thinking + chữ cộng lại**. Đo thật: 3/3 lần chạy ở 12000 trả về
   12.000 token thinking và **không một chữ nào**.
2. `messages.parse` parse **trước** khi đọc được `stop_reason`, nên hàng rào chặn bài bị
   cắt thành code chết.

Gemini/Groq không có `stop_reason` cùng ngữ nghĩa, không có ngân sách thinking tương đương.
Ép chúng qua một giao diện chung là làm bay hai hàng rào đó — **im lặng**. Giới hạn này
là **có chủ ý**.

## Thứ tự mặc định, và nó đến từ đâu

Đo 27/08, cùng system prompt + prompt + schema thật của `generateOfferContent`,
chỉ đổi model:

| Nhà | Model | ms | Bịa đặt |
|---|---|---|---|
| groq | qwen3.8-27b | **581** | không |
| groq | openai/gpt-oss-20b | **713** | không |
| groq | openai/gpt-oss-120b | 1121 | không |
| gemini | gemini-3.5-flash-lite | 1428 | không |
| gemini | gemini-3.6-flash | 4302 | không |
| openrouter | nemotron-3-super | 6472 | không |
| openrouter | dots-3-note | 17578 | không |

→ **groq → gemini → openrouter → anthropic**.

📌 **Một kết quả lật ngược giả định.** Vòng đo đầu tiên tôi đưa OpenRouter một system prompt
rút gọn; nó bịa ra *"hand-forged Japanese steel"*, *"mirror finish"* — suýt kết luận "model
miễn phí hay bịa". Chạy lại với **đúng** system prompt của dự án thì **cả 8 model đều không
bịa một chữ nào**. Thứ chặn bịa đặt là **cái prompt**, không phải cái model. Đừng đổi prompt
rồi so hai lần chạy.

⚠️ n=1 mỗi model. Đủ để chọn mặc định, **không** đủ để kết luận chắc.

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `GROQ_API_KEY`, `GROQ_API_KEY_2` | không | thiếu = Groq coi như không tồn tại |
| `GEMINI_API_KEY`, `GEMINI_API_KEY_2` | không | |
| `OPENROUTER_API_KEY`, `OPENROUTER_API_KEY_2` | không | |
| `ANTHROPIC_API_KEY` | **có** | nhà cuối, và là nhà duy nhất tính tiền |
| `AI_PROVIDER_ORDER` | không | vd `gemini,groq,anthropic`. Tên rác bị bỏ qua, không làm sập |
| `AI_MODEL_GROQ` / `_GEMINI` / `_OPENROUTER` / `_ANTHROPIC` | không | đè model mặc định |
| `AI_TASK_PROVIDER_daily_report` | không | ép một việc dùng đúng một nhà, **không** rơi xuống nhà khác |
| `AI_TIMEOUT_MS` | không | mặc định **30.000**. Thời hạn một lần gọi một nhà, tính cả lúc đọc thân |
| `AI_PAID_MAX_CALLS` | không | mặc định **25**. Số lần gọi nhà trả phí tối đa **trong một vòng chạy**. `0` = cấm hẳn |

📌 **Khoá thứ hai (`_2`) không phải bản sao dự phòng** — free tier tính hạn mức theo từng
khoá, nên nó là một nguồn hạn mức thật sự khác.

⚠️ Nhớ thêm các khoá này vào **Vercel** — `.env.local` chỉ có tác dụng ở máy.

## Hành vi khi chưa có khoá miễn phí nào

Nhà nào không có khoá thì `isAvailable()` trả `false` và bị bỏ qua **lặng lẽ**. Router rơi
thẳng xuống Claude — **đúng cách 5 generator vẫn chạy từ trước 27/08**. Nhờ vậy bản vá kiểm
được ngay cả khi chưa đăng ký API nào.

## Ba hàng rào

**Ngân sách** (`budget.ts`) — kịch bản tốn tiền thật không phải "Claude đắt", mà là *ba nhà
miễn phí cùng hết quota trong một đêm* rồi một vòng sinh nội dung cả mẻ lặng lẽ rơi hết
xuống Claude. Bộ đếm tính **lần gọi**, không tính lần thành công: một Claude đang lỗi vẫn
tiêu tiền mỗi lần gọi.

**Cầu dao** (`breaker.ts`) — hỏng 3 lần liên tiếp thì nghỉ 60 giây. Free tier tính theo số
request, không theo request thành công. Lỗi `auth` **không** tính vào cầu dao: khoá gõ nhầm
là lỗi cấu hình, không phải nhà đó chập chờn.

**Kiểm lại đầu ra** — luôn `safeParse` bằng chính schema Zod. `strict: true` **không** bảo
đảm: đo 27/08 có một lần `gemini-3.6-flash` trả JSON cụt giữa chừng.

⚠️ Cả ngân sách lẫn cầu dao đều nằm **trong bộ nhớ tiến trình**. Trên Vercel mỗi lần gọi hàm
có thể là một tiến trình khác, nên chúng chặn được **một vòng chạy** (đúng nguy cơ thật: 451
deal trong một vòng), **không** chặn được tổng cả ngày. Đưa trạng thái này vào Sanity nghĩa
là ghi vào dataset **công khai** — chưa đáng.

## Bẫy đã trả giá khi dựng

1. **Danh sách model nói một đằng, lệnh gọi nói một nẻo.** `GET /v1beta/models` liệt kê
   `gemini-2.5-flash` và `gemini-2.5-flash-lite`; `:generateContent` trả **404** cho đúng
   những tên đó (*"no longer available to new users"*). Chính thông báo lỗi chỉ ra tên đúng.
2. **Gemini nhận tập con OpenAPI, không phải JSON Schema đầy đủ.** `$schema` và
   `additionalProperties` làm nó trả 400 — và phải dọn ở **mọi tầng**, sót tầng trong thì
   lỗi hiện ra ở gốc, rất dễ đi sửa nhầm chỗ.
3. **`thinkingConfig: { thinkingBudget: 0 }` trả 400** trên `gemini-3.6-flash`: không tắt
   thinking được.
4. **Test dùng nhà giả không chạm vào phần đọc cấu hình.** 20 test xanh trong khi
   `AI_MODEL_GROQ` truyền vào `generateStructured` **không có tác dụng gì** — adapter tự đọc
   `process.env`. Chỉ lần chạy thật mới lộ. Nay có `tests/aiRouter.test.ts` mục 9 dùng nhà
   **thật** để giữ chỗ này.
5. **Ghi `model: MODEL` vào Sanity sau khi nối router là một dòng dữ liệu nói dối** — báo
   cáo sẽ nói Claude viết trong khi Groq viết. Nay ghi `${provider}/${model}` thật.

## Đo lại

```
npx tsx .scratch/do-router-that.mts
```

Ba phép, mỗi phép phân biệt được một thứ: (1) nhà nào thật sự viết, (2) ép hỏng nhà đầu có
rơi xuống nhà sau không, (3) hết ngân sách có **ném** chứ không lặng lẽ gọi Claude không.
