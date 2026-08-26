# Offerdy — Việc đang làm

> **File này chỉ chứa việc đang làm.** Nhật ký các điểm dừng đã khép nằm ở
> [`docs/NHAT_KY.md`](docs/NHAT_KY.md) — 2.400 dòng, giữ nguyên văn vì chứa số đo đã
> tốn công đo và bẫy đã trả giá. Đừng chép chúng ngược lại vào đây.

---

## 🔖 Điểm dừng 2026-08-27

### ✅ Hai phép kiểm production đã hẹn — cả hai ĐẠT

Production đang chạy `bf2e2ac` (hỏi Sentry releases, không đoán theo "đã push"):
`created=2026-08-25T17:55:54Z`.

**Ô *Canonical URL*** — HTML trang chủ production: `<link rel="canonical">`, `og:url` và
`"url"` trong JSON-LD đều là `https://www.offerdy.com`.
⚠️ Riêng phép đo này **không** chứng minh code mới đang chạy — giá trị đó **giống hệt**
trước và sau bản vá (luật 8c). Thứ chứng minh là dòng release ở trên.

**Cron `daily-report` báo lỗi thay vì chết im lặng** — đêm 26/08 nó chết vì hết credit
Anthropic và **đã kêu thật**:

| | Sự kiện test tay 25/08 | Sự kiện đêm 26/08 |
|---|---|---|
| Thời điểm | 2026-08-25T15:59 UTC | **2026-08-26T01:11 UTC** (cron `0 1 * * *`) |
| release | `3003a3f` | **`bf2e2ac`** ← bản vá |
| environment | `local` | **`production`** |
| `extra` keys | backup, cron, pruned | **backup, cron, pruned** |

Ba khoá đó khớp đúng `extra: { backup, pruned, cron: 'daily-report' }` ở
[`route.ts:67`](src/app/api/cron/daily-report/route.ts) — nên chắc chắn nó đến từ
`captureException` mới.

⚠️ **Chỗ suýt đọc sai:** điểm dừng 26/08 chờ *"một issue MỚI mang culprit
`GET /api/cron/daily-report`"*. Sentry **gộp vào issue cũ `JAVASCRIPT-NEXTJS-1F`**, và
culprit trên production hiện ra là `s.generate(node_modules_02uqxih._)` (stack đã rút gọn).
Nếu chỉ đếm "có issue mới không" thì đã kết luận **sai là bản vá hỏng**. Phải mở sự kiện ra
đọc `release` + `environment` mới phân biệt được.

### 🎯 Mốc 27/08: `0/65` → **28/65**. Google ĐÃ bò và ĐÃ lập chỉ mục.

Đo bằng URL Inspection API trên **71 URL** lấy thẳng từ sitemap production (6 hub + 42 blog
+ 23 review). Script: `.scratch/` — xem mục *Cách đo lại* bên dưới.

| | 20/08 | **27/08** |
|---|---|---|
| Trang nội dung đã được bò | 0 / 65 | **28 / 65** |
| Trang nội dung trong chỉ mục | 0 / 65 | **28 / 65** |
| Tổng URL trong chỉ mục (kể hub) | 3 | **34 / 71** |
| Sitemap | 197 URL | 198 URL · 107 store · 42 blog · 23 review · **0 deal** |

**Bò được là vào chỉ mục luôn — 28/28.** Không có trang nào "đã bò mà bị loại".

### ⚠️ Nhưng chia đôi rất gắt: review **23/23**, blog **5/42**

| Trạng thái | Số bài blog |
|---|---|
| `Submitted and indexed` (bò 24/08) | **5** |
| `Discovered - currently not indexed` | **33** ← Google **biết** URL, **chọn không bò** |
| `URL is unknown to Google` | **4** |

### ❌ SỬA KẾT LUẬN: **không** phải khuôn blog bị chê chất lượng

> Trong vòng một buổi 27/08 tôi kết luận *"(b) đánh giá chất lượng, ở cấp khuôn bài blog"*
> rồi **tự bác bỏ bằng phép đo tiếp theo**. Giữ nguyên cả hai ở đây để lần sau đừng đi lại.

5 bài blog được bò là **đúng vị trí #1–#5 trong sitemap, liền một dải**:

```
# 1 (abs 126)  >>> DA BO <<<  best-baby-zip-swim-rompers-at-babywonders-2026
# 2 (abs 127)  >>> DA BO <<<  best-kids-cameras-at-bloomingbabies-2026
# 3 (abs 128)  >>> DA BO <<<  sc15-vs-sc21-vs-sc25-soft-cooler-bags-compared-2026
# 4 (abs 129)  >>> DA BO <<<  12-volt-car-refrigerator-vs-portable-refrigerator-...
# 5 (abs 130)  >>> DA BO <<<  12-volt-car-refrigerator-58l-vs-15l-compared-2026
# 6 (abs 131)                 12-inch-childrens-mountain-bike-vs-24-inch-...
```

Nếu Google chọn theo chất lượng thì 5 bài "được chọn" rơi trúng 5 vị trí đầu là xác suất
**1 / 850.668**. Đây là **hàng đợi đang chạy dở** — bò blog mới bắt đầu **24/08**, ba ngày
trước lúc đo.

📌 **Nên ĐỪNG viết lại 33 bài blog.** Chưa có một bằng chứng nào nói chúng có vấn đề.
Câu hỏi *"viết thêm bài AI có đào sâu hố không"* hiện **vẫn chưa trả lời được**.

⚠️ Một giả thuyết nữa cũng **tự bác bỏ**: định nói *"`/comparisons` bò từ 07/08 nên blog
thiệt"*. Nhưng `/reviews` bò từ **28/07** — cũ hơn — mà cả 23 review đều được bò. **Ngày bò
của trang hub không giải thích được gì.**

📅 **Đo lại 30/08** để biết tốc độ bò (bao nhiêu bài/ngày). Chỉ khi hàng đợi chạy hết mà
vẫn còn bài bị bỏ thì mới nói được tới chất lượng.

### Hai thứ khác đo ra được trong lúc truy phần trên

**1. `/blog` chỉ phơi 10/42 bài trong HTML máy chủ.**
[`BlogPageContent.tsx:59`](src/components/BlogPageContent.tsx) — `'use client'` +
`useState(1)` + `.slice()`. **Đúng họ lỗi của 83 trang store mồ côi** đã sửa 21/08.
⚠️ Nhưng nói cho công bằng: 42 bài **không** mồ côi — đo cả 12 trang hub thì `/comparisons`
link đủ **42/42**. Lỗi là thật, **lợi ích SEO là suy đoán**, chưa đo được.

**2. Ô *Canonical URL* hôm qua chưa đi tới đâu như đã tưởng** — xem mục riêng bên dưới.

### ✅ Nối nốt ô *Canonical URL* — nay điều khiển thật, đã đo đầu-cuối

| | Trước (đo 27/08) | Sau |
|---|---|---|
| File tự khai `const BASE` dưới `src/app` | **22** | **0** |
| `canonical:` / `og:url` ghi cứng địa chỉ | **14** | **0** |
| File nối được vào ô cấu hình | **1** (`layout.tsx`) | **14** |
| `npm test` | 582 | **587** |

**Cách chữa KHÔNG phải thay 53 chuỗi.** Tài liệu Next trong `node_modules` cho lối gọn hơn:

> *"If a metadata field provides an absolute URL, `metadataBase` will be ignored."*
> — `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`

Nên chia **hai đường, không lẫn nhau**:

| Loại | Cách |
|---|---|
| Trường `Metadata` (`canonical`, `og:url`) | **đường dẫn tương đối** — `'/about'`, `` `/deals/${slug}` `` — để `metadataBase` ghép |
| JSON-LD · `sitemap.ts` · `robots.ts` · `llms.txt` · link chia sẻ | `await getSiteBase()` — Next không ghép hộ |

`getSiteBase()` ở [`src/sanity/queries.ts`](src/sanity/queries.ts) dùng **`freshClient` + hai lớp
cache**, đúng khuôn `getSiteName()` — đọc qua CDN ở đây là dính lại bẫy "ướp giá trị cũ 300s"
của 25/08. Hàm thuần (`dealSchema`, `dealPreviewHtml`) nhận `base` qua **tham số**,
`ShareDeal` (client) qua **prop** — vì `lib/*` không được import `@/sanity/queries`.

**Số đo đầu-cuối** (`npm start` :3100, đổi ô sang `shop.dealwise-test.example` rồi trả về):

| Trang | Đổi theo ô? |
|---|---|
| `/about` — canonical · og:url · JSON-LD của layout · JSON-LD của trang | ✅ cả 4 |
| `/how-we-test` · `/privacy` — canonical · og:url | ✅ |
| `/sitemap.xml` · `/llms.txt` | ✅ |
| `/robots.txt` | ✅ nhưng **trễ tới 5 phút** — nó là trang tĩnh `revalidate 5m` |

### ⚠️ Ba cái bẫy trả giá trong lúc làm — cái thứ hai là lỗi thật

**1. Phép đo tự phá chính nó.** Vòng chờ "server sẵn sàng" gọi `/robots.txt` **trước khi**
đổi giá trị → `unstable_cache` ướp giá trị cũ 300s → đo ra "không đổi gì". Suýt đọc thành
"bản vá hỏng". Phải **ghi giá trị TRƯỚC, bật server SAU**, và chờ sẵn sàng bằng **log**
(`grep "Ready in"`) chứ không gọi trang.

**2. `layout.tsx` đọc ô đó qua ĐƯỜNG KHÁC — lỗi thật, đã sửa.** Nó dùng
`siteBaseUrl(seo.canonicalUrl)` với `getConfigSeo()` đi qua **CDN Sanity**, còn cả site đọc
tươi. Kết quả đo được: `sitemap`/`robots`/`llms.txt` đổi tên miền ngay trong khi `canonical`
và JSON-LD của layout **vẫn giữ tên cũ**. Đúng "một nguồn sự thật mà hai đường đọc" — và trớ
trêu là chú thích cảnh báo điều đó nằm ngay cạnh dòng gây lỗi. Nay layout cũng dùng
`getSiteBase()`.

**3. `unstable_cache` SỐNG QUA khởi động lại server.** Nó nằm ở `.next/cache/fetch-cache`,
không phải trong bộ nhớ. Trả giá trị về rồi restart mà trang vẫn phát giá trị test — không
phải hỏng, là cache. Muốn đo ngay thì `rm -rf .next/cache/fetch-cache`. (Trên production
nút **Lưu** gọi `revalidatePath('/', 'layout')` nên không phải chờ.)

### Hàng rào mới: [`tests/metadataBaseGuard.test.ts`](tests/metadataBaseGuard.test.ts) — 5 test

Quét mã nguồn `src/app`, chặn (a) ghi cứng địa chỉ vào `canonical`/`og:url`, (b) khai lại
`const BASE`, (c) đặt `metadataBase` ở hai nơi.

📌 **Và nó bắt được lỗi của chính nó.** Test *"hàng rào phải KÊU trên dòng xấu"* lộ ra rằng
mẫu quét đầu tiên neo `^\s*canonical:` nên **không bắt được** dạng phổ biến nhất
`alternates: { canonical: '...' }` — nó xanh chỉ vì không nhìn thấy gì. Một hàng rào chỉ
kiểm chiều "không có gì lọt" thì xanh y hệt khi nó mù.

### ⚠️ CỐ Ý CHƯA LÀM — mặt short link vẫn ghi cứng tên miền

Đường SEO đã nối hết. **Đường short link / QR / caption thì chưa**, và đó là lựa chọn có
chủ ý chứ không phải sót:

| Chỗ | Dùng để |
|---|---|
| `src/app/admin/deals/DealAdmin.tsx` — `SHORT_LINK_BASE` | nút Copy link `/d/<mã>` trong admin |
| `src/lib/socialCaption.ts` — `FULL_BASE`, `DISPLAY_BASE` | caption mạng xã hội, QR, clipboard |
| `src/app/admin/social-kit/actions.ts` | `shortUrl` cho bộ đăng bài |
| `src/lib/safeFetch.ts` | chuỗi User-Agent `OfferdyBot`, không phải địa chỉ trang |

Vì sao dừng: chúng **không ảnh hưởng SEO**, đều nằm sau `/admin`, và `socialCaption.ts` là
hàm thuần đang có test riêng cùng bộ dựng video — đụng vào là mở một mặt trận khác trong
cùng một lượt. Hàng rào `const BASE` **chỉ quét `src/app` trừ `/admin`**, nên nó không kêu
oan ở đây.

📌 Hệ quả nếu thật sự đổi tên miền: QR và caption sẽ trỏ về tên miền cũ. **Nhớ mục này.**

### ✅ Bộ định tuyến AI — Claude thôi làm nhà duy nhất

Việc này bắt đầu từ một prompt ChatGPT đề xuất dựng cả "affiliate automation platform".
**Chỉ lấy §4–§8 + §55–§56 của nó**; phần còn lại bỏ, lý do ghi ở cuối mục.

Chi tiết đầy đủ: [`docs/AI_ROUTER.md`](docs/AI_ROUTER.md). Tóm tắt:

| | |
|---|---|
| Thứ tự mặc định | **groq → gemini → openrouter → anthropic** (đo thật, không phải cảm giác) |
| Generator đã nối | 5 file kiểu `messages.parse` (offer, deal, store, caption, daily-report) |
| Generator **không** nối | 6 file kiểu `messages.stream` — giữ nguyên Claude, có lý do |
| `npm test` | **608** (587 + 21 test router) |

**Đo thật qua router** (`npx tsx .scratch/do-router-that.mts`):

```
1. binh thuong        -> groq/openai/gpt-oss-20b        622ms  ✓
2. ep hong nha dau    -> gemini/gemini-3.5-flash-lite  1054ms  ✓ (roi xuong dung)
3. het ngan sach      -> NEM: anthropic(het-ngan-sach)         ✓ (khong lang le goi Claude)
```

⚠️ **Tính chất quan trọng nhất: chưa có khoá miễn phí thì hành vi y hệt trước 27/08.**
Nhà không có khoá bị bỏ qua lặng lẽ → rơi thẳng xuống Claude.

### ⚠️ Bốn cái bẫy trong buổi này, hai cái là lỗi thật của tôi

1. **Danh sách model nói một đằng, lệnh gọi nói một nẻo.** `GET /v1beta/models` liệt kê
   `gemini-2.5-flash*`; `:generateContent` trả **404** cho đúng tên đó.
2. **Tôi kết luận "model miễn phí hay bịa" từ một phép so sánh không hợp lệ** — đưa
   OpenRouter prompt rút gọn còn Groq/Gemini prompt thật. Chạy lại cùng đầu vào:
   **cả 8 model đều không bịa một chữ.** Thứ chặn bịa đặt là **prompt**, không phải model.
3. **20 test xanh mà cờ cấu hình vô hiệu.** `AI_MODEL_GROQ` truyền vào `generateStructured`
   không có tác dụng gì — adapter tự đọc `process.env`. Test dùng **nhà giả** nên không hề
   chạm vào phần đọc cấu hình. Chỉ lần chạy thật mới lộ. Nay test mục 9 dùng nhà **thật**.
4. **Bản vá tự tạo ra một dòng dữ liệu nói dối**: vẫn ghi `model: MODEL` vào Sanity, tức
   báo "claude-sonnet-5" kể cả khi Groq viết. Nay ghi `${provider}/${model}` thật.

### 🔴 Việc của user

- [ ] **Xoay lại 6 khoá API** — chúng đã dán thẳng vào khung chat nên coi như đã lộ.
- [ ] Thêm `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` (+ bản `_2`) vào **Vercel**.
      `.env.local` chỉ có tác dụng ở máy này — cron trên production vẫn sẽ chết nếu thiếu.
- [ ] Nạp credit Anthropic (vẫn cần: 6 generator kiểu streaming chưa có đường lui).

### Vì sao KHÔNG làm phần còn lại của prompt

Prompt giả định Prisma + Supabase/PostgreSQL — dự án dùng **Sanity**, và
[`docs/adr/0001-khong-dung-supabase.md`](docs/adr/) đã chốt không dùng Supabase. Nó đòi xây
lại Search Console, GA4, chống bịa đặt, schema markup, cron — **tất cả đã có**. Nó đòi
adapter **Awin** trong khi dự án chạy **GoAffPro**. Và 8 bảng nó đề xuất, ở Sanity, sẽ nằm
trong dataset **CÔNG KHAI**.

📌 Lý do lớn nhất: nó tăng tốc **sản xuất nội dung**, trong khi đo sáng nay cho thấy
**33/42 bài blog đang ở `Discovered – currently not indexed`** — Google biết URL và **chọn
không bò**. Đổ thêm nội dung vào đúng lúc đó không giúp gì.

### Còn phải làm trước khi coi là xong

- [ ] **Kiểm trên production sau khi deploy**: gọi `/sitemap.xml`, `/robots.txt`, `/llms.txt`
      và `/about`, cả 4 phải mang `https://www.offerdy.com`. (Giá trị giống hệt trước và sau
      nên phép kiểm này **không** phân biệt được code mới/cũ — muốn chắc thì đối chiếu
      Sentry release như sáng 27/08.)
- [ ] Chưa commit. `npm test` **608** · `tsc` sạch · `build` sạch.

### ⚠️ Không phải phép so sánh sạch — ba biến đổi cùng lúc

Quanh 20–21/08 có **ba** thay đổi, không phải một:

1. Sitemap **hết đóng băng** (`force-dynamic`) — trước đó nó kẹt ở bản build **8 ngày** trước
2. Cắt **451 deal** khỏi sitemap
3. Mục lục A–Z cho **83 trang store mồ côi** lần đầu có link nội bộ

Nên **không quy công cho riêng phép cắt deal được**. Nghi can chính thật ra là (1) — một
sitemap chết 8 ngày thì Google không có gì mới để bò.

📌 **Mốc 03/09 (trả 451 deal về sitemap) — nay trả lời được: ĐỪNG TRẢ VỀ.** Chỉ mục đi từ
3 lên 34 sau khi cắt. Không có lý do lật lại.

### 📉 Chỉ mục lên, nhưng lưu lượng CHƯA theo

14 ngày (11/08 → 24/08, GSC trễ 2 ngày): **31 lượt hiển thị cấp site · 1 lượt bấm**.

**Lượt bấm đó là thật và là lần đầu trên trang sống**: 21/08,
`/reviews/the-midgard-premium-sconce-review-copper-steel`, **vị trí 1,0**. Mốc cũ ghi
*"0 bấm suốt 30 ngày"* — nay không còn là 0.

⚠️ **Ma 404 vẫn còn ăn hiển thị.** 15 trang có hiển thị, trong đó **5 trang vẫn trả 404**
và ôm **19 / 37 hiển thị cấp-trang** — gồm cả trang nhiều nhất (13 hiển thị):

| Hiển thị | Trạng thái | Trang |
|---|---|---|
| 13 | **404** | `/reviews/willwork-jewelry-review-2026-...` |
| 2 | **404** | `/blog/how-to-save-money` |
| 2 | **404** | `/blog/daily-saving-habits` |
| 1 | **404** | `/reviews/flashfish-portable-power-station-review-2026-...` |
| 1 | **404** | `/reviews/hovsco-e-bike-review-2026-...` |

📌 **Đừng cộng hai bảng GSC với nhau.** Tổng theo ngày là **31**, tổng theo trang là **37** —
GSC gộp khác nhau ở mỗi chiều. Nói *"19/31"* là sai; phải nói *"19 trên 37 hiển thị
cấp-trang"*.

### Cách đo lại

Ba script chỉ-đọc, đã chạy thật 27/08, để sẵn ở `.scratch/` (chạy `node .scratch/<tên>`):

| Script | Việc | Ghi chú |
|---|---|---|
| `do-moc-2708.mjs` | bò / chỉ mục 71 URL | URL Inspection ~7s/URL ≈ **8 phút**. Lấy URL **từ sitemap**, đừng gõ tay |
| `do-gsc-2708.mjs` | hiển thị / bấm | `searchAnalytics/query`, chiều `date` **và** `page` |
| `do-sentry-sang-2708.mjs` | issue Sentry | `environment` là **tham số riêng**, không nhét vào `query=` (luật 8) |

⚠️ Chạy script từ **ngoài** `.scratch/` thì phải import `envkey.mjs` bằng
**`file:///e:/...`** — Node 24 từ chối `import ... from 'e:/...'` với
`ERR_UNSUPPORTED_ESM_URL_SCHEME`.

---

## 🔖 Điểm dừng 2026-08-26

> 👉 **Mai bắt đầu ở mục [`MAI LÀM TIẾP`](#-mai-làm-tiếp--đọc-mục-này-trước) bên dưới**
> (cuối phần 26/08) — ở đó có danh sách file chưa commit và thứ tự việc.

✅ **`main` = `origin/main` = `7b890f1`, đã push** (5 commit). Cây làm việc sạch.
Vercel đang dựng — **kiểm production sáng mai** (xem mục *MAI LÀM TIẾP*). Dev server ở `:3000` (⚠️ `.next` là bản production
do `npm run build` để lại — nếu dev trả 404 lạ thì `rm -rf .next` rồi bật lại).

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | **582 / 582** (574 + 8 test mới cho `siteBaseUrl`) |
| `npx tsc --noEmit` | sạch |
| `npm run build` | sạch |

### Ô *Canonical URL* thôi làm ô chết — và nối nó vào KHÔNG phải một dòng

Ô đó ở `/admin/config/seo` lưu được nhưng chưa từng đi tới đâu: `metadataBase` ghi cứng ở
[`layout.tsx`](src/app/layout.tsx), cộng **7 chỗ** ghi cứng `https://www.offerdy.com` trong
khối JSON-LD. Nay tất cả đi qua một biến `base` duy nhất, ở **cả hai hàm** (`generateMetadata`
và `RootLayout`) — để không lặp lại lỗi *"một nguồn sự thật mà hai đường đọc"* của hôm 25/08.

⚠️ **`try/catch` quanh `new URL()` là hàng rào MÙ.** Đo bằng Node 24 ngày 26/08:

| Giá trị | `new URL()` |
|---|---|
| `https://.offerdy.com/` ← **giá trị thật trong DB tới 25/08** | **hợp lệ**, hostname `.offerdy.com` |
| `https://abc` | **hợp lệ**, hostname `abc` |
| `https://offerdy.com.` | **hợp lệ**, hostname `offerdy.com.` |
| `abc` · `''` · `//x.com` · `https://a b.com` | ném `ERR_INVALID_URL` |

Nghĩa là bản vá "một dòng" sẽ nhận đúng cái giá trị hỏng đã nằm sẵn trong DB và đem nó làm
gốc cho **mọi** địa chỉ tuyệt đối của site — im lặng, trên từng trang. `src/lib/siteBaseUrl.ts`
soi riêng hostname (mọi nhãn phải khác rỗng, phải có ≥2 nhãn), chặn cả giao thức lạ
(`javascript:`, `data:` đều parse được và sẽ đi thẳng vào `<link rel="canonical">`), và
**không bao giờ ném** — `generateMetadata` chạy trên mọi trang, một ô gõ nhầm không được
phép thành trang 500. 8 test giữ chỗ này.

**Kiểm đầu-cuối trên trang thật** (`npm start` :3100, đổi ô trong Sanity rồi trả về):

| | |
|---|---|
| Đổi ô → `https://dealwise.example` | og:url **đổi theo** ✓ — dây thông |
| Giá trị hỏng `https://.offerdy.com/` nằm trong DB >3 phút | og:url **giữ** `https://www.offerdy.com`, HTTP 200 ✓ |
| Độ trễ ô config lên trang | **~106 giây** (CDN Sanity) |

⚠️ **Vòng đo thứ nhất kết luận SAI là "hàng rào không chặn được".** Thật ra og:url lúc đó
vẫn đứng ở `dealwise.example` — tức giá trị **chưa hề đổi**; nếu hàng rào hỏng thật thì
phải thấy `https://.offerdy.com`. Nguyên nhân: chờ 121s trong khi CDN mất ~106s. Vòng hai
đọc thẳng DB qua `api.sanity.io` (**không** CDN) để xác nhận ô đã mang giá trị hỏng *trước*
khi bắt đầu chờ trang — tách được "CDN trễ" khỏi "hàng rào hỏng". Bộ đo:
`.scratch/do-hang-rao-canonical-vong2.mjs`.
📌 Bài học: **một phép đo không đổi gì cả thì chưa nói được điều gì** — đừng đọc nó thành
"hỏng".

### 6 trang config còn lại thôi đọc qua CDN

`ads`, `author`, `content`, `persona`, `seo`, `social` đổi sang `writeClient` (`useCdn: false`),
theo đúng khuôn `/admin/config/general` đã đổi hôm 25/08. Đây là bẫy *"lưu xong tải lại là
dấu biến mất"* đã cắn hai lần. Nay `grep readClient src/app/admin/config/` **sạch**.

### Luật 8 trong `CLAUDE.md` — ba cách tôi dự đoán sai

User hỏi thẳng *"có cách nào hạn chế bạn dự đoán sai không"*. Đếm được **6 lần sai trong
hai ngày**, tất cả cùng một hình dạng: **bắc cầu từ một sự thật đã biết sang một kết luận
chưa đo**. Không lần nào sai khi đo trực tiếp, và cả 6 đều bị chính việc đo bắt trong vài
phút — không cái nào ra tới production.

| # | Tôi nói | Sự thật |
|---|---|---|
| 1 | "2/3 cron không ra kết quả" | 1 cron kẹt phần AI, 2 khoẻ |
| 2 | "451 deal đang chờ" | **0** (gõ `description`, route lọc `summary`) |
| 3 | bộ lọc Sentry `!environment:local` | Sentry bỏ qua, không lọc gì |
| 4 | "canonicalUrl thiếu www có thể hại" | ô chết, không ảnh hưởng |
| 5 | "nối ô đó là một dòng" | `try/catch` mù + 7 chỗ ghi cứng |
| 6 | "hàng rào không chặn được" | CDN trễ, phép đo chưa nói gì |

Ba nhánh của luật 8: **(a)** đừng nói việc to bao nhiêu trước khi đọc code · **(b)** điều
kiện lọc thì **chép**, đừng gõ lại · **(c)** phép đo phải phân biệt được **hỏng** với
**chưa xảy ra**. Kèm: API ngoài thì **gọi thử một lần rồi mới viết vá**.

📌 Ba câu user hỏi được, đắt hơn mọi thứ ghi trong file: *"cái này anh đo hay đoán?"* ·
*"anh grep chưa mà bảo một dòng?"* · *"phép đo này phân biệt được hỏng với chưa-xảy-ra
không?"*

### Tài liệu: sửa 4 chỗ đang nói ngược code

Tài liệu sai là **nguồn dự đoán sai của phiên sau** — nên sửa cùng ngày, không để nợ:

- `PROJECT_CONTEXT.md`: hai dòng nói `canonicalUrl` "không nối vào đâu" và "mọi canonical
  đều hardcoded" — nay đã sai, đã cập nhật. Thêm mục **"⚠️ A validated URL is not a valid
  hostname"** (mục lục 79 → **80**).
- Mục Sentry và mục Daily report trong `PROJECT_CONTEXT.md`: thêm số đo 25/08, và ghi rõ
  **hai chú thích cũ trong code đều đúng lúc viết, sai lúc dùng**.
- `CLAUDE.md`: tiêu đề *"Bảy luật"* → **Tám**, và `npm test` **565 → 582** ở cả hai chỗ.

### superpowers: cài rồi, bật rồi, **phiên này nạp 0 skill**

| Đo được 26/08 | |
|---|---|
| Trên đĩa | `superpowers 6.3.0`, **14 skill** |
| Bật cho dự án | ✅ `.claude/settings.json`, scope `E:\Offerdy`, từ 25/08 |
| Nạp vào phiên | **0** — và **không có** khối `EXTREMELY_IMPORTANT` mà hook `SessionStart` phải chèn |

⚠️ **Cài xong ≠ nạp được.** Chưa rõ vì sao. Việc user: gõ `/plugin`, khởi động lại Claude
Code, rồi hỏi *"có thấy skill `verification-before-completion` không?"*.

`CLAUDE.md` mục 6 đã **chốt sẵn skill nào dùng / không dùng**, để mỗi phiên khỏi cân nhắc
lại: dùng `verification-before-completion` (hợp nhất — đúng họ lỗi *"báo thành công mà vẫn
hỏng"*), `systematic-debugging`, `test-driven-development`, `brainstorming`; **không** dùng
worktree / nhánh mới / subagent / bản `code-review` thứ ba. Trật tự vẫn là
**`CLAUDE.md` > skill > mặc định** — kiểm lại `using-superpowers/SKILL.md:63` bản 6.3.0,
câu đó **còn nguyên**.

---

## 📌 MAI LÀM TIẾP — đọc mục này trước

✅ **Đã commit và push — `main` = `origin/main` = `7b890f1`.** Năm commit:

| Commit | Việc |
|---|---|
| `a647502` | `fix(cron)` — daily-report báo lỗi qua Sentry thay vì chết im lặng |
| `7549034` | `fix(admin)` — thẻ đỏ thôi đếm lỗi từ chính máy này |
| `df2d2f8` | `feat(seo)` — ô *Canonical URL* điều khiển mọi địa chỉ tuyệt đối |
| `267c230` | `fix(admin)` — 6 trang config đọc tươi, không qua CDN |
| `7b890f1` | `docs` — luật 8, chốt skill superpowers, đồng bộ tài liệu |

Các file đã vào:

| Nhóm | File |
|---|---|
| Cron báo lỗi | `src/app/api/cron/daily-report/route.ts` |
| Sentry sạch nhiễu | `sentry.server.config.ts` · `sentry.edge.config.ts` · `src/instrumentation-client.ts` · `src/lib/sentryApi.ts` |
| Ô canonical | `src/app/layout.tsx` · **`src/lib/siteBaseUrl.ts`** (mới) · **`tests/siteBaseUrl.test.ts`** (mới) |
| Config đọc tươi | 6 trang `src/app/admin/config/*/page.tsx` |
| Tài liệu | `CLAUDE.md` · `PROJECT_CONTEXT.md` · `TODO.md` |

Đã kiểm trước khi push: `npm test` **582/582** · `tsc` sạch · `build` sạch.

⚠️ **Việc kiểm production thì CHƯA làm** — push xong Vercel mới dựng. Sáng mai kiểm hai
thứ, mỗi thứ một phút:
- `/admin` — thẻ *Lỗi production*: nếu đêm nay `daily-report` chết vì hết credit thì phải
  thấy **một issue mới** mang culprit `GET /api/cron/daily-report` (đó là bản vá đang làm
  đúng việc, không phải trang hỏng).
- Xem HTML trang chủ production: `og:url` phải vẫn là `https://www.offerdy.com` — nó giờ
  đi qua ô *Canonical URL* chứ không còn ghi cứng.

**Việc mai, theo thứ tự:**

1. 🔴 **Nạp credit Anthropic** rồi **xoay khoá**. Mỗi đêm không có credit là một issue
   Sentry mới từ `daily-report` (đúng thiết kế, nhưng nó sẽ kêu cho tới khi có tiền).
2. 🔴 **ĐĂNG BÀI** — vẫn là nút thắt thật: **1/451 deal**, 25 lượt bấm cả đời. Không tốn
   credit: caption do code thuần dựng, ảnh cào bằng cheerio.
3. 📅 **27/08 là mốc đã hẹn**: đo lại `0/65` trang chưa được Google bò, xem phép cắt
   sitemap 20/08 có tác dụng không. **Đừng quyết gì lớn về SEO trước đó.** Khi đọc kết
   quả, cân nhắc **hai** giả thuyết: (a) hạn mức bò, hay (b) đánh giá chất lượng — nếu là
   (b) thì viết thêm bài AI là đào sâu thêm hố.
4. Bấm *resolved* cho 5 issue Sentry cũ + `JAVASCRIPT-NEXTJS-1F` (token chỉ có quyền đọc,
   tôi không tự làm được).
5. Nếu muốn tôi code tiếp: **`/links` dẫn bằng mã thay vì dẫn bằng deal** — một buổi, nằm
   đúng chỗ traffic mạng xã hội đi qua.

---

## 🔖 Điểm dừng 2026-08-25

**`main` = `origin/main`**, đã push, cây làm việc sạch. Dev server đang chạy ở `:3000`.

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | **574 / 574** (565 + 3 hàng rào thương hiệu + 6 nút Copy) |
| `npx tsc --noEmit` | sạch |
| `npm run build` | sạch |

⚠️ `npm run lint` vẫn **62 vấn đề có sẵn** — không đo lại hôm nay, xem điểm dừng 24/08.

### Việc hôm nay: ô *Tên website* giờ đổi tên trên toàn bộ trang

Ô đó **đã có sẵn** ở `/admin/config/general` nhưng gần như không đi tới đâu — chỉ header,
footer và `/links` đọc nó. Đo trước khi sửa: **176 dòng ghi cứng chữ "Offerdy" trong 74
file**, cộng **68 trường** trong 14 tài liệu cấu hình Sanity.

Cách chữa **không** phải gõ lại tên đúng ở 176 chỗ, mà là **thôi gõ** — đúng khuôn
`{storeCount}` đã có ở `src/lib/storeCount.ts`. Quy ước `{site}` thật ra **đã tồn tại**
(`configContent.articleDisclaimer` dùng nó), chỉ có điều chỗ thay thế lại viết cứng
`'Offerdy'`.

- `getSiteName()` ở `src/sanity/queries.ts` — một nguồn sự thật, hai lớp cache.
- `fillSiteName()` / ô `{site}` ở `src/lib/siteNameToken.ts`.
- 92 file code + **55 trường Sanity** đổi sang `{site}`. Bản sao dữ liệu cũ:
  `.scratch/sao-luu-config-truoc-doi-ten.json`.

### Số đo đầu-cuối (đổi tên thật thành `Dealwise` rồi trả về)

| | |
|---|---|
| Trang mang tên mới | **27 / 27** |
| Trang rò nguyên văn `{site}` | **0** |
| Độ trễ tên mới lên trang | **0s** (trước khi vá: ~40s, tệ nhất +300s) |

### ⚠️ Bẫy trả giá hôm nay

1. **`lib/ai/*` KHÔNG được import `@/sanity/queries`.** Bộ chạy test nạp chúng bằng Node
   thuần nên `next/cache` không tồn tại. Và nó vỡ **gián tiếp**: `generateArticleContent`
   import `PRODUCT_GRADIENTS` từ `generateReviewContent`. Các generator nhận `siteName`
   qua **tham số**, nơi gọi tự hỏi.

2. **`unstable_cache` bọc ngoài một lần đọc qua CDN = ướp giá trị cũ lại 5 phút.**
   Bấm Lưu → `revalidatePath` xoá cache → request kế tiếp nạp lại từ CDN Sanity còn lỗi
   thời → tên cũ đóng băng thêm 300s dù đã lưu đúng. Chữa bằng `freshClient`
   (`useCdn: false`) trong `src/sanity/client.ts`. Cùng họ với lỗi "lưu xong tải lại thấy
   như chưa lưu" đã dính hai lần trước đây.

3. **Một nguồn sự thật mà hai đường đọc thì vẫn là hai nguồn.** `getSiteSettings()` đọc
   `siteName` riêng, nên sau khi đổi tên, `<title>` đã mang tên mới còn footer giữ tên cũ
   **40 giây**. Nay nó dùng chung `getSiteName()`.

4. **Hàng rào chặn lặp thương hiệu từng ghi cứng `/offerdy/i`** — đổi tên xong là nó thôi
   chặn, và `metaTitle` lại lặp thương hiệu hai lần đúng như 24 trang đã dính trước đây.
   Nay đọc `ctx.siteName`; 3 test mới giữ chỗ này.

5. **Văn bản chưa điền ô lọt vào gói RSC.** `/submit-deal` rò `{site}` không phải ở chữ
   hiển thị mà ở dữ liệu đẩy xuống client component. Trang nào đưa dữ liệu Sanity xuống
   `'use client'` thì phải điền ô **trước** khi truyền.

6. **Đừng tin dòng chữ "OK" của chính script mình viết.** Bản vá `experienceBio` báo thành
   công mà không thay gì cả — chỉ vì `print` đặt sau `replace` mà không có `assert`. Lỗi
   chỉ lộ khi lái trình duyệt đo trang thật.

7. **Lọc "định danh" theo tên miền là lọc sai.** `configCookies.sections[1]` vừa có chữ
   *Offerdy* (thương hiệu, phải đổi) vừa có *offerdy.com/d/…* (địa chỉ, phải giữ) trong
   cùng một đoạn. Dấu hiệu đúng là **không có khoảng trắng**.

### Đọc 7 lỗi Sentry trên thẻ đỏ — 5/7 không phải lỗi trang thật

Thẻ *"Lỗi production chưa xử lý"* ở `/admin` đếm **cả lỗi từ máy này**: `npm run build`
rồi `npm start` đặt `NODE_ENV=production`, mà Sentry bật đúng theo biến đó
([`sentry.server.config.ts:14`](sentry.server.config.ts)). Đọc từng issue:

| Lỗi | Thật ra ở đâu | Lần cuối |
|---|---|---|
| `An unexpected response…` | **`localhost:3000`**/admin | 20/08 |
| `Clipboard: Document is not focused` | offerdy.com/coupon-codes — **HeadlessChrome** (script của mình) | 01/08 |
| `plan_limit_reached` (Sanity) | offerdy.com/links — khách thật | 26/07 |
| `Cookies can only be modified…` | **`localhost:3399`**/admin/users — **curl** | 20/08 |
| `<unknown>` | offerdy.com/stores/enzuzo — không mang thông tin gì | 08/08 |
| `Server Components render` (21 lần) | offerdy.com/admin/ai-review | 26/07 |
| `TypeError: Invalid URL` | offerdy.com/`[slug]` — **bot "BeeGuru"**, không frame nào của mình | 09/08 |

📌 `plan_limit_reached` và `Server Components render` **cùng một sự cố** — lần cuối đúng
`26/07 17:06`. Hạn mức Sanity reset 01/08, không tái diễn 30 ngày.
📌 **Không lỗi nào cho thấy trang đang hỏng.** Cái mới nhất là 20/08 và ở máy này.
📌 5 issue này nên đánh dấu *resolved* trong Sentry để lần sau thẻ đỏ mới có nghĩa.
📌 Còn lại: lọc `localhost` khỏi Sentry — ✅ **đã làm chiều 25/08, xem mục ngay dưới.**

### Nút Copy không còn nói dối

⚠️ **Là 5 nút chứ không phải 6** — `LinkInBioCodes` vốn đã bắt lỗi đúng (`grep -A6` cắt
mất dòng `.catch` ở dòng thứ 8). Chỗ đó là **tiền lệ**, đã dùng lại làm khuôn.

⚠️ Nặng nhất là `StoreOfferList`: gọi `writeText` rồi bật `setCopied(true)` **ngay, không
chờ kết quả** — nút báo *"✓ Copied"* kể cả khi chép hỏng.

`src/lib/copyText.ts`: clipboard API → `execCommand('copy')` → trả `false` để nơi gọi tự
hỏi người dùng. Bước `execCommand` là thứ còn chạy trong webview Instagram/TikTok.

Đo trên Chrome thật (headless từ chối clipboard = đúng lỗi Sentry, nên là **tái hiện**):

| `/coupon-codes` | Bản cũ | Bản mới |
|---|---|---|
| Lỗi không ai bắt | **2 rejection** | **0** |
| Khách lấy được mã | **không** | **có** (`prompt`) |

Bộ đo dùng lại được: `.scratch/do-nut-copy.mjs`.

⚠️ **Bẫy khi đo**: `git stash` một danh sách file mà trong đó có file **chưa được theo
dõi** thì **cả lệnh bị huỷ** — không có gì được cất đi, và phép đo "bản cũ" thật ra đo
bản mới. Đúng họ *"báo thành công mà vẫn hỏng"*. Cách đúng: chép file ra rồi
`git checkout --`.

### Chiều 25/08 — ba cron có thật sự chạy không, và ai báo khi chúng chết

Câu hỏi mở màn: *"nên thêm GitHub Actions để tự động hoá không?"* Trả lời sau khi đo:
**không** — hạ tầng đã đủ, cái thiếu là **đường báo khi nó hỏng**.

Không đọc được Vercel Logs (máy này không có `VERCEL_TOKEN`, `.env.local` không có
`CRON_SECRET`), nên đo bằng **dấu vết mỗi cron để lại trong Sanity**. Bộ đo dùng lại được:
`.scratch/do-cron-co-chay-that-khong.mjs`.

| Cron | Trạng thái đo được 25/08 |
|---|---|
| 06:00 `link-check-nightly` | ✅ chạy đều — đúng **50 offer/đêm**, 6 đêm liền 20→25/08 |
| 18:00 `ai-content-nightly` | ✅ không chết — **hàng đợi thật = 0/0/0**, hết việc để làm |
| 01:00 `daily-report` | ⚠️ **route chạy, bước báo cáo AI chết 2 đêm liền** |

📌 **Bằng chứng tách được hai thứ mà nhìn từ ngoài trông như một**: `adminVaultBackup.mon`
= 24/08 và `.tue` = 25/08 (bản sao chạy **trước**, thành công cả hai đêm) trong khi
`dailyReport.generatedAt` vẫn đứng ở **23/08**. Tức là lịch cron **không** hỏng — chỉ
riêng lượt gọi Anthropic hỏng, đúng ngày hết credit. Thiết kế "backup trong try/catch
riêng, chạy trước" đã cứu đúng thứ nó sinh ra để cứu.

📌 **Giả định cũ bị bác bỏ.** Chú thích trong `vault-backup/route.ts` viết: *không cho
backup một cron riêng vì `daily-report` "chết là lộ ra ngay"*. Đo cho thấy nó **đã chết 2
đêm mà không lộ ra**. Băng *"N ngày tuổi"* ở `/admin/reports` có thật nhưng là đường
**kéo** — phải có người mở trang. Nay thêm đường **đẩy**: `Sentry.captureException` với
`fingerprint` cố định (N đêm hỏng gộp thành **một** issue có bộ đếm, không phải N dòng
giống hệt nhau), cộng một cảnh báo riêng nếu **bản sao kho tài khoản** hỏng.

### Thẻ đỏ *Lỗi production* thôi đếm lỗi của chính máy này

Nguồn rác: `environment: VERCEL_ENV ?? NODE_ENV`. Chạy `npm start` cục bộ thì
`NODE_ENV=production` (nên Sentry bật) còn `VERCEL_ENV` không tồn tại → lỗi từ localhost
mang **đúng nhãn `production`**. Nay là `?? 'local'` ở cả ba chỗ init.

⚠️ **Hai điều đo được đã bác bỏ hai câu viết sẵn trong code:**

1. **`environment` nằm trong `query=` bị Sentry BỎ QUA.** `query=is:unresolved`,
   `…&nbsp;environment:production` và `… !environment:local` trả về **y hệt 7 issue**. Một
   bản vá viết theo kiểu đó chạy được, trả 200, và **không lọc gì cả**. Phải là tham số
   riêng `&environment=` — đo lại: `production`→7, `local`/`preview`/`development`→0.
2. **Chú thích *"issue trước 26/07 không có tag environment"* không còn đúng.** Đọc tag
   từng issue: cả 7 đều có, kể cả hai cái cũ nhất. Nên lọc **khẳng định** hôm nay không
   giấu gì — `getRecentSentryIssues()` giờ dùng `&environment=production`, kèm đường lùi
   gọi lại không lọc nếu Sentry từ chối (mảng rỗng ở đây không hiện ra như lỗi, nó hiện ra
   như dòng chữ *"0 lỗi"* — đúng họ *báo thành công mà vẫn hỏng*).

**Kiểm đầu-cuối bằng lỗi thật** (`npm start` cổng 3100, `CRON_SECRET` tạm, gọi thẳng route):

| | |
|---|---|
| Response | `500` — `backup ok (slot tue, 2 users)` + lỗi `credit balance is too low` |
| Sentry nhận được | ✅ issue mới `JAVASCRIPT-NEXTJS-1F`, culprit `GET /api/cron/daily-report` |
| Nhãn của nó | **`local=1`** |
| Bộ đếm thẻ đỏ (`&environment=production`) | **vẫn 7** — không bị nhiễm |

Bộ đo: `.scratch/do-sentry-nhan-loi-cron.mjs`, `.scratch/do-loc-sentry-local2.mjs`.

⚠️ **Bẫy tôi tự dính hôm nay**: vòng đo đầu tôi đếm hàng đợi bằng `!defined(description)`
cho cả ba loại, trong khi route lọc deal bằng `!defined(summary)` và còn đòi thêm
`aiReviewStatus == "none"` → ra *"451 deal đang chờ"*, sai hoàn toàn (thật ra 0). Đúng cái
bẫy `AGENTS.md` đã ghi: **đọc schema trước khi viết điều kiện lọc**. Vòng hai chép nguyên
văn 3 câu GROQ của route mới ra số đúng.

⚠️ **`npm run build` vừa chạy nên `.next` là bản production.** Dev server ở `:3000` đang
chạy đè lên đó — nếu nó trả 404 lạ thì `rm -rf .next` rồi khởi động lại, đừng đi tìm lỗi
trong code.

### Việc còn để lại

- **Nội dung đã lưu vẫn mang tên cứng**: 55/107 mô tả store + 1 bài viết (`post.author`
  đúng bằng chữ `"Offerdy"`, thấy trên `/blog`). Cùng một script `.scratch/doi-ten-config.mjs`
  chạy được cho nhóm này, có chạy khan trước — **chưa làm, chờ quyết**.
- ~~**Lỗi dữ liệu sẵn có**: `configSEO.canonicalUrl` thiếu `www`~~ ✅ **user tự sửa
  25/08 16:29 UTC.** Đọc lại từ Sanity để xác nhận chứ không tin lời báo:
  `"https://www.offerdy.com/"`.
- ✅ **Ô CHẾT đã được nối dây 26/08** — xem điểm dừng ở đầu file. Ghi chú cũ giữ lại vì
  nó là bằng chứng: ô này từng lưu được mà không đi tới đâu.
- ⚠️ **Ghi chú gốc ngày 25/08:** Grep toàn bộ `src/`: nó chỉ xuất
  hiện ở form admin (`SEOConfigForm.tsx`) và ở khai báo kiểu trong `queries.ts:867`.
  **Không một dòng nào dựng thẻ canonical từ nó** — thẻ đó đi từ
  [`layout.tsx:37`](src/app/layout.tsx#L37), nơi `metadataBase` ghi **cứng**
  `https://www.offerdy.com`. Nghĩa là suốt thời gian ô đó mang giá trị sai `https://.offerdy.com/`,
  trang vẫn phát canonical đúng — và ngược lại, gõ gì vào ô đó cũng không đổi được gì.
  📌 **Đúng khuôn ô *Tên website* của sáng nay**: một ô có mặt trong admin, lưu được, mà
  không đi tới đâu. ✅ Đã nối dây 26/08 — và **dự đoán "một dòng" của tôi là sai**: `try/catch`
  quanh `new URL()` không chặn được chính giá trị hỏng đang nằm trong DB. Chi tiết ở điểm
  dừng 26/08 đầu file.
- ~~**6 trang admin config còn lại vẫn đọc bằng `readClient`**~~ ✅ xong 26/08 — cả 6 đã đổi
  sang `writeClient`, `grep` sạch.
- **Logo là tệp ảnh** (`logo-offerdy.png`, `logo-offerdy-light.png`) — đổi tên không đụng
  tới nó. Chữ `alt` thì đã đi theo tên.
- **Tên miền `offerdy.com`** (93 dòng) không phải tên website, cố ý giữ.
- ~~**Lọc `localhost` khỏi Sentry**~~ ✅ xong chiều 25/08 (nhãn `local` + lọc phía đọc).
- **5 issue Sentry cũ nên đánh dấu *resolved*** (xem bảng ở trên) — anh bấm nhanh hơn gọi API.
  Token `SENTRY_AUTH_TOKEN` chỉ có **quyền đọc** nên tôi không tự làm được. Nay có thêm
  một cái nữa để bấm: `JAVASCRIPT-NEXTJS-1F` do chính phép kiểm chiều nay sinh ra — nó
  mang nhãn `local` nên **đã bị lọc khỏi thẻ đỏ**, để lại cũng không sai số.
- **Chưa đo: gói Vercel đang dùng là gì.** Hobby chỉ cho **2 cron** và chạy 1 lần/ngày
  giờ không đảm bảo, mà `vercel.json` đang khai **3**. Dấu vết Sanity cho thấy cả ba đều
  có chạy 6 đêm gần nhất, nên nhiều khả năng không phải Hobby — nhưng đó là **suy ra**,
  chưa mở dashboard xác nhận.
- **Khoảng trống 04/08 → 19/08**: `link-check-nightly` im **14 đêm liền** rồi tự chạy lại
  19/08 với 122 offer. Trùng giai đoạn "ba cron chết im lặng 18 ngày" đã biết. Không đào
  lại, ghi để sau này đọc biểu đồ không giật mình.

---

## 🔖 Điểm dừng 2026-08-24

**`main` = `origin/main` = `294ae65`**, đã push, cây làm việc sạch.
Production đã chạy tới `5e2201d` và **đã kiểm trên web thật** (`/how-we-test` trả 200,
`og:locale` có mặt). Hai commit sau đó (`05029b7`, `294ae65`) **chỉ sửa tài liệu**, không
đụng code chạy — nên không cần kiểm lại production.

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | **565 / 565** |
| `npx tsc --noEmit` | sạch |
| `npm run build` | sạch |
| `npm run lint` | **62 vấn đề (28 lỗi, 34 cảnh báo)** — xem cảnh báo bên dưới |

⚠️ **`lint` 62 là CÓ SẴN, không phải mới hỏng.** Đã `git stash` bản chưa sửa chạy lại và
ra y hệt 62. Phần lớn là `react-hooks/set-state-in-effect`. Ghi chú cũ nói *"lint sạch"*
là **sai**, đã bỏ. 4 trong số đó đến từ chính các script `.scratch/*.mjs` — ESLint quét cả
thư mục đó.

Dev server **đang tắt**. Bản dựng production cục bộ cũng đã tắt.

---

## 🔴 Hai việc chặn mọi thứ — chỉ anh làm được

**1. Nạp credit Anthropic** ở console.anthropic.com → Plans & Billing, rồi **xoay khoá đó**
(nằm trong nhóm 4 khoá đã lỡ dán vào phòng chat). Đo tách bạch 23/08:
`GET /v1/models` → **200** (khoá tốt) · `POST /v1/messages` → **400** (hết tiền).
Đang kẹt: viết bài, kịch bản video, chấm ảnh, báo cáo AI.

**2. ĐĂNG BÀI — nút thắt thật của cả dự án.**

Đo 24/08: **1 / 451 deal đã đăng (0,2%)**. Và tổng lượt bấm **từ đầu tới giờ** là **25**
(9 deal + 0 short link + 16 offer) — không phải mỗi tháng, mà là cả đời trang web.

🔑 **Đăng mạng xã hội KHÔNG cần credit**: caption mặc định do code thuần dựng, ảnh sản phẩm
cào bằng cheerio, QR + short link + ô tick đều cục bộ. **Chỉ video mới kẹt vì credit.**
Mỗi bài vài phút: chọn deal → *Lấy ảnh sản phẩm* → *Copy caption* → đăng → tick *đã đăng*.

⚠️ **Mốc 25/08 chỉ dựa trên MỘT video** đăng 23/08. Dù nó hiện ra số gì thì đó là **nhiễu,
không phải dữ liệu**. Muốn biết kênh này có chạy không thì cần khoảng **30 bài**.

**3. Viết ghi chú khi thử mã.** Trang [`/how-we-test`](https://www.offerdy.com/how-we-test)
đã dựng xong và đang chờ nội dung: 71 lần thử nhưng **chỉ 1 có ghi chú**. Mỗi lần thử tới,
thay vì chỉ bấm nút kết quả, viết một câu thật:

> *Thử 24/08: mã áp được, giảm 15%. Trang shop không ghi, nhưng không áp cho hàng sale.*

Tôi **không bịa được** những câu này, và bịa thì phá hỏng đúng thứ làm trang đó có giá trị.

---

## 📅 Hai mốc đo đã hẹn — đừng quyết gì lớn trước chúng

| Ngày | Việc |
|---|---|
| ~~25/08~~ | ✅ **ĐÃ ĐO**: nhãn `video` = **0**. Không phải chỉ nhãn đó — **chưa từng có** lượt bấm nào mang nhãn chiến dịch. Short link cả đời: 2, đều ngày 25/07. Bài đăng lúc 23/08 15:52; từ đó tới 25/08 **0 lượt bấm** toàn trang. ⚠️ Deal `#1471` có 2 lượt bấm nhưng cả hai rơi vào **21/08** — trước lúc đăng, không liên quan tới video. Và `videoMadeAt` chưa tick cho deal nào. n=1 nên đây là nhiễu, không bác bỏ được kênh video. |
| ~~27/08~~ | ✅ **ĐÃ ĐO**: `0/65` → **28/65** đã bò **và** đã vào chỉ mục; tổng chỉ mục 3 → 34. Nhưng review **23/23** còn blog **5/42** (33 bài kẹt ở `Discovered – currently not indexed`). Chi tiết ở điểm dừng 27/08 đầu file. |
| **03/09** | ~~Phán quyết trả 451 deal về sitemap~~ — **trả lời sớm được rồi: ĐỪNG TRẢ VỀ.** Chỉ mục 3 → 34 sau khi cắt. |

⚠️ Hai giả thuyết đặt ra ngày 20/08 — (a) hạn mức bò, (b) đánh giá chất lượng — **kết quả
27/08 là (a) ở cấp site, (b) ở cấp khuôn bài blog.** Nên câu *"viết thêm bài AI là đào sâu
thêm hố"* vẫn **đúng với blog**, và **không** đúng với review.

---

## 📊 Số đo hiện trạng (đo thật 24/08 — đừng đo lại)

### Kho hàng đã xây

| | |
|---|---|
| Deal | **451** — 100% có giá gốc, tính được mức giảm |
| Offer | **423** · có mã coupon **98** · có deep link **185 (43,7%)** |
| Store | **107** — 100% có link affiliate |
| Bài viết công khai | **42** · review **23** |
| Chữ nội dung trong Sanity | **318.076 từ** (store 64,5k · deal 170k · post 36,7k · offer 30,5k · review 16k) |

### Đã đưa ra ngoài

| | |
|---|---|
| Deal đã đăng bài | **1 / 451** |
| Deal đã làm video | **0 / 451** |

### Quay lại được

| | |
|---|---|
| Tổng lượt bấm, từ đầu tới giờ | **25** |
| ~~Google 30 ngày~~ | ~~**0 lượt bấm** · 3 URL trong chỉ mục · 0/65 trang được bò~~ ← **đã cũ, xem dòng dưới** |
| Google 14 ngày (đo 27/08) | **1 lượt bấm** (21/08, review Midgard, vị trí 1,0) · 31 hiển thị · **34** URL trong chỉ mục · **28/65** trang được bò |

### Thử mã coupon — tài sản riêng, không ai chép được

| | |
|---|---|
| Offer **có mã** | 98 |
| Trong đó **đã thử tay** | **71 (72%)** trên **67 shop** |
| Kết quả | **71/71 áp được** |
| **Có ghi chú** | **1 / 71** ← chỗ hổng duy nhất |
| Ngày thử | 03/08 (70 lần) và 05/08 (1 lần) |

⚠️ **72%, không phải 17%.** Ngày 24/08 tôi từng báo 17% vì lấy mẫu số là *mọi* offer (423),
phần lớn không có mã để mà thử. Và từng báo *"0 mã chạy"* vì hỏi `codeTestResult == "works"`
trong khi giá trị thật là `"worked"`.
📌 **Bài học: đọc schema trước khi viết điều kiện lọc, đừng đoán tên giá trị.**

### Tiền tệ — một tín hiệu chưa ai để ý

`$` 381 deal · **`₹` 44 deal** · `€` 24 deal.
**10% kho hàng đang là thị trường Ấn Độ.** Chưa làm gì với thông tin này.

---

## Hôm nay làm được gì — 6 commit

| Commit | Việc |
|---|---|
| `29ac54a` | Nút *Get Code* và thanh tab không còn xén im lặng khi chữ dài ra |
| `6e32d13` | Điểm dừng + sửa con số lint sai trong sổ |
| `07a3d13` | Một từ dài không còn làm vỡ bố cục điện thoại |
| `5e2201d` | **Trang `/how-we-test`** — hồ sơ thử mã, nội dung KHÔNG do AI viết |
| `05029b7` | **Sắp xếp lại 4 file tài liệu gốc** — chữ phải đọc mỗi phiên: 6.500 → 160 dòng |
| `294ae65` | Viết lại `README.md`, bỏ bản mẫu `create-next-app` |

Câu hỏi mở màn là *"xây 10 ngôn ngữ theo vị trí khách hàng mất bao lâu"*. Trả lời sau khi
đo: **đừng làm** (1,33 triệu từ, sitemap 197 → ~1.970 URL, trong khi 3 URL chỉ mục / 0 bấm).
Chi tiết ở `PROJECT_CONTEXT.md` mục *International readers*.

---

## ⚠️ Bẫy trả giá hôm nay — đừng mắc lại

1. **`pkill -f "next start"` KHÔNG giết được server trên Windows.** Server mới chết vì
   `EADDRINUSE`, server **cũ vẫn trả lời**, vòng chờ `curl → 200` báo "sẵn sàng" →
   **đo nhầm bản cũ hai lần liền, im lặng**. Phải `netstat -ano | grep :3100` lấy PID rồi
   `taskkill //PID <pid> //F`, và **grep log tìm `EADDRINUSE` trước khi tin là đã khởi động**.

2. **CSS do template sinh ra rồi lưu vào Sanity là CSS ĐÓNG BĂNG.** `aboutTemplate.ts` sinh
   HTML kèm khối `<style>` rồi lưu cả cụm — sửa template **không chạm** tới 107 mô tả store
   đã lưu. Trả giá đúng một vòng build + đo mới biết. Phải đè bằng luật ở `globals.css`.

3. **Bộ đo tràn lề nói dối BẢY kiểu, không phải bốn.** Ba kiểu mới: băng chạy marquee, cắt
   theo dòng `-webkit-line-clamp`, và trang trí `::before/::after` thò ra ngoài. Phải chặn
   ở **cả hai chỗ**: vòng quét chính *và* hàm `capCat()` leo tổ tiên.

4. **Backtick trong chú thích nằm giữa template literal** làm đứt chuỗi — lần thứ tư.
   Cả `heredoc` của shell lẫn `const CSS = \`...\`` trong TSX đều dính.

5. **Trình rút gọn CSS của Next đảo thứ tự thuộc tính** — grep một luật vừa viết mà trả 0
   thì chưa chắc build hỏng; có thể chỉ là grep trượt.

6. **Git Bash biến `/blog/...` thành `C:/Program Files/Git/blog/...`** — luôn dùng
   `MSYS_NO_PATHCONV=1` khi truyền đường dẫn URL.

📌 **Bài học lớn nhất trong ngày**: một `width` cố định đặt vừa khít một chuỗi tiếng Anh
**là một lỗi xén đang nằm chờ**. Dùng `min-width`.

---

## 💡 Ý tưởng cuối ngày 24/08 — chưa quyết, đọc trước khi làm gì lớn

### Ý chính: sản phẩm là MỘT MÃ, không phải 451 deal

Đo 24/08:

| | |
|---|---|
| Mã `OFFERDY` dùng được ở | **88 / 107 shop công khai (82%)** |
| Đã đích thân thử ở quầy | **63 shop** |
| Offer còn đang bật | 86 |

Là *trang tổng hợp coupon*, Offerdy đấu với RetailMeNot / Honey / Slickdeals trên sân của
họ, với **3 URL trong chỉ mục**. Không có cửa.

Là *"một mã, 88 cửa hàng"*, nó là **một câu người ta nhớ được và nhắc lại được** — đúng thứ
lan đi trên TikTok/Instagram, kênh duy nhất đang mở.

📌 Điểm mấu chốt **đã nằm sẵn trong code**, ở `src/components/LinkInBioCodes.tsx:13`:
*"GoAffPro ghi nhận đơn qua CẢ MÃ, nên khách dùng mã là đơn về mình kể cả khi họ không bấm
link."* → **Mã là cái phễu tốt hơn link.** File đó đã biết; định vị của cả trang thì chưa.

Hệ quả: bài đăng không còn là *"Deal #1470 giảm 20%"* (một bài một deal, 451 lần) mà thành
*"Mã này dùng được ở 88 cửa hàng, đây là danh sách"* — **một nội dung, dùng lại được, không
hết hạn.**

⚠️ **ĐÂY LÀ GIẢ THUYẾT, CHƯA CHỨNG MINH.** Nó suy ra từ dữ liệu, không phải từ khách thật —
vì chưa có khách thật. Với 25 lượt bấm cả đời, **mọi** lý thuyết định vị đều chưa được kiểm,
kể cả cái này. Cách kiểm rẻ nhất vẫn là **đăng 10 bài theo góc đó rồi xem**.

### Ba ý nhỏ hơn

1. **`/links` nên dẫn bằng mã, không dẫn bằng deal.** Hiện nó hiện 3 dòng mã rồi tới lưới
   12 deal. Nếu ý chính đúng thì dòng đầu tiên phải là mã và con số 88, trước khi cuộn.
   Đây là trang đích của toàn bộ traffic mạng xã hội — sửa nó rẻ hơn sửa 451 deal nhiều.
   *(Nếu làm ý nào trước thì nên là ý này — nhỏ, một buổi, nằm đúng chỗ traffic đi qua.)*

2. **Tạm thôi coi đây là canh bạc SEO.** 0/65 trang được bò, 3 URL chỉ mục, 0 bấm/30 ngày.
   Google sẽ không thưởng cho một tên miền affiliate mới nội dung AI trong 6–12 tháng. Nếu
   chấp nhận: trang web là **nơi đáp của traffic mạng xã hội**, không phải tài sản tìm kiếm
   — và khi đó hai trang quan trọng nhất là `/links` và `/how-we-test`, **không phải 42 bài
   viết**.

3. **`₹` 44 deal — thử một lần cho Ấn Độ.** 10% kho hàng. Cộng đồng săn deal Ấn Độ đông,
   nói tiếng Anh, sinh hoạt trên Telegram — rào cản thấp hơn TikTok.

---

## 📌 Nhắc lại một lần nữa, vì nó là điều quan trọng nhất

Công cụ đã đi trước việc dùng **rất xa**: 451 deal đã xây, **1 cái đã đăng**, tổng lượt bấm
cả đời trang web là **25**.

Xây thêm công cụ là việc dễ chịu — commit tăng, test tăng, bẫy được ghi. Phân phối là việc
khó chịu và có thể thất bại công khai. **Một tháng nữa mà vẫn 1/451 thì không phải tại thiếu
công cụ.**
