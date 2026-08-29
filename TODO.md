# Offerdy — Việc đang làm

> **File này chỉ chứa việc đang làm.** Nhật ký các điểm dừng đã khép nằm ở
> [`docs/NHAT_KY.md`](docs/NHAT_KY.md) — 2.900 dòng, giữ nguyên văn vì chứa số đo đã
> tốn công đo và bẫy đã trả giá. Đừng chép chúng ngược lại vào đây.
>
> ⚠️ **28/08: lại phình lên 930 dòng.** Đã chuyển mục 27/08 và mọi thứ cũ hơn sang nhật ký,
> còn **380 dòng**. Lần trước (27/08) cũng đúng bài này: 908 → 533. Nó phình lại sau **một
> ngày** — nên đừng đợi tới lúc thấy nó dài, cứ khép điểm dừng là chuyển đi ngay.

---

## 🔖 Điểm dừng 2026-08-28

✅ **Việc chặn lớn nhất đã gỡ: khoá AI miễn phí chạy thật trên production.** Báo cáo hằng
ngày sinh lúc `2026-08-27T17:57:03Z` bằng `groq/openai/gpt-oss-20b` sau 4 ngày chết.

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | **612 / 612** |
| `npx tsc --noEmit` | sạch |
| `npm run build` | sạch |

| Commit | Việc |
|---|---|
| `eef9651` | `fix(ai)` — hàng rào thời hạn từng tồn tại mà **không chặn gì** (72,6s trong khi trần là 30s) |
| `199e184` | `feat(ai)` — `nameArticleIdeas` đi qua router (việc thứ 6) |
| `6d9a7d5` | `docs` — bẫy Vercel env, bảng đo router, "5 link hỏng" chỉ 1 hỏng thật |
| *(commit này)* | `fix(links)` — 401/403/429 là chặn truy cập, không kết luận được |

### 🎯 Giai đoạn 1 của trang quảng cáo — ĐÃ XONG 28/08: bịt lỗ hổng gắn nguồn

Kế hoạch đầy đủ ở `~/.claude/plans/l-n-t-ng-t-o-polished-panda.md` — **đọc trước, đừng
thiết kế lại.** Đã chốt với user: chỉ đề xuất (không tự động đấu thầu) · trần ngân sách
đặt bằng Google Ads Script phía Google · đích là Blog + Review + Store · doanh thu dùng
**lượt bấm sang merchant** làm đích thay thế (doanh thu thật nằm bên GoAffPro, không lấy
được).

**Vấn đề đã giải:** cookie gắn nguồn trước đây **chỉ** được đặt ở `/d/` và `/g/`. Quảng cáo
dẫn thẳng vào `/blog/...` thì cú bấm sang merchant sau đó không mang nguồn nào — tiền chạy
mà không quy được về chiến dịch. Đo được: **56 bản ghi `click`, chỉ 5 có nguồn.**

| File | Việc |
|---|---|
| `src/lib/attributionCookie.ts` (mới) | phần **thuần** của phép gắn nguồn, tách khỏi `attribution.ts` |
| `src/lib/proxyAttribution.ts` (mới) | đặt cookie cho mọi trang đích |
| `src/lib/shortLinkSource.ts` | thêm nguồn `google-ads` + `hasGoogleAdsClickId()` |
| `src/proxy.ts` | gộp nhánh gắn nguồn vào cổng gác admin |
| `tests/adAttribution.test.ts` (mới) | 8 assertion, **612 → 620** |

⚠️ **BẪY LỚN NHẤT — Next 16 đổi `middleware` thành `proxy`, và repo ĐÃ CÓ `src/proxy.ts`.**
Tôi viết `src/middleware.ts` theo trí nhớ và build gãy cứng: *"Both middleware file and proxy
file are detected"*. Next chỉ cho **MỘT** file proxy cả dự án, nên phải **gộp** logic gắn
nguồn vào chính cổng gác đăng nhập admin. Tài liệu ở
`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` — đúng lệnh `AGENTS.md`
là đọc trước khi viết, tôi đã bỏ qua và trả giá một vòng.

⚠️ **Thứ tự trong `proxy.ts` là vấn đề an ninh.** `DUONG_DAN_CAN_GAC` phải khớp y nguyên
`config.matcher`; sửa một bên mà quên bên kia là mở lỗ hổng. Đã kiểm đòn `/admin?s=ads-thu`
để thử đi vòng qua cổng gác — vẫn 307 về `/admin/login`.

⚠️ **Chỉ đặt cookie khi URL mang `?s=` hoặc click-id.** Không phải để tiết kiệm: đặt cookie
trên mọi lượt xem sẽ làm trang tĩnh trả về `Set-Cookie`, và một bản HTML đã cache kèm
`Set-Cookie` có thể phát nhầm cookie người này cho người khác. Đo trên `next start`: lượt
truy cập thường vẫn giữ `s-maxage=60`, chỉ lượt có tín hiệu mới thành `private, no-store`.

📌 **`google` và `google-ads` có CÙNG referer** — chỉ click-id (`gclid`/`gbraid`/`wbraid`)
tách được. Không tách thì tiền quảng cáo và lượt tìm kiếm miễn phí bị gộp làm một.

**Đã kiểm trên `next start` (không phải dev):**

| Phép kiểm | Kết quả |
|---|---|
| `?s=ads-thu&gclid=X` + referer Google | `google-ads\|ads-thu` ✅ |
| cùng referer, **bỏ** gclid | `google\|ads-thu` ✅ tách đúng |
| không tín hiệu gì | không đặt cookie, giữ `s-maxage=60` ✅ |
| `/d/1212?s=ig-thu` (đường cũ) | `instagram\|ig-thu\|1212` ✅ còn `entryCode` |
| `/admin`, `/admin?s=ads-thu` | 307 → `/admin/login` ✅ cổng gác nguyên vẹn |
| `/api/import` | 401 JSON ✅ |
| **Luật 8c** — gỡ bản vá, build lại, đo lại | cookie **biến mất**; lắp vào thì có ✅ |

⚠️ Trong lúc làm phép 8c đã dính đúng bẫy `AGENTS.md`: `taskkill` chạy nhưng **server cũ vẫn
sống**, log báo `EADDRINUSE`. Nếu không kiểm log trước khi đo thì đã đo nhầm bản cũ và kết
luận ngược. Trên Windows dùng `Stop-Process` của PowerShell, đừng dùng `taskkill //PID` qua
Git Bash — cú pháp bị nuốt.

**Chưa commit.** Còn Giai đoạn 2 (schema `adCampaign`/`adSpendEntry` + trang `/admin/ads`)
và Giai đoạn 3 (`src/lib/adPerformance.ts` + bộ đề xuất).

### 🎯 Giai đoạn 2 + 3 của trang quảng cáo — ĐÃ XONG 28/08

| File | Việc |
|---|---|
| `sanity/schemaTypes/adCampaign.ts` (mới) | chiến dịch: nhãn `?s=`, loại trang đích, ngân sách, trần |
| `sanity/schemaTypes/adSpendEntry.ts` (mới) | chi tiêu **một ngày một chiến dịch**, nhập tay từ Google Ads |
| `sanity/schemaTypes/configAds.ts` | thêm 2 ô **giả định** (tỉ lệ đơn ước tính, hoa hồng mặc định/đơn) |
| `src/lib/adPerformance.ts` (mới) | bộ đề xuất `tang`/`giu`/`dung`/`chua-du-so-lieu` + hàng rào PPC |
| `src/lib/adPlanner.ts` | tách `earningsPerOrder()` ra để hai bên dùng chung một nguồn |
| `src/app/admin/ads/` (mới) | trang + server action |
| `tests/adPerformance.test.ts` (mới) | 12 assertion, **620 → 632** |

**Ba điều trang này CỐ Ý không làm** — đừng "sửa" thành có:

1. **Không điều khiển Google.** Trần ngân sách và lệnh tắt phải đặt bằng Google Ads Script
   phía Google để cron chết thì trần vẫn giữ. Một cái nút ở admin mà Google không nghe là
   cảm giác an toàn giả.
2. **Không in số lợi nhuận.** Đơn hàng thật nằm bên GoAffPro. Thứ đo được là **chi phí mỗi
   lượt bấm sang merchant**. In ra "lãi" là bịa (luật 2).
3. **Không tự động tăng/giảm.** User đã chọn "chỉ đề xuất".

📌 **`chua-du-so-lieu` là phán quyết MẶC ĐỊNH và đó là câu trả lời ĐÚNG.** Ngưỡng 25 lượt
bấm sang merchant; với nền 21 lượt/30 ngày thì phần lớn chiến dịch sẽ nằm ở đây khá lâu.
Hai ngoại lệ bất đối xứng có chủ đích: **lỗ rõ thì dừng ngay** không chờ đủ mẫu, và **tiêu
gấp 3 ngưỡng mà 0 lượt bấm cũng dừng** (Poisson λ=3, P(0 lượt) ≈ 5%). Cho phép dừng sớm
(sai thì mất cơ hội), không cho phép tăng sớm (sai thì mất tiền).

### 🚨 BẪY MỚI, ĐẮT, SẼ CẮN LẠI — loại tài liệu MỚI vô hình với truy vấn không token

Chú thích trong [`src/sanity/client.ts`](src/sanity/client.ts) viết *"dataset production là
PUBLIC, đọc được không cần token"*. **Điều đó KHÔNG đúng với loại tài liệu mới.** Đo 28/08,
cùng endpoint `api.sanity.io`, chỉ khác header `Authorization`:

| Loại | Không token | Có token |
|---|---|---|
| `adCampaign` | **0** | **2** ⚠️ |
| `adSpendEntry` | **0** | **2** ⚠️ |
| `click` | 57 | 57 |
| `captionLog` | 3 | 3 |
| `store` | 107 | 107 |

Và nó trả về **mảng rỗng chứ không ném lỗi** — trang hiện "0 chiến dịch" y hệt như khi chưa
tạo cái nào. Mất một vòng đo mới tìm ra: tạo tài liệu xong, `curl` xác nhận HTTP 200 +
`operation: "update"`, mà trang vẫn trống.

**Luật rút ra: thêm một loại schema mới thì đường đọc phải dùng `writeClient` (có token),
đừng dùng `client`.** `/admin/ads` nay dùng `writeClient` để đọc, như `/admin/ad-planner`.

⚠️ **Kèm theo đó: mọi script `.scratch/` truy vấn không token sẽ "thấy 0" cho hai loại này**
— kể cả script kiểm-đã-xoá-chưa. Đó là một phép đo không phân biệt được "đã xoá" với "không
nhìn thấy". Dùng `.scratch/soi-public-read.mjs` để so hai bên.

### ✅ Đã kiểm bằng Chrome thật (không chỉ test)

Tạo 2 chiến dịch thử + 2 ngày chi tiêu, đo, rồi **xoá sạch** (đã xác nhận bằng truy vấn có
token). Cố ý **không** tạo tài liệu `click` giả — chúng sẽ làm bẩn 57 bản ghi click thật và
không phân biệt lại được.

| Phép kiểm | Kết quả |
|---|---|
| Bố cục 390px | 390/390, 0 xén im lặng, 26 khối cuộn có chủ đích ✅ |
| Phán quyết Poisson | $12,40 tiêu / 0 lượt / ngưỡng $0,24 → **"Nên dừng"** kèm lý do ✅ |
| Hàng rào PPC — store chưa khai | bấm ▶️ → server từ chối, Sanity vẫn `draft` ✅ |
| Hàng rào PPC — chiều ngược lại | blog bấm ▶️ → `active` ✅ **phân biệt được, không chặn bừa** |
| `npm test` · `tsc` · `build` | **632/632** · sạch · sạch ✅ |

⚠️ Hai lần suýt kết luận sai trong lúc đo, cả hai đều là bẫy đã ghi sẵn:
`node do-admin-mobile.mjs /admin/ads` **thiếu `MSYS_NO_PATHCONV=1`** nên đo nhầm trang 404
(rộng 980px = bề rộng mặc định của trang không có viewport meta), và script kiểm hàng rào
in nhãn cứng "HANG RAO THUNG" trong khi kết quả thật là đúng.

**Còn lại cho user** — hướng dẫn đầy đủ đã viết ở
[`docs/03-workflows/WORKFLOW_GOOGLE_ADS.md`](docs/03-workflows/WORKFLOW_GOOGLE_ADS.md),
script chặn ngân sách ở
[`docs/03-workflows/google-ads-tran-ngan-sach.js`](docs/03-workflows/google-ads-tran-ngan-sach.js).
⚠️ Script mới chỉ kiểm được **cú pháp** (`node --check`); các lệnh `AdsApp.*` đối chiếu tài
liệu chính thức 28/08 nhưng **chưa chạy thật lần nào** — bắt buộc bấm *Preview* trước *Run*.

**Chưa commit.**

### 💳 Google Ads đã chạy thật — 28/08, và ba việc code còn nợ

Tài khoản **610-787-1439** (`tkpro1.2026@gmail.com`), **tiền tệ VNĐ**, múi giờ GMT+7.
Chiến dịch đầu: Search → bài blog *12-Volt Car Refrigerator 58L vs 15L*, nhãn
`?s=ads-fridge-58l`, ngân sách **61.561đ/ngày**, CPC trần **4.000đ** (~$0,15),
Hoa Kỳ · Tiếng Anh · **không** Display, **không** Search Partners.

⚠️ **Tài khoản tính bằng VNĐ, không phải USD** — kéo theo ba hệ quả:
1. Script chặn ngân sách đã sửa: `TRAN_MOI_NGAY_VND = 150000` (≈2,5× ngân sách ngày;
   Google được tiêu tới 2× ngân sách trong một ngày lẻ nên đặt bằng ngân sách sẽ tắt oan).
   **`getStatsFor().getCost()` trả tiền theo đơn vị TÀI KHOẢN, không phải USD** — ghi `5`
   định là "5 đô" thì script hiểu 5 đồng và tắt sạch ngay lần chạy đầu, **không báo lỗi**.
2. Ô giá thầu trần cũng bằng đồng: điền `0.15` = 0,15 đồng = 0 hiển thị, nhìn y hệt
   "thị trường quá đắt". Đã bắt kịp trước khi chạy.
3. `/admin/ads` tính bằng USD → mỗi ngày phải quy đổi tay. Tỉ giá 28/08 ≈ **26.200đ/$1**.

**BA VIỆC CODE — ĐÃ XONG CẢ BA, 28/08:**

1. ✅ **XONG — sửa lỗi trộn tiền tệ trong `adPlanner.ts`.** `estimateAvgOrderValue()` nay
   **nhận chuỗi giá thay vì số**, tự đọc bằng `parsePriceAmount` + `priceSymbol`, gom theo
   tiền tệ rồi chỉ lấy trung bình **trong nhóm đông nhất**, trả thêm `symbol` và `skipped`.
   Thêm `estimateDungDuocLamUSD()` — chỉ `$` mới được đưa vào `breakEven()`; `€` cũng bị
   chặn (lệch 5–20%). Giao diện `/admin/ad-planner` hiện ước lượng kèm ký hiệu thật và
   dòng *"không phải USD — quy đổi rồi gõ tay"*.
   **Kiểm trên dữ liệu production thật:** WoWGadgets99 (₹) → *"KHÔNG tính"* thay vì `good`
   giả; Bodegacooler ($520) → *cần 1,0% → good*; Cloud Cushion vẫn đúng 10,5% như số cũ
   (không hồi quy shop USD). Test thêm 5 ca, **632 → 637**.
   *(mô tả lỗi cũ:)* `estimateAvgOrderValue()` lấy trung
   bình số thô từ `parsePriceAmount()`, mà hàm đó **không quy đổi tiền tệ**. Đo lại 28/08
   tách theo ký hiệu: **wowgadgets99.com = ₹1.257 ≈ $15**, không phải $1.257 — sai **83
   lần**. Kết luận *"WoWGadgets99 cần 0,4% khách mua → có cửa"* đang nằm trong `TODO.md`,
   trong chú thích `adPlanner.ts` và **đóng đinh trong `tests/adPlanner.test.ts`** là
   **SAI**; nó là shop tệ nhất chứ không phải tốt nhất. Shop thật sự đáng chạy là
   **bodegacooler.com ($520/đơn, 41 deal, USD)** — cần ~1% khách mua.
2. ✅ **XONG — ô tỉ giá ở `/admin/ads`.** Chọn đơn vị `đ`/`$` ngay trong form nhập chi phí;
   **quy đổi ở SERVER** (client là thứ sửa được). Bản ghi lưu cả `costNhapVao`, `donViNhap`
   và `tyGia` — ba tháng sau nhìn lại `$0,47` vẫn biết nó từ bao nhiêu đồng, tỉ giá nào.
   **Kiểm bằng Chrome thật:** gõ `61561đ` @ 26.200 → Sanity lưu `cost: 2.3496564…` ✅
3. ✅ **XONG — và KHÔNG CẦN VIẾT DÒNG NÀO.** Đọc code trước khi viết đã tránh được cả một
   tính năng thừa: `AffiliateLink.tsx` **đã** đẩy `dataLayer.push({event:'affiliate_click'})`
   và GTM (`GTM-K3N8W8B8`) **đã** nằm sẵn trong `layout.tsx`. Kiểm bằng Chrome thật trên
   `/stores/bodegacooler`: sự kiện bắn đúng, kèm `affiliate_url` + `store_name`.
   Việc còn lại là **cấu hình trong GTM**, đã ghi thành Bước 5b của
   `docs/03-workflows/WORKFLOW_GOOGLE_ADS.md` (ID `AW-18414886120`, trigger Custom Event
   `affiliate_click`, **để trống ô Giá trị** — site không biết đơn hàng đáng bao nhiêu).
   ⚠️ Kỳ vọng đúng mức: thuật toán cần ~15–30 chuyển đổi/tháng, site đang 21 lượt/30 ngày —
   giá trị 1–2 tháng đầu là **báo cáo**, chưa phải tối ưu.

⚠️ **BẪY MỚI ĐÃ SUÝT LÀM SAI PHÉP ĐO:** `npm run dev` khi cổng 3000 bận thì Next **không**
báo `EADDRINUSE` — nó lặng lẽ nhảy sang **3001** và ghi `Port 3000 is in use by process N`.
Mọi script đo vẫn gọi 3000 và đo **server cũ**. Vòng kiểm chỉ grep `EADDRINUSE` là **không
đủ**; phải grep thêm `"Port 3000 is in use"` **và** `"Local:.*localhost:3000"`.

### 🚨 LỖ HỔNG LỚN NHẤT PHÁT HIỆN 28/08 — link trong bài blog KHÔNG được đếm

Phát hiện **sau khi chiến dịch Google Ads đã bật**, trong lúc kiểm chuỗi đo đầu-cuối.

**Vấn đề:** thân bài blog/review render bằng `dangerouslySetInnerHTML`, và nút mua là thẻ
`<a>` **HTML thô** do [`postRender.ts:111`](src/lib/postRender.ts) sinh ra — **không phải**
component `AffiliateLink`. Không `onClick` nghĩa là không gì được đếm: không tài liệu
`click`, không `dataLayer`, không chuyển đổi Google Ads.

**Vì sao nó tệ hơn "thiếu số liệu":** `/admin/ads` sẽ thấy chi phí tăng mà 0 lượt bấm, rồi
phán quyết **"Nên dừng"** theo nhánh Poisson. Phán quyết đó **sai** — lượt bấm có thể đang
xảy ra mà không ai đếm. Máy tự tin nói một điều nó không biết, đúng thứ `chưa-đủ-số-liệu`
được dựng để tránh, mà bị chọc thủng từ hướng khác.

**Đã sửa:**

| File | Việc |
|---|---|
| `src/components/ArticleLinkTracker.tsx` (mới) | nghe click **uỷ quyền** ở `document`, lọc bằng `closest('.article-body')` |
| `src/actions/trackClick.ts` | thêm `trackArticleLinkClick(url)` — suy store theo **domain** (`hostKey`), ghi `articleHost` |
| `blog/[slug]/page.tsx` · `reviews/[slug]/page.tsx` | gắn `<ArticleLinkTracker />` |

📌 **Component `return null`, không bọc quanh gì cả.** `.article-body` có **18 quy tắc CSS**;
chèn thêm một `<div>` là rủi ro vỡ bố cục 42 bài đang chạy tốt để đổi lấy không gì. Nghe ở
`document` cho cùng kết quả mà không đụng một byte DOM.

📌 Dùng **đúng tên sự kiện** `affiliate_click` như `AffiliateLink.tsx` — hai đường khác nhau
nhưng một sự kiện, để **một** trigger GTM phủ được cả hai.

📌 **Không `preventDefault`**: người ta bấm để đi mua hàng, giữ lại cho một lượt ghi Sanity
(~350ms) là trực tiếp làm mất đơn.

### ⚠️ VÀ MỘT BẪY ĐO LƯỜNG MỚI — Chrome headless TỰ BỊ CHẶN

Sau khi sửa xong, phép đo **vẫn ra 0**, và suýt nữa tôi đi sửa tiếp một đoạn code không hỏng.

Nguyên nhân: `isLikelyBot()` chặn UA chứa `headlesschrome`, mà Chrome headless **tự khai
đúng chuỗi đó**. Proxy thấy "bot" nên cố tình không đặt cookie gắn nguồn — **hành vi đúng của
code**, nhưng nó làm mọi phép đo lái bằng CDP ra 0 và **trông y hệt như code hỏng**.

🔧 **Luật: mọi script CDP đo phần gắn nguồn PHẢI ghi đè UA:**
```js
await send('Network.setUserAgentOverride', { userAgent: '...Chrome/140.0.0.0 Safari/537.36' })
```
Đã vá 4 script trong `.scratch/`. Cách nhận ra: cookie `ofd_src` không xuất hiện trong
`Network.getCookies` dù `curl` (có UA thật) thấy header `Set-Cookie`.

**Đã kiểm chứng, cả hai chiều (luật 8c):**

| Phép kiểm | Kết quả |
|---|---|
| Vào URL quảng cáo, bấm link trong bài | `click` có `source: "google-ads"`, `campaign: "ads-fridge-58l"` ✅ |
| Gỡ `<ArticleLinkTracker />` ra, đo lại | **không ghi bản ghi nào** ✅ phép đo phân biệt được |
| Lắp lại | ghi được ✅ |
| `npm test` · `tsc` · `build` | **637/637** · sạch · sạch ✅ |

🧹 Đã xoá **5 bản ghi `click` do chính phép kiểm tạo** — chúng mang nhãn thật `ads-fridge-58l`
nên để lại sẽ cộng vào số của chiến dịch. `count(click)` về lại **57**, nhãn chiến dịch về **0**.

### 📌 Trạng thái Google Ads cuối ngày 28/08

- Tài khoản `610-787-1439`, chiến dịch đã tạo, **user đã tạm dừng** chờ deploy bản vá này
- Script trần ngân sách **đã cài, đã chạy, đã đặt lịch hằng giờ**; nhãn `OFFERDY_TAT_TU_DONG`
  đã tạo trong tài khoản
- Bản ghi `adCampaign.ads-fridge-58l` đã tạo trong Sanity (ngân sách $2,35 · trần $5,73),
  `configAds.tyGiaVndPerUsd = 26200`
- ⚠️ **CHƯA kiểm được đơn vị tiền của script** — chi tiêu hôm nay là 0, mà `0 >= 150000` sai
  ở cả hai cách hiểu đơn vị nên phép đo **không phân biệt được** (luật 8c). Sau ngày chạy đầu
  tiên: mở Nhật ký script, so con số với chi tiêu Google báo cùng ngày. Ra `~61000d` là đúng;
  ra `~2.35` thì `getCost()` trả USD và phải đổi trần thành `6`.
- **PHẢI DEPLOY trước khi bật lại chiến dịch** — không thì vẫn không đếm được gì.

### 📌 MAI LÀM TIẾP — 29/08/2026

1. ✅ **XONG 28/08 — đã dọn 5 nhãn `broken` sai của Apollo Moda.**
   `node .scratch/don-nhan-broken-sai.mjs --ghi`. Đo bằng chính `BROKEN_LINK_GROQ`
   (chép từ `checkOfferLink.ts:112`): **8 → 3**. Ba cái còn lại đều đúng:
   2 WoWGadgets99 (trả 200, sẽ tự lành thành `ok` sau cron đêm) và 1 Urtopia đã ẩn.
   📌 Kiểm trước khi ghi: script dùng `unset: ['linkStatus']` chứ không đặt `"unchecked"`.
   An toàn vì `linkStatus == "broken"` không khớp `null`, và chỗ đếm duy nhất có nguy cơ
   (`linkStatus != "unchecked"` ở `queries.ts:1097`) **đã kèm `defined()`** — đúng bẫy
   GROQ `null != ""` mà dự án đã trả giá.
2. ✅ **XONG 28/08 — đã ẩn offer Urtopia** (`jL1U8dTGKJX6KazVlT1Def`, €4.798). User chọn ẩn
   thay vì đổi link. `active: true → false`, đọc lại qua `api.sanity.io` (**không** qua CDN)
   để xác nhận chứ không tin mã thoát. Store Urtopia EU còn 4 offer, cả 4 `linkStatus=ok`.
   Script: `.scratch/an-offer-urtopia.mjs`.
   📌 Offer **vẫn nằm trong cron kiểm link đêm** (`active == true || linkStatus == "broken"`),
   nên nếu Urtopia bán lại bundle thì nhãn tự lành — chỉ cần bật `active` lại.
   ⚠️ Vấp lại luật 8b ngay lần đầu: gõ bộ lọc theo trí nhớ (`Bundle Carbon 1 Pro`) trong khi
   tiêu đề thật là *"Bundle **with** Carbon 1 Pro **and** Carbon Fusion"* → khớp **0**. Lọc
   theo URL (chuỗi duy nhất, chép nguyên văn từ dữ liệu) mới đúng.
3. **Phân phối, không xây thêm.** 📌 Giai đoạn 1 ở trên đã làm mọi trang đích gắn được
   nguồn, nên 3–5 bài Instagram sắp đăng **đo được thay vì mù** — thêm `?s=<nhãn>` vào link
   là xong. Số đo 28/08: **0 click hôm nay · 9 trong 7 ngày · 21 trong
   30 ngày · 56 click cả đời · 95/107 store chưa từng có click**. Short-link: **2 lượt mở cả
   đời, lần cuối 25/07** — cơ chế đếm không hỏng (nó đã ghi được 2 lượt), nghĩa là 30 ngày
   qua **không có gì được đăng**. Đăng thật 3–5 bài qua short link là việc duy nhất đổi được
   con số 21.
4. **30/08**: mốc đo đã hẹn — `/blog` được bò chưa, `28/65` có nhích không.

### Còn treo — user quyết

- 🔜 **Google Cloud TTS thay Gemini TTS — user đã chốt "thêm sau", ĐỪNG làm khi chưa được bảo.**
  Đo 29/08, **đã gọi thật**, đừng đo lại:

  | Câu hỏi | Trả lời đo được |
  |---|---|
  | Service account có đủ quyền không? | **CÓ** — lấy được token cho scope `cloud-platform` |
  | Vướng ở đâu? | `403 SERVICE_DISABLED` — **chỉ cần bật API**, không phải thiếu quyền |
  | Bật ở đâu? | `console.developers.google.com/apis/api/texttospeech.googleapis.com/overview?project=44190989233` |
  | Hạn mức miễn phí | **1 triệu ký tự/tháng** (Neural2) · 4 triệu (Standard) → lời đọc ~400 ký tự ⇒ **~2.500 video/tháng** |
  | Điều kiện | ⚠️ **BẮT BUỘC bật thanh toán** (gắn thẻ) dù dùng phần miễn phí; vượt là tự tính tiền |

  **Ba thứ được thêm nếu đổi:** trả **mp3** thẳng (khỏi WAV, khỏi `pcmWav.ts` ở đường này) ·
  có tham số `speakingRate` **thật** thay vì phải dặn bằng câu chỉ dẫn tiếng Anh · và
  [`src/lib/googleAuth.ts`](src/lib/googleAuth.ts) **đã nhận `scope` làm tham số** nên chỗ
  xác thực không phải viết gì mới.

  📌 Script đo sẵn: `.scratch/do-gcloud-tts.mjs` — chạy lại sau khi bật API là biết ngay.
  ⚠️ Script đó **không tự đọc `.env.local`**: heredoc nuốt dấu `\` trong khoá riêng và
  OpenSSL báo `DECODER routines::unsupported`, nghe y hệt sai khoá. Nó dùng `loadEnv()`.

  🚫 **Đã đo và LOẠI: Groq không có TTS.** Hỏi `/openai/v1/models` bằng chính khoá của dự
  án: 14 model, phần tiếng nói chỉ có `whisper-large-v3` và `-turbo` (tiếng → chữ). Đừng
  đi tìm lại.

  ⚠️ **Và cân nhắc trước khi làm:** sáng 29/08 là ~5 video/ngày, sau bản gộp là **~20**, còn
  số video đã đăng là **0**. Nâng 20 → 2.500 là giải một vấn đề chưa gặp — đúng cảnh báo
  lớn nhất của dự án. Chỉ làm khi đã có ngày thật sự chạm trần.

- **`AI_TASK_PROVIDER_article_names`**: để mặc định thì `article-names` rơi xuống Gemini lite
  và mất ~6/8 tên mỗi lần quét (hậu kiểm loại). Đặt `=anthropic` thì giữ chất lượng — việc
  này chạy tay, ít lần, và tên bài quyết định SEO. Bảng đo đầy đủ ở `docs/AI_ROUTER.md`.
- **Xoay 6 khoá API đã lộ** (dán thẳng vào khung chat 27/08).
- ✅ **`.gitignore` cho `.scratch/` — XONG 28/08.** `git status`: **228 → 2** (chỉ còn
  đúng hai file tôi vừa sửa). Luật: bỏ qua tất cả, **trừ** `.md` nằm trong thư mục con —
  đó là quy ước issue tracker (`docs/agents/issue-tracker.md`); `.md` nằm ngay dưới
  `.scratch/` là ghi chú nháp (có bản sao 346 KB của `NHAT_KY.md`) nên không theo dõi.
  ⚠️ Dòng `!.scratch/**/` là **bắt buộc**: git không mở lại được một file nếu thư mục cha
  của nó đang bị loại. Đã kiểm bằng `git check-ignore` trên 8 đường dẫn thật, đạt cả 8.
  📌 **Đo lại nỗi lo "lộ trên repo công khai": nhẹ hơn ghi ở đây.** Chưa file `.scratch`
  nào từng bị commit ngoài `clean-store-scripts.mjs` (đã soi: 0 khớp mẫu bí mật).
  `envkey.mjs` **không chứa khoá** — nó chỉ đọc `.env.local`. Thứ duy nhất đáng che là
  `cookies.txt` (cookie phiên đã ký của 3 tài khoản thử). Rủi ro là *"một lần `git add .`
  là lộ"*, không phải *"đang lộ"*. `.gitignore` **không gỡ file đã commit** — nếu sau này
  lỡ commit thì phải `git rm --cached`.

---

## 🔖 Điểm dừng 2026-08-29 — lời đọc video sinh thẳng trên web, dùng được từ điện thoại

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | **677 / 677** (trước 647) |
| `npx tsc --noEmit` · `npm run build` | sạch |
| Lái Chrome thật, khung 390px | 4/4 nhịp hiện · 390/390 · **0 xén im lặng** |
| `ffprobe` đọc tệp sinh ra | `pcm_s16le` · 24000Hz · mono · 16-bit ✔ |

**Việc user đặt ra:** ở `/admin/social-kit`, dưới dòng *Lấy ảnh sản phẩm*, thêm chỗ tải
video lên rồi hệ thống chèn lồng tiếng + sub và đẩy lên Google Drive — vì *"thường tôi làm
việc này trên điện thoại"*.

⚠️ **Đã đổi hướng sau khi đo, và user đồng ý.** Dựng video cần ffmpeg mà `/admin/*` chạy
trên Vercel thì không có ffmpeg (`PROJECT_CONTEXT.md`, *Rendering runs locally*). Tra ra
**CapCut trên điện thoại đã có sẵn cả text-to-speech lẫn tự tạo phụ đề**. Thứ CapCut không
làm được là viết *nội dung* — giá thật, mã thật, hàng rào chống bịa số. Nên Offerdy chỉ lo
phần đó và giao **chữ + tệp tiếng**; CapCut lo phần dựng. Không cần Drive, không cần máy
nào phải bật.

### Đã dựng

| File | Việc |
|---|---|
| `src/lib/tts/pcmWav.ts` (mới) | PCM thô → WAV bằng JS thuần: cắt lặng, ghép, bọc/bóc đầu tệp |
| `src/lib/tts/geminiVoice.ts` (mới) | gọi Gemini TTS, **xoay 2 khoá**, phân biệt hai loại 429 |
| `src/lib/tts/giongNoi.ts` (mới) | danh sách giọng — tách riêng để client không kéo registry khoá API vào gói trình duyệt |
| `src/lib/tts/docSoLen.ts` (mới) | `$14.99` → *"fourteen ninety-nine"*, đi qua `parsePriceAmount` |
| `src/lib/ai/generateVoiceover.ts` (mới) | 4 nhịp HOOK/PROBLEM/PRODUCT/CTA qua router |
| `src/app/admin/social-kit/tieng/route.ts` (mới) | một nhịp một request → tệp `.wav` tải về |
| `tests/ttsPcmWav.test.ts` · `tests/voiceoverGuards.test.ts` | +30 assertion |

### 🚨 SỐ ĐO PHẢI GIỮ — đừng đo lại

**Gemini TTS có HAI hạn mức, cùng trả 429:**

| Hạn mức | Giá trị | Chờ có ích không |
|---|---|---|
| `GenerateRequestsPerMinutePerProjectPerModel-FreeTier` | **3 / phút** | có, 15 giây |
| `generate_content_free_tier_requests` | **10** (chưa thấy reset ⇒ gần như chắc là /ngày) | **không** |

📌 **Mỗi khoá một hạn mức riêng** — đo cùng lúc: `GEMINI_API_KEY` trả 429 trong khi
`GEMINI_API_KEY_2` trả 200. Nay có **năm** khoá (`GEMINI_API_KEY`, `_2`…`_5`), đo 29/08
cả năm trả 200 cho cả sinh chữ lẫn TTS ⇒ ~50 lần đọc/ngày.
⚠️ Khoá mới chỉ có tác dụng khi tên biến được thêm vào `KHOA_ENV` trong
`src/lib/ai/router/registry.ts` — dán vào `.env.local` thôi thì nó nằm im, không báo gì. Nên `docThanhPcm` xoay khoá qua `khoaCuaNha('gemini')`.
⚠️ `khoaCuaNha` trả **giá trị** khoá, `tenBienKhoa` mới trả tên biến. Tra `env[...]` lên
giá trị thì ra rỗng và lỗi hiện ra là *"chưa có GEMINI_API_KEY"* — nghe y hệt chưa khai báo.

**Đọc nhanh lên bằng CHỈ DẪN, không có tham số `rate`:** cùng một câu, đọc thô **3,10s**,
kèm *"Read this as a fast, upbeat social video voiceover…"* còn **2,14s**. Câu chỉ dẫn
không bị đọc lên.

**⚠️ Tốc độ đọc KHÔNG phải hằng số** — đây là chỗ tôi sai và phải sửa:

| số chữ | giây | chữ/giây |
|---|---|---|
| 2 | 1,36 | 1,47 |
| 5 | 2,04 | 2,45 |
| 18 | 5,90 | 3,05 |

Mỗi đoạn có phí cố định **~0,79 giây** rồi mới tới phần theo số chữ:
`giây = 0,79 + 0,284 × số chữ` (khớp ba điểm trên, sai số < 0,2s). Mô hình phẳng
"2,3 chữ/giây" lấy từ **một** phép đo lệch tới 40% ở đoạn ngắn, và nó ép ngân sách nhịp
PRODUCT xuống 18 chữ trong khi 8 giây chứa được **25**.

### 🚨 BA BẪY ĐÃ TRẢ GIÁ TRONG PHIÊN NÀY

1. **Loại cả nhịp vì dài quá là sai người sai việc.** Chạy thật vứt mất nhịp **HOOK** vì lố
   đúng một chữ — tức vứt câu quan trọng nhất của video để đổi 0,1 giây. Bịa số là vấn đề
   *sự thật* → chặn cứng. Dài quá là vấn đề *tay nghề* mà người dựng nhìn thấy và tự cắt →
   hiện lên kèm số giây, tô cam, **không loại**.
2. **`dealDiscountBadge` trả `{main, sub}` chứ không trả chuỗi** → `[object Object]` giữa
   lời đọc. Và test đầu tiên **không bắt được** vì cả hai vế so sánh đều hỏng giống nhau —
   đúng luật 8c, một phép đo không phân biệt được hỏng với chạy.
3. **Chỉ ảnh chụp mới lộ ra lỗi nội dung.** Bảng số báo *"0 vượt khung, 0 xén im lặng"* hai
   lần liền, trong khi ảnh cho thấy HOOK đọc **"thirty-one percent off off today"** (chữ
   `off` lặp vì `{discount}` đã mang sẵn OFF) và CTA đọc **"OFFERDY mở ngoặc năm phần trăm"**.
   📌 Cũng dính lại `MSYS_NO_PATHCONV`: lần đo đầu Git Bash biến `/admin/social-kit` thành
   `C:/Program Files/Git/admin/social-kit`, và nó vẫn báo **"0 lỗi"**.

### Bổ sung cùng ngày — ô nhập độ dài video (`5b84a61`, đã push + deploy)

Khung 0–2 / 2–7 / 7–15 giây trước đây **ghi cứng**, nên video 30 giây thì cả bốn khung sai
và lời đọc hết trước khi video hết. Nay có ô **phút / giây** ngay trên nút *Viết lời đọc*.

```
hook = min(2s, T×0,15)   ·   cta = min(4s, T×0,2)   ·   còn lại: PROBLEM 38% / PRODUCT 62%
```

📌 **Đặt T = 19s thì công thức trả về 2,0 / 5,0 / 8,2 / 3,8** — gần đúng bằng khung
2 / 5 / 8 / 4 thiết kế bằng tay. Nên nó là cách viết tổng quát của thứ đã có, không phải
công thức mới nghĩ ra. Có test chốt điều đó.

⚠️ **HOOK có TRẦN, không giãn theo video.** Người xem quyết định lướt tiếp trong ~2 giây
đầu bất kể video dài bao nhiêu; chia đều theo tỉ lệ sẽ cho HOOK 9 giây ở video 60s.

| Kiểm | Kết quả |
|---|---|
| `npm test` | **687 / 687** |
| Chrome thật, 390px, video **30 giây** | khung ra 0–2s / 2–11,1s / 11,1–26s / 26–30s · 4/4 nhịp · 0 xén im lặng |

**Bốn bẫy nữa đã trả giá:** `Math.max(5, NaN)` vẫn là `NaN` nên phép kẹp không chặn được →
giao diện hiện `NaNs` · in thẳng số thực ra màn hình cho `9.120000000000001s` · `{code}` đã
mang sẵn chữ "number" mà mô hình viết thêm → *"number number one one seven eight"* (cùng họ
với "off off") · `offerText` kiểu `$100 Off` đọc lên thành *"dollar one hundred off"*.

🚨 **Và hai bẫy về PHÉP ĐO, không phải về code:**

1. **Giả lập sự kiện `input` để đặt giá trị ô nhập KHÔNG ăn.** React gắn `_valueTracker` và
   bỏ qua sự kiện khi tracker nói giá trị không đổi. Script vẫn báo *"đã đặt"* rồi lặng lẽ
   sinh khung của video **15 giây** trong khi tôi tưởng đang đo video 30 giây — một phép đo
   sai mà trông như chạy tốt. Phải **gõ thật** qua `Input.insertText`.
2. **Một lượt chạy báo "0 nhịp, không lỗi" thật ra là phiên đăng nhập bị đá ra.**
   `requireAdmin()` gọi `redirect()`. Nay script in **URL** trước mọi kết luận — bị đá ra
   và code hỏng nhìn giống hệt nhau nếu chỉ đếm số nhịp.

### Bổ sung — hỏi lại khi mô hình bịa số (`d51991c`, đã push)

Chạy thật trên production, deal **#1471**: mô hình viết `$2…` vào `hienTrenMan` của nhịp
HOOK thay cho `{price}`. Hàng rào loại **đúng** — nhưng hậu quả sai: mất luôn câu quan trọng
nhất của video.

**Không nới hàng rào.** Một con số bịa đọc lên thành tiếng thì người nghe không đối chiếu
lại được. Thay vào đó: **hỏi lại một lần**, kèm đúng lý do vừa trượt. Nhịp đã đạt được giữ
nguyên, nhịp vá vào nằm lại đúng chỗ trong phễu. Chỉ **một** lần — hai mô hình cùng bịa ở
cùng một chỗ là tín hiệu cần nói ra, không phải thứ để lặp cho tới khi may mắn.

Cũng siết chỗ **mời gọi** bịa số: brief của HOOK trước viết *"usually the price"*, tức bảo
mô hình mở đầu bằng một con số mà nó không được cho biết.

| Kiểm | Kết quả |
|---|---|
| `npm test` | **691 / 691** |
| Chạy lại chính deal #1471 ở 16 giây | 4/4 nhịp · 0 bị loại · tổng ~16,5s cho video 16s |

⚠️ **Quan sát chưa giải thích được — ĐỪNG đọc thành kết luận.**
`groq/openai/gpt-oss-20b` trả `json_validate_failed` ở **4 trên 6** lượt gọi việc này, mất
~3 giây rồi router mới rơi xuống Gemini. Nghi `.length(4)` ép `minItems`/`maxItems`; thử nới
thành `.min(1).max(6)` ra **1 đạt / 1 trượt**. Hai lượt không phân biệt được gì (luật 8c),
nên **giữ schema chặt** và ghi lại. Không chặn gì — router tự rơi sang nhà khác.

📌 **Không xác nhận được bản này đã lên production từ bên ngoài.** Thay đổi nằm hoàn toàn ở
phía máy chủ nên chuỗi nhận dạng bị cắt khỏi gói trình duyệt; hai phép dò đầu (`buildId`, và
chuỗi trong chunk JS) đều **không phân biệt được**. Thứ biết chắc: đã có một bản dựng mới
hơn `5b84a61` đang chạy (tên chunk CSS đã đổi). Phép kiểm thật là bấm nút.

### Bổ sung — đọc cả bài trong MỘT lần gọi (`e365e3f`, đã push)

User hỏi: gộp 4 nhịp thành 1 lần gọi được không. **Được** — và đó là khác biệt giữa
**~5 video/ngày và ~20**.

📌 **Số đo quyết định**, trên đúng bốn nhịp deal #1471, hai lượt gọi thành công:

| Lượt | Tổng | Ba khe ranh giới | Khe dài nhất *trong câu* |
|---|---|---|---|
| 1 | 18,21s | 0,72 / 0,76 / 0,72s | — |
| 2 | 17,25s | 0,62 / 0,56 / 0,54s | **0,10s** |

Biên cách nhau hơn **năm lần**, nên ngưỡng 0,30s nằm giữa rất thoáng.

⚠️ **Cách soạn quyết định kết quả.** Cùng bốn nhịp: đánh số `1.` `2.` → **đúng 3 khe**;
chỉ xuống dòng đôi → **chỉ 2 khe**, hai nhịp dính làm một. Phải đánh số và phải dặn đừng
đọc số lên.

**An toàn quan trọng hơn phần tiết kiệm:** `catThanhDoan` trả `null` chứ **không đoán** chỗ
cắt khi không tìm đúng số khe. Khi đó người dùng nhận **một tệp liền** và được nói rõ — thay
vì bốn clip đứt giữa từ, thứ vẫn mở được và chỉ lộ ra sau khi đã dựng xong video.

**Ba bẫy đã mắc khi viết:** kiểm độ dài tối thiểu trên đoạn *chưa cắt lặng* → nửa khoảng
nghỉ hai bên che mất nhịp cụt 0,1s, phép chặn tồn tại mà không chặn gì · `assert.equal(x,
null)` in cả mảng byte khi trượt → một lần chạy test mất **27 giây** chỉ để dựng thông báo ·
suýt gửi mốc cắt trên đường lùi, nơi các nhịp được ghép **kèm** khoảng nghỉ 0,35s nên mốc
lệch dần từ đoạn thứ hai.

| Kiểm | Kết quả |
|---|---|
| `npm test` | **698 / 698** |
| `tsc` · `build` | sạch |

🚨 **HAI THỨ CHƯA ĐO ĐƯỢC — đừng đọc thành "đã xong":**

1. **Chưa chạy đầu-cuối đường gộp.** Hạn mức đọc cả hai khoá đã cạn vì chính các phép đo
   hôm nay. Phép cắt là hàm thuần đã có test trên đúng số đo thật, và lượt gọi gộp đã chạy
   thật hai lần qua HTTP thô — nhưng chuỗi *nút → route → cắt → tải về* thì chưa lần nào.
2. **Chưa đo được tỉ lệ lỗi 500.** Bốn lần gặp 500 trên cả hai khoá, nhưng phép so có đối
   chứng (văn bản dài vs ngắn) bị 429 nuốt mất nên **không tách được** "văn bản dài gây 500"
   với "Google trục trặc lúc đó". Đã phòng: thử lại 2 lần khi gặp 5xx (5xx không tốn hạn
   mức) và có đường lùi về đọc từng nhịp.

### Còn lại cho tính năng này — VIỆC ĐẦU TIÊN NGÀY MAI

Cả hai việc dưới đây chỉ cần **một** lần bấm nút 🔊 là xong cả hai:

1. **Bấm 🔊 trên `/admin/social-kit`, deal bất kỳ.** Nó kiểm luôn: đường gộp có chạy thật
   không · cắt ra đúng 4 nhịp không · và hạn mức ngày có hồi không.
   - Ra **4 tệp** → gộp chạy, xong.
   - Ra **1 tệp** kèm câu *"không tách được thành từng nhịp"* → gộp chạy nhưng mô hình
     không nghỉ đủ. Không phải hỏng; báo lại để nới cách soạn.
   - Chữ đỏ *"hết hạn mức hôm nay"* → con số 10 chưa reset, cần đo lại.
2. Nếu ra tệp: nghe thử một đoạn xem có bị đứt giữa từ không. `catThanhDoan` được viết để
   không bao giờ giao clip đứt, nhưng điều đó chưa được nghe bằng tai lần nào.

---

## 📌 MAI LÀM TIẾP — 29/08/2026

### 🔴 Ba việc chỉ user làm được

1. **Mở Nhật ký Google Ads Script, so số với chi tiêu Google báo cùng ngày.** Đây là lần
   ĐẦU TIÊN kiểm được đơn vị tiền — hôm qua chi tiêu là 0 nên `0 >= 150000` sai ở cả hai
   cách hiểu, phép đo không phân biệt được (luật 8c).
   Ra `~61000d` → đơn vị đúng, xong. Ra `~2.35` → `getCost()` trả USD, phải đổi
   `TRAN_MOI_NGAY_VND` thành `6`.
2. **Nhập chi phí hôm qua vào `/admin/ads`** — chọn đơn vị `đ`, tỉ giá 26.200 đã lưu sẵn.
3. **Xác nhận hay sửa giả định `% khách bấm sang merchant sẽ mua`.** Tôi đặt tạm **2** để
   kiểm chuỗi tính; đó là con số TÔI khuyến nghị, không phải user chọn. Nó nhân thẳng vào
   ngưỡng: 1% → $0,57 · **2% → $1,14** · 3% → $1,72.

### 📅 Mốc 30/08 — đã hẹn từ 20/08

`/blog` được Google bò chưa, `28/65` có nhích không. Script đo ở `.scratch/measure-*.mjs`.

### 🎯 Việc đáng làm nhất, vẫn chưa làm

**Đăng 3–5 bài Instagram** từ 6 deal đã lọc và kiểm link sáng 28/08 (mã `1212 · 1193 ·
1205 · 1445 · 1148 · 1173`, cả 6 trả 200, mã `OFFERDY` đã thử áp được).

Giờ nó tốt hơn hẳn hôm qua: hạ tầng đo đã thông đầu-cuối, nên đây là **đối chứng miễn phí**
cho quảng cáo trả tiền — cùng một cách đo, một bên mất tiền, một bên không.

---

## ⚠️ MỐC ĐO CŨ ĐÃ BỊ BÃI BỎ — đừng so với số cũ

Trước 28/08, tài liệu `click` **không đếm một cú bấm nào từ thân bài viết**: 229 nút trong
41 bài blog + 46 nút trên 23 trang review (2 mỗi trang) đều là thẻ `<a>` thô không có
tracking. Tổng **~275 nút chưa từng được đếm**.

Nên con số **"22 click / 30 ngày"** chỉ đo trang store, `/deals`, `/coupon-codes` — nó
**không so sánh được** với số của những ngày tới. Coi 28/08 là mốc 0 mới.

