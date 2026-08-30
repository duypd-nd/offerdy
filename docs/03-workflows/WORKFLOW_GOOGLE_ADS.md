# WORKFLOW — Chạy Google Ads cho Offerdy

> Đọc kèm: [`/admin/ads`](../../src/app/admin/ads/page.tsx) ·
> [`src/lib/adPerformance.ts`](../../src/lib/adPerformance.ts) ·
> [`src/lib/adPlanner.ts`](../../src/lib/adPlanner.ts)

## Nguyên tắc phải nhớ trước khi tiêu đồng nào

**1. Trần ngân sách nằm BÊN GOOGLE, không nằm ở Offerdy.** Trang `/admin/ads` chỉ *nhìn* và
*đề xuất*. Nếu trần đặt ở phía Offerdy thì cron chết là trần biến mất — và bạn chỉ biết khi
đọc hoá đơn. Script ở mục 2 chạy trên máy chủ của Google, độc lập hoàn toàn với site.

**2. Không có con số lợi nhuận nào ở đây.** Đơn hàng thật nằm bên GoAffPro, site không nhìn
thấy. Thứ đo được là **chi phí cho mỗi lượt bấm sang merchant**. Mọi phán quyết dựa trên hai
ô *giả định* ở `/admin/ads` — sai giả định thì sai hết, nên đừng đặt lạc quan.

**3. Trang store là bridge page theo cách Google định nghĩa.** Blog và review có nội dung
gốc nên chống đỡ được chính sách; trang store dễ bị từ chối hơn nhiều. Bắt đầu bằng blog.

---

## Bước 1 — Tạo tài khoản, KHÔNG tạo chiến dịch

⚠️ **Google ép bạn vào luồng Smart Mode ngay khi đăng ký** — màn *"Tạo chiến dịch đầu tiên
của bạn"* → *"Cho chúng tôi biết về doanh nghiệp của bạn"*. Đi hết luồng đó sẽ ra một
**chiến dịch Smart đã bật**: không đặt được trần riêng, **không chạy được Scripts**, tức mất
luôn hàng rào ở Bước 2.

### Đường thoát

Link thoát nằm ở màn **chọn mục tiêu quảng cáo**, không nằm ở màn hỏi URL:

1. Cuối trang → **"Chuyển sang Chế độ chuyên gia"** (nếu không thấy, bấm *quay lại* một bước)
2. Nó hỏi loại chiến dịch → cuối trang → **"Tạo một tài khoản mà không cần chiến dịch"**
3. Màn xác nhận múi giờ + tiền tệ → *Gửi*

### ⚠️ Hai ô VĨNH VIỄN không sửa lại được

| Ô | Chọn | Vì sao |
|---|---|---|
| Múi giờ | `(GMT+07:00) Hà Nội` | Script Bước 2 đọc `getStatsFor('TODAY')` theo **múi giờ tài khoản**. Lệch thì trần reset vào lúc không ngờ. |
| Tiền tệ | **USD** nếu được chọn | `/admin/ads` tính bằng USD; hoa hồng affiliate cũng USD/EUR. |

Muốn đổi hai ô này sau đó thì phải **bỏ tài khoản làm lại**.

📌 **Tài khoản thật của Offerdy (`610-787-1439`) đã tạo với tiền tệ VNĐ** — Google không cho
chọn ở luồng đăng ký hôm 28/08. Không sao, đã xử lý: `/admin/ads` có ô **tỉ giá**, nhập chi
phí thẳng bằng đồng và máy chủ tự quy đổi, đồng thời **lưu lại cả số gốc lẫn tỉ giá đã
dùng** cho từng ngày. Nhưng nó kéo theo hai cái bẫy ở Bước 2 và Bước 4 — đọc kỹ.

### 📌 Về đoạn chấp thuận hình ảnh trong luồng Smart

Luồng đó bắt xác nhận *"bạn có đủ quyền pháp định đối với hình ảnh và có quyền chia sẻ các
hình ảnh đó với Google"*. Offerdy hiển thị **ảnh sản phẩm của merchant**, không phải ảnh tự
chụp — đây là một lý do nữa để đi đường *tạo tài khoản không kèm chiến dịch*, vì bạn không
phải đưa URL cho Google quét ảnh ở bước này.

### Sau khi vào Expert Mode — đúng thứ tự này

1. **Cài script chặn ngân sách (Bước 2) TRƯỚC.** Có trần rồi mới bật quảng cáo.
2. Thêm phương thức thanh toán. ⚠️ Google mặc định **thanh toán sau khi tiêu**, không có
   trần cứng nào — đó là lý do việc 1 phải làm trước.
3. Tạo chiến dịch **Search**, mục tiêu *Website traffic*, **tắt Display Network** (Google
   bật mặc định; Display cho lượt bấm rẻ nhưng gần như không ra đơn).
4. Ngân sách ngày **$3–5**, không hơn. Giai đoạn này bạn đang mua *số liệu*, chưa mua
   *doanh thu*.

---

## Bước 2 — Trần ngân sách bằng Google Ads Script (BẮT BUỘC)

Vào **Tools → Bulk actions → Scripts → dấu +**, dán toàn bộ file
[`google-ads-tran-ngan-sach.js`](google-ads-tran-ngan-sach.js), sửa `TRAN_MOI_NGAY_VND`, rồi
**Authorize → Preview → Run**.

Đặt lịch **Hourly** (hàng giờ).

Script làm hai việc, và việc thứ hai quan trọng ngang việc thứ nhất:

- Tiêu quá trần trong ngày → **tắt hết chiến dịch** và dán nhãn `OFFERDY_TAT_TU_DONG`
- Sang ngày mới (chi tiêu về 0) → **bật lại đúng những cái nó đã tắt**, rồi gỡ nhãn

Không có việc thứ hai thì script tắt một lần và chiến dịch nằm im vĩnh viễn — lỗi phổ biến
nhất của loại script này.

> ⚠️ Nhãn là cách script nhớ *"cái này do tôi tắt"*. Chiến dịch bạn tự tay tắt sẽ **không**
> mang nhãn, nên script không bao giờ bật nó lên. Đừng tự dán nhãn đó cho chiến dịch nào.

⚠️ `getStatsFor('TODAY')` chạy theo **múi giờ của tài khoản Google Ads**, không phải giờ
Việt Nam. Tài khoản đã đặt GMT+7 nên khớp — nhưng nếu ai đổi thì trần reset lệch vài tiếng.

🚨 **VÀ NÓ TRẢ TIỀN THEO ĐƠN VỊ CỦA TÀI KHOẢN, KHÔNG PHẢI USD.** Tài khoản tính bằng đồng
nên trần phải ghi bằng đồng. Ghi `5` (định là "5 đô") thì script hiểu **5 đồng** và **tắt
sạch chiến dịch ngay lần chạy đầu** — không báo lỗi, chỉ lặng lẽ tắt. Đó là lý do biến tên
là `TRAN_MOI_NGAY_VND`.

📌 Trần **không phải** bản sao của ngân sách ngày. Google được tiêu tới **2× ngân sách** trong
một ngày lẻ (bù lại ngày khác), nên đặt trần bằng đúng ngân sách sẽ làm script tắt oan gần
như mỗi ngày. Đặt ~2,5×: ngân sách 61.561đ → trần **150.000đ**.

🚨 **Cùng cái bẫy đó ở ô giá thầu trần trong Google Ads**: điền `0.15` trên tài khoản VNĐ là
**0,15 đồng** → 0 lượt hiển thị, và nó **nhìn y hệt** "thị trường quá đắt". Phải điền
`4000` (≈$0,15 × 26.200).

---

## Bước 3 — Khai điều khoản PPC (chỉ khi chạy cho trang store)

Đo 28/08/2026: **0/107 store đã khai**. `/admin/ads` **chặn cứng ở phía server**, không cho
bật chiến dịch store nào khi ô này còn *Chưa xác minh*.

Với mỗi shop định chạy, mở cổng affiliate của shop đó, tìm mục *Terms* / *Program rules*,
đọc phần **PPC / Paid search / Trademark bidding**, rồi khai ở
[`/admin/ad-planner`](../../src/app/admin/ad-planner/page.tsx):

| Điều khoản nói gì | Chọn |
|---|---|
| Cho chạy quảng cáo trả tiền thoải mái | ✅ Cho phép |
| Cho, nhưng cấm đấu tên thương hiệu | ⚠️ Cho, TRỪ từ khoá thương hiệu |
| Cấm PPC | 🚫 Không cho |
| Không tìm thấy điều khoản | ❓ Chưa xác minh — **và đừng chạy** |

Không tìm thấy thì **hỏi shop**, đừng đoán. Vi phạm điều khoản PPC thường dẫn tới chấm dứt
chương trình **và mất phần hoa hồng đã tích** — không phải bị nhắc nhở.

---

## Bước 4 — Ba ô ở đầu `/admin/ads`

Không điền thì mọi chiến dịch nằm ở *Chưa đủ số liệu* vĩnh viễn — cố ý, vì không có ngưỡng
hoà vốn thì không có gì để so.

**`% khách bấm sang merchant sẽ mua`** — traffic coupon thường **1–3%**. Đặt **2** nếu chưa
có căn cứ. Đặt cao là tự cho phép mình tiêu nhiều hơn mức an toàn.

**`Hoa hồng mỗi đơn (USD) khi store chưa khai`** — lấy từ GoAffPro: giá trị đơn trung bình ×
% hoa hồng. Ví dụ đơn $120 × 10% → **12**. Store nào đã khai đủ *% hoa hồng* và *Giá trị đơn
TB* ở `/admin/ad-planner` thì số của store **luôn thắng** số này (bảng đánh dấu `*` khi đang
dùng số mặc định).

Hai số này ra **ngưỡng hoà vốn**: `12 × 2% = $0,24` cho mỗi lượt bấm sang merchant. Trả hơn
mức đó cho một lượt bấm là lỗ.

**`Tỉ giá: 1 USD = ? VNĐ`** — ô thứ ba, và nó **không phải giả định**: nó chỉ để nhập chi phí
thẳng bằng đồng như Google báo. Đo 28/08: **~26.200**. Tỉ giá được **lưu lại theo từng bản
ghi**, nên sửa ô này sau không làm số cũ chạy lung tung.

---

## Bước 5 — Nối chiến dịch với số liệu (bước dễ quên nhất)

Đây là **sợi dây duy nhất** nối tiền ra với kết quả vào. Sai một mắt xích là chiến dịch đó
vĩnh viễn không quy được kết quả, **và nó hỏng im lặng** — không có thông báo nào.

1. Tạo chiến dịch trong **Sanity Studio → Chiến dịch quảng cáo**, đặt `Nhãn theo dõi (?s=)`,
   ví dụ `ads-blog-ebike` (chữ thường, số, gạch ngang, tối đa 24 ký tự).
2. Trong Google Ads, đặt **Final URL** của quảng cáo kèm đúng nhãn đó:

   ```
   https://www.offerdy.com/blog/ten-bai-viet?s=ads-blog-ebike
   ```

3. Kiểm ngay, đừng tin: mở link đó trong **cửa sổ ẩn danh**, bấm một nút *Get Deal*, rồi mở
   `/admin/ads` xem cột **Sang merchant** có nhích không.

Chuỗi đo đi qua: `?s=` → [`proxyAttribution.ts`](../../src/lib/proxyAttribution.ts) đặt
cookie → [`trackClick.ts`](../../src/actions/trackClick.ts) ghi vào tài liệu `click` →
`/admin/ads` đếm.

📌 Google tự gắn `gclid` vào URL. Site dùng nó để tách **Google trả tiền** khỏi **Google tự
nhiên** — hai thứ có cùng referer, không có `gclid` thì không phân biệt được. Cột *Sang
merchant* hiện thêm dòng `n từ QC` khi một nhãn nhận cả lượt miễn phí lẫn lượt trả tiền.

---

## Bước 5b — Cho Google thấy lượt bấm sang merchant (tuỳ chọn, không cần code)

Mặc định Google mua lượt bấm **mù**: nó biết ai bấm vào quảng cáo, không biết ai bấm tiếp
sang merchant. Nối được hai đầu thì Google có tín hiệu thật.

**Không phải sửa code.** Đã kiểm 28/08 bằng Chrome thật: site **đã** đẩy sự kiện vào
`dataLayer` mỗi lần có người bấm sang merchant, và GTM (`GTM-K3N8W8B8`) đã nằm sẵn trên mọi
trang. Sự kiện bắt được:

```json
{ "event": "affiliate_click",
  "affiliate_url": "https://www.bodegacooler.com/?click_id=aqxanbsj",
  "store_name": "Bodegacooler" }
```

Việc còn lại làm hết trong giao diện GTM:

1. **Google Ads** → *Mục tiêu* → *Chuyển đổi* → tạo hành động chuyển đổi mới, loại
   **Trang web**, dùng ID `AW-18414886120`. Ghi lại **Nhãn chuyển đổi** nó cấp.
2. **GTM** → *Trigger mới* → loại **Sự kiện tuỳ chỉnh** → tên sự kiện chính xác:
   `affiliate_click`
3. **GTM** → *Thẻ mới* → **Google Ads Conversion Tracking** → điền ID + Nhãn ở bước 1 →
   gắn trigger ở bước 2 → **Gửi/Publish**.

📌 **Để trống ô "Giá trị chuyển đổi".** Site không biết đơn hàng thật đáng bao nhiêu — điền
giá sản phẩm vào đó là khai khống (đó là doanh thu của merchant, không phải của mình), còn
điền hoa hồng ước tính là dựng một con số không đo được. Đếm số lượt là đủ và trung thực.

⚠️ **Đừng kỳ vọng đấu thầu thông minh chạy được ngay.** Thuật toán Google cần khoảng
**15–30 chuyển đổi/tháng** mới học được gì; site đang có **21 lượt bấm sang merchant/30
ngày**, và đó là tổng của mọi nguồn chứ không riêng quảng cáo. Giá trị trong 1–2 tháng đầu
là **báo cáo** — thấy từ khoá nào ra lượt bấm sang merchant ngay trong Google Ads, thay vì
đối chiếu tay với `/admin/ads`.

---

## Bước 6 — Đọc bảng và quyết định

| Đề xuất | Nghĩa là gì |
|---|---|
| ❓ **Chưa đủ số liệu** | Mặc định, và là câu trả lời **đúng**. Chưa tới 25 lượt bấm sang merchant thì 3 lượt không phân biệt được may mắn với thật. |
| 🛑 **Nên dừng** | Hoặc đã lỗ rõ, hoặc đã tiêu gấp 3 ngưỡng mà **0 lượt bấm** (Poisson λ=3 → xác suất thấy 0 lượt chỉ ~5%). |
| ➡️ **Giữ nguyên** | Dưới ngưỡng hoà vốn nhưng biên mỏng. Đừng tăng. |
| 📈 **Nên tăng** | Đủ 25 lượt **và** rẻ hơn nửa ngưỡng. |

Bất đối xứng có chủ đích: **cho phép dừng sớm** (sai thì mất cơ hội), **không cho phép tăng
sớm** (sai thì mất tiền).

Nhập chi phí bằng nút **+ Chi phí** trên từng hàng, chép từ Google Ads. Nhập lại cùng một
ngày sẽ **ghi đè**, không cộng dồn.

---

## 🚨 Bước 6b — "Đủ điều kiện" mà 0 hiển thị: đọc mục này TRƯỚC khi sửa gì

Đã trả giá 4 ngày, 28→31/08/2026. Chiến dịch đầu tiên cho **0 hiển thị · 0 nhấp · 0đ** trong
khi **cả bốn tầng đều báo "Đủ điều kiện"**: chiến dịch · nhóm quảng cáo · 8/8 từ khoá ·
quảng cáo. Google **không** cảnh báo ở bất kỳ tầng nào.

📌 **"Đủ điều kiện" chỉ nói *được phép chạy*, không nói *mua nổi chỗ*.** Đây là họ lỗi đắt
nhất của dự án: thứ báo sẵn sàng mà im lặng không chạy.

### Loại nghi phạm theo thứ tự này — mỗi bước là một phép đo phân biệt được

| # | Nghi phạm | Xem ở đâu | Loại được khi |
|---|---|---|---|
| 1 | Từ khoá không có lượng tìm kiếm | Từ khoá → cột **Trạng thái** ở cấp *từ khoá* | không cái nào ghi *Lượng tìm kiếm thấp* |
| 2 | Quảng cáo bị từ chối / chờ duyệt | **Quảng cáo** → cột Trạng thái | ghi *Đủ điều kiện* |
| 3 | Thanh toán chưa xác lập | **Thanh toán → Tóm tắt** | có số dư khả dụng |
| 4 | Chiến lược đấu thầu cần dữ liệu chuyển đổi | **Cài đặt → Đặt giá thầu** | là *Tối đa hoá số lượt nhấp* hoặc CPC thủ công |
| 5 | **Trần CPC dưới sàn đấu giá** | Keyword Planner, xem dưới | ← thủ phạm lần này |

### Cách lấy sàn đấu giá thật (miễn phí, 5 phút)

**Công cụ 🔧 → Công cụ lập kế hoạch từ khoá → Xem lượng tìm kiếm và số liệu dự báo** → dán
đúng danh sách từ khoá đang chạy → bật cột **Giá thầu đầu trang (phạm vi mức giá thấp)**.

⚠️ **Hai bẫy, cả hai đều làm kết luận lật ngược:**

1. **Mặc định vị trí là Việt Nam.** Phải đổi sang **Hoa Kỳ**. CPC Việt Nam rẻ hơn nhiều
   lần — quên đổi thì thấy số đẹp và kết luận ngược hẳn.
2. **Đơn vị là ĐỒNG, không phải đô** (tài khoản VNĐ). `26.000` là ~$1, không phải $26.000
   cũng không phải $26.

**Số đo 31/08/2026, Hoa Kỳ, 8 từ khoá tủ lạnh ô tô** — giữ lại làm mốc:

| | Giá trị |
|---|---|
| Sàn đầu trang thấp nhất | **6.083đ** |
| Sàn đầu trang cao nhất | **8.008đ** |
| Vùng giá cao | 23.733 – 39.988đ |
| Trần đang đặt lúc đó | **4.000đ** ⇒ thiếu 34% so với từ khoá rẻ nhất |
| Lượng tìm kiếm | 1.000–10.000/tháng (6/8 từ khoá), cạnh tranh **Cao** cả 8 |

### Chốt: đừng đặt trần CPC khi chưa biết giá thị trường

Trần đặt mò là chiến dịch câm mà không ai báo. Hai đường đi, đường 1 tốt hơn cho lần đầu:

1. **Bỏ trần hẳn**, để *Tối đa hoá số lượt nhấp* tự tìm mức mua được — nó vốn ưu tiên nhấp
   **rẻ**. Sau 24–48h đọc cột **CPC Tr.bình** để biết **giá thật của mình**, thay vì ước
   lượng của Keyword Planner. Đây là phép đo tốt hơn; trần che mất giá thật nếu nó cao hơn.
2. Đặt trần ở **khe giữa sàn đấu giá và ngưỡng hoà vốn** (lần này: trên 8.008đ, dưới
   ~14.900đ ⇒ **15.000đ**). Chỉ làm được **sau khi** đã có cả hai con số đó.

⚠️ Bỏ trần **không** mất kiểm soát chi tiêu: hàng rào là ngân sách ngày + script Bước 2.
Trần CPC không phải thứ giữ tiền. Nhưng nó cũng **không còn phanh ở cấp nhấp** — nên việc
đọc `CPC Tr.bình` sau 24–48h là **bắt buộc**, đừng để chạy quên.

### ⚠️ Và một bẫy đọc số ở trang Thanh toán

**Chi phí ròng khác 0 không có nghĩa là quảng cáo đã tiêu tiền.** Đo 31/08: trang Thanh toán
báo *Chi phí ròng tháng 8: **14.815đ*** trong khi trang Chiến dịch báo **0đ**. Sổ cái
(**Thanh toán → Hoạt động thanh toán**) chỉ có 2 dòng: nạp 200.000đ, và **Thuế VAT −14.815đ**
(đúng 8%). Không có dòng chi phí quảng cáo nào.

📌 **Luôn mở *Hoạt động thanh toán* xem sổ cái từng dòng** trước khi đọc một con số khác 0
thành "quảng cáo đã chạy". Hệ quả kèm theo: chừng nào chi tiêu quảng cáo còn là 0 thì
**không kiểm được đơn vị tiền của script Bước 2** — `0 >= TRAN` sai ở cả hai cách hiểu.

---

## Bước 7 — Chiến dịch thứ hai trở đi (KHÔNG phải làm lại từ đầu)

Luồng dài ở Bước 1 là **thủ tục tạo tài khoản, chỉ một lần**. Những thứ sau đã xong vĩnh viễn:
chế độ chuyên gia · múi giờ · tiền tệ · thẻ thanh toán · **script chặn ngân sách** (nó quét
toàn tài khoản nên chiến dịch mới tự động được bảo vệ) · thẻ chuyển đổi GTM.

**Cách nhanh nhất — sao chép:** trong danh sách chiến dịch, tick chiến dịch cũ → `Ctrl+C` →
`Ctrl+V`. Rồi sửa đúng bốn thứ: tên · **Final URL + nhãn `?s=` mới** · từ khoá · tiêu đề &
mô tả. ~10 phút thay vì ~40.

⚠️ **Soi lại ba ô sau khi dán** — Google hay bật lại mặc định của nó: **Mạng Hiển thị**,
**Đối tác tìm kiếm**, **vị trí**. Kiểm mỗi lần, đừng tin bản sao.

**Bên Offerdy, mỗi chiến dịch mới cần 2 việc:**
1. Sanity Studio → *Chiến dịch quảng cáo* → bản ghi mới với **nhãn `?s=` MỚI**. Trùng nhãn
   là hai chiến dịch dồn số vào một chỗ, và **không tách lại được** vì tài liệu `click` chỉ
   lưu nhãn chứ không lưu chiến dịch nào tạo ra nó.
2. Kiểm chuỗi đo bằng cửa sổ ẩn danh (như Bước 5, mục 3).

📌 **Đừng chạy hai chiến dịch song song ở ngân sách này.** $2,35/ngày chia đôi là $1,17 mỗi
cái, trong khi ngưỡng phán quyết là **25 lượt bấm sang merchant**. Song song nghĩa là **cả
hai** cùng kẹt ở *Chưa đủ số liệu* gấp đôi thời gian — trả tiền để không biết gì. Chạy một
cái tới khi ra phán quyết thật rồi mới mở cái sau.

---

## Nhịp làm việc đề nghị

| Khi nào | Làm gì |
|---|---|
| Mỗi ngày, 5 phút | Nhập chi phí hôm qua vào `/admin/ads`, liếc cột Đề xuất |
| Mỗi tuần | Mở GoAffPro xem có đơn thật không → chỉnh lại ô *% khách sẽ mua* cho sát |
| Khi có 🛑 | Tắt ngay bên Google Ads (nút ⏸️ ở admin chỉ ghi sổ, không tắt Google) |

---

## ⚠️ Trước khi bắt đầu — điều đáng cân nhắc nhất

Đo 28/08/2026: **0 lượt bấm hôm nay · 21 trong 30 ngày · 56 cả đời · 95/107 store chưa từng
có lượt bấm nào**. Short link mở **2 lượt cả đời**, lần cuối 25/07.

Nghĩa là site chưa có bằng chứng nào cho thấy khách vào sẽ bấm sang merchant. Mua traffic đổ
vào một cái phễu chưa từng chứng minh được là nó chảy sẽ tốn tiền để học một điều mà **đăng
bài miễn phí cũng học được**.

Đường rẻ hơn, và hạ tầng đo đã sẵn sàng từ 28/08: đăng 3–5 bài lên Instagram kèm `?s=<nhãn>`,
xem cột *Sang merchant* có nhích không. Nếu 200 lượt xem miễn phí ra 0 lượt bấm sang
merchant, thì $100 quảng cáo cũng sẽ ra 0 — chỉ khác là mất $100.
