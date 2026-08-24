# Offerdy — Việc đang làm

> **File này chỉ chứa việc đang làm.** Nhật ký các điểm dừng đã khép nằm ở
> [`docs/NHAT_KY.md`](docs/NHAT_KY.md) — 2.400 dòng, giữ nguyên văn vì chứa số đo đã
> tốn công đo và bẫy đã trả giá. Đừng chép chúng ngược lại vào đây.

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
| **25/08** | Mở `/admin/reports` xem nhãn `video`. Số đầu tiên cho một kênh ngoài Google — nhưng n=1, đọc như nhiễu. |
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
