# PROMPT — Điền sheet Deals của template import

Mục đích: bạn **chỉ dán link sản phẩm** vào cột `dealUrl` trong `template_deals.xlsx`, rồi dùng prompt dưới đây với một AI **có khả năng mở web** (Claude/ChatGPT trên trình duyệt — dùng gói thuê tháng, không tốn tiền API).

Kết quả: AI trả về bảng dán thẳng vào Excel.

---

## Trước khi dùng — 3 điều phải biết

1. **AI phải mở được từng trang sản phẩm.** Nếu nó không mở được mà vẫn "đoán" giá, bạn sẽ đăng một con số sai lên mọi bài — prompt dưới đây yêu cầu nó **để trống và báo lại** thay vì đoán. Nếu thấy nó điền giá mà không mở trang, dừng lại.
2. **Excel không dán được nhiều dòng trong một ô qua TSV.** Vì vậy prompt trả về **hai khối**: khối 1 dán thẳng, khối 2 (`faq`/`pros`/`cons`) copy từng ô bằng Alt+Enter.
3. **Cột `title` là khoá khớp.** Trùng tiêu đề deal đã có = cập nhật; đổi tiêu đề = tạo deal mới. Đừng sửa `title` sau khi đã import.

---

## PROMPT — copy toàn bộ khối dưới đây

```
Bạn giúp tôi điền dữ liệu cho file Excel import deal của website affiliate Offerdy.

TÔI SẼ ĐƯA: danh sách link sản phẩm (mỗi dòng một link).
BẠN PHẢI: MỞ TỪNG LINK và chỉ dùng thông tin ĐỌC ĐƯỢC TRÊN TRANG ĐÓ.

═══ QUY TẮC TUYỆT ĐỐI (quan trọng hơn mọi thứ khác) ═══

1. KHÔNG BAO GIỜ tự nghĩ ra con số. Giá bán, giá gốc, % giảm, thông số kỹ thuật,
   kích thước, dung tích, ngày hết hạn — chỉ được lấy từ chính trang sản phẩm.
2. Nếu không mở được một link (chặn bot, 404, hết hàng): để TRỐNG cả dòng đó và ghi
   vào cột GHI_CHU lý do. TUYỆT ĐỐI không suy ra từ tên sản phẩm hay từ link.
3. KHÔNG giải thích vì sao giá rẻ (xả kho, thanh lý, hàng tồn, đổi model...). Bạn
   không biết, và đó là khẳng định về hoạt động kinh doanh của shop.
4. KHÔNG so sánh với thương hiệu khác, không nói "giống hàng hiệu", không nói
   "tương đương sản phẩm X".
5. KHÔNG tạo cảm giác gấp gáp giả (sắp hết, chỉ hôm nay) nếu trang không ghi.
6. KHÔNG viết như thể bạn đã dùng sản phẩm. Không "tôi đã dùng", không "yêu thích".
7. Nội dung cho khách đọc phải viết bằng TIẾNG ANH (website là tiếng Anh).

═══ CÁC CỘT CẦN ĐIỀN ═══

BẮT BUỘC (thiếu là import lỗi):
- title      : Tên sản phẩm đúng như trang ghi. Tiếng Anh. Đây là khoá khớp deal.
               ⚠️ CẮT BỎ phần đuôi tên shop mà trang tự thêm vào thẻ title, kiểu
               " | CycleAddons" hay " - Shop Name" hay " – Official Store".
               Chỉ giữ tên sản phẩm.
- store      : Tên shop (lấy từ tên miền hoặc tên thương hiệu trên trang).
- priceSale  : Giá đang bán, kèm ký hiệu tiền tệ ĐÚNG của trang. VD: $48.99
               ⚠️ Nếu trang bán bằng đơn vị khác USD (VND, IDR, EUR...) thì giữ
               nguyên đơn vị đó, đừng quy đổi.
- priceOrig  : Giá gốc / giá trước giảm — thường là số bị GẠCH NGANG cạnh giá bán.
               ⚠️ Đây là cột dễ thiếu nhất: phần lớn shop KHÔNG khai giá gốc trong
               dữ liệu có cấu trúc, bạn phải đọc bằng mắt trên trang.
               ⚠️ Nếu trang KHÔNG có số gạch ngang nào: để trống priceOrig VÀ
               discount, rồi nêu sản phẩm đó ở KHỐI 3. Đừng bịa ra giá gốc, và đừng
               lấy giá của biến thể khác làm giá gốc.
- discount   : Số nguyên 1–99, tính = làm tròn (1 − priceSale / priceOrig) × 100.
               Chỉ điền khi có cả hai giá.

TÙY CHỌN:
- discountByAmount : TRUE nếu muốn hiện "$100 OFF" thay vì "%". Mặc định để trống.
- category   : chọn ĐÚNG một trong các tên sau, không tự tạo tên mới:
               AI Tools | Beauty | Fashion | Food & Health | Home & Garden |
               Kids & Baby | Sports | Tech & Gadgets | Travel
- imageUrl   : URL trực tiếp tới FILE ẢNH sản phẩm chính (kết thúc .jpg/.png/.webp).
               Không dùng link trang, không dùng ảnh logo shop.
- emoji      : một emoji đại diện, chỉ dùng khi không có imageUrl. VD: 🎧 👟 📺
- imgClass   : chỉ khi dùng emoji, chọn một trong: di-tech | di-home | di-fashion | di-beauty
- expiresAt  : định dạng YYYY-MM-DD. CHỈ điền khi trang ghi rõ ngày kết thúc.
               Không có thì để trống.
- isExpiring : TRUE chỉ khi trang nói ưu đãi sắp kết thúc. Không có thì để trống.
- verified   : luôn để TRUE.

NỘI DUNG (tiếng Anh, chỉ dựa trên thông tin trang có):
- summary         : 2–4 câu, vì sao sản phẩm này đáng chú ý ở mức giá đó. Chỉ nêu
                    đặc điểm trang có ghi. Nếu trang mô tả sơ sài thì viết ngắn —
                    ngắn mà đúng tốt hơn dài mà bịa.
- metaTitle       : ≤ 60 ký tự, có tên sản phẩm.
- metaDescription : ≤ 160 ký tự.
- faq             : 3–4 cặp câu hỏi/trả lời mà người sắp mua thật sự hỏi. Câu trả lời
                    chỉ dùng thông tin trang có; nếu trang không nói (bảo hành, ship)
                    thì trả lời trung thực kiểu "the listing does not specify".
- pros            : 3–5 ý, mỗi ý một dòng. Chỉ nêu điều trang xác nhận.
- cons            : 2–4 ý, mỗi ý một dòng. PHẢI có thật. Nếu không rõ nhược điểm,
                    dùng những điều trang KHÔNG nói: "No warranty period stated",
                    "Battery life not specified". Không bịa nhược điểm.
═══ ĐỊNH DẠNG TRẢ VỀ — BA KHỐI RIÊNG ═══

KHỐI 1 — bảng TSV (phân tách bằng TAB). ĐÚNG 17 cột, ĐÚNG thứ tự này, không thêm
không bớt cột nào (thứ tự này khớp cột A→Q của file Excel):

title	store	priceSale	priceOrig	discount	discountByAmount	category	imageUrl	emoji	imgClass	dealUrl	expiresAt	isExpiring	verified	summary	metaTitle	metaDescription

Ô trống thì để trống hẳn (hai TAB liền nhau). KHÔNG viết "N/A", không viết "-".
Trong khối này KHÔNG được có ký tự xuống dòng bên trong một ô.
KHÔNG thêm cột ghi chú vào đây — ghi chú nằm ở KHỐI 3.

KHỐI 2 — faq / pros / cons cho từng sản phẩm (các ô này nhiều dòng nên không dán TSV
được). Trình bày:

### [title của sản phẩm]
FAQ:
Câu hỏi 1?
Trả lời 1
(dòng trống)
Câu hỏi 2?
Trả lời 2

PROS:
(mỗi ý một dòng)

CONS:
(mỗi ý một dòng)

KHỐI 3 — GHI CHÚ (tiếng Việt, cho tôi đọc, KHÔNG dán vào Excel). Liệt kê mọi thứ bạn
không chắc: link không mở được, thiếu giá gốc, giá có thể là giá biến thể, trang không
nói dung tích... Nếu không có gì đáng nói thì ghi "không có".

═══ DANH SÁCH LINK CỦA TÔI ═══

[DÁN LINK VÀO ĐÂY, MỖI DÒNG MỘT LINK]
```

---

## Sau khi có kết quả

1. **Khối 1**: copy toàn bộ (**không lấy dòng tiêu đề**) → dán vào Excel từ ô `A2`. 17 cột này khớp đúng cột **A → Q** của template. Nếu Excel dồn hết vào một cột, dùng **Data → Text to Columns → Tab**.
2. **Khối 2**: `faq` / `pros` / `cons` là cột **R / S / T**, phải điền tay vì một ô chứa nhiều dòng. Copy từng phần vào đúng ô, xuống dòng trong ô bằng **Alt+Enter**. FAQ cần **một dòng trống** giữa mỗi cặp hỏi–đáp.
3. **Khối 3 (ghi chú)**: đọc rồi bỏ, đừng dán vào Excel. Đây là chỗ AI khai những gì nó không chắc — dòng nào bị nêu tên thì bạn kiểm lại trước khi import.
4. Xoá dòng ví dụ `VÍ DỤ — XOÁ DÒNG NÀY` nếu còn.
5. Vào `/admin/import` → chọn sheet **Deals** → xem **preview trước**, chỉ bấm Import khi số liệu đúng.

> Vì sao ghi chú phải tách riêng: cột thứ 18 của template là `faq`. Nếu để cột ghi chú trong bảng TSV, nó sẽ **đè vào ô FAQ** khi bạn dán — và bạn sẽ chỉ phát hiện sau khi bài deal đã đăng.

## Điều dễ hỏng nhất: thiếu `priceOrig`

Mình đã thử đọc hai trang sản phẩm thật của bạn: **không trang nào công bố giá gốc** trong dữ liệu có cấu trúc — Cycleaddons chỉ phát giá bán `549.99 USD`, Tarujskincare **không phát giá nào cả**. Nghĩa là AI phải đọc số gạch ngang bằng mắt, và đó là chỗ nó dễ bỏ trống hoặc dễ đoán nhất.

Mà `priceOrig` + `discount` là **bắt buộc khi tạo deal mới** — thiếu là importer báo lỗi dòng đó chứ không tạo.

Ba cách xử lý, chọn theo tình huống:

1. **Trang thật không có giá gốc** → sản phẩm đó không phải "deal giảm giá". Bỏ khỏi file, hoặc chờ shop chạy khuyến mãi.
2. **Bạn biết giá gốc** (thấy trên trang mà AI đọc sót, hoặc biết giá niêm yết) → tự điền hai ô đó. Đây là con số bạn chịu trách nhiệm, không phải AI đoán.
3. **Deal đã tồn tại, chỉ muốn bổ sung nội dung** → giữ nguyên `title` cũ, để trống giá; importer sẽ **cập nhật** chứ không đòi các ô bắt buộc (ô trống = không đụng tới).

## Việc bạn không cần làm

Ba thứ này hệ thống **tự lo**, đừng điền tay:

- **Mã tiếp thị (`?ref=`)**: gắn tự động khi hiển thị, dựa theo tên miền của `dealUrl`. Cứ dán link trần.
- **Mã giảm giá của shop**: tự hiện trên trang deal, ảnh OG và caption nếu shop đó có mã.
- **Mã sản phẩm `#1000+`**: cấp tự động khi tạo deal.

## Cảnh báo dễ mất tiền

Nếu cột **Tiếp thị** ở `/admin/deals` hiện `⚠ không khớp` sau khi import, nghĩa là tên miền của `dealUrl` không khớp store nào trong hệ thống — **click sẽ không ra hoa hồng**. Phải thêm store cho shop đó trước.
