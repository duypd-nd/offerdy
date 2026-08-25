# Offerdy — Việc đang làm

> **File này chỉ chứa việc đang làm.** Nhật ký các điểm dừng đã khép nằm ở
> [`docs/NHAT_KY.md`](docs/NHAT_KY.md) — 2.400 dòng, giữ nguyên văn vì chứa số đo đã
> tốn công đo và bẫy đã trả giá. Đừng chép chúng ngược lại vào đây.

---

## 🔖 Điểm dừng 2026-08-26

> 👉 **Mai bắt đầu ở mục [`MAI LÀM TIẾP`](#-mai-làm-tiếp--đọc-mục-này-trước) bên dưới**
> (cuối phần 26/08) — ở đó có danh sách file chưa commit và thứ tự việc.

Chưa push, **cây làm việc chưa commit**. Dev server ở `:3000` (⚠️ `.next` là bản production
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

**Cây làm việc CHƯA COMMIT.** 15 file sửa + 2 file mới:

| Nhóm | File |
|---|---|
| Cron báo lỗi | `src/app/api/cron/daily-report/route.ts` |
| Sentry sạch nhiễu | `sentry.server.config.ts` · `sentry.edge.config.ts` · `src/instrumentation-client.ts` · `src/lib/sentryApi.ts` |
| Ô canonical | `src/app/layout.tsx` · **`src/lib/siteBaseUrl.ts`** (mới) · **`tests/siteBaseUrl.test.ts`** (mới) |
| Config đọc tươi | 6 trang `src/app/admin/config/*/page.tsx` |
| Tài liệu | `CLAUDE.md` · `PROJECT_CONTEXT.md` · `TODO.md` |

Đã kiểm: `npm test` **582/582** · `tsc` sạch · `build` sạch. **Chưa deploy** — mọi bản vá
Sentry/cron chỉ có hiệu lực sau khi push.

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
| **27/08** | Đo lại `0/65` trang nội dung chưa được Google bò, để biết phép cắt sitemap 20/08 có tác dụng không. |

⚠️ Khi đọc kết quả 27/08, **cân nhắc hai giả thuyết chứ đừng chỉ một**: (a) nút thắt là
hạn mức bò, hoặc (b) nút thắt là đánh giá chất lượng — 42 bài đều do AI sinh, trên một tên
miền affiliate chưa có uy tín. Nếu là (b) thì **viết thêm bài AI là đào sâu thêm hố**.

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
| Google 30 ngày | **0 lượt bấm** · 3 URL trong chỉ mục · 0/65 trang được bò |

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
