# PROMPT — Điền sheet Reviews của template import

Cùng cách dùng với [PROMPT_DEALS_IMPORT.md](PROMPT_DEALS_IMPORT.md): bạn chỉ dán link sản phẩm, AI đọc trang rồi trả về bảng dán vào Excel.

**Khác biệt quan trọng so với sheet Deals:** review là **bài viết dài, có gắn số sao, và Google index**. Nội dung bịa ở đây gây hại lớn hơn nhiều so với một dòng deal. Vì vậy prompt này siết chặt hơn, và cột `content` phải copy riêng từng bài.

---

## Trước khi dùng — 4 điều phải biết

1. **Sheet Reviews có 17 cột, thứ tự A→Q** (khác thứ tự sheet Deals, đừng lẫn):
   `title · excerpt · stars · tag · author · emoji · publishedAt · imgBg · content · externalImageUrl · productUrl · affiliateUrl · pros · cons · faq · metaTitle · metaDescription`
2. **`content` là HTML và rất dài** — không dán TSV được. Prompt trả về riêng từng bài để bạn copy vào ô `I`.
3. **`stars` là con số bạn chịu trách nhiệm.** AI đề xuất kèm lý do; bạn đọc rồi quyết. Đừng để nó tự cho 5 sao mọi thứ.
4. **Không cần điền mã tiếp thị và mã giảm giá.** Hệ thống tự gắn `?ref=` theo tên miền lúc hiển thị, và tự hiện mã coupon của shop đó — đã kiểm chứng: bài review Katyayani để trống ô mã vẫn hiện đúng mã `duy` của shop.

---

## PROMPT — copy toàn bộ khối dưới đây

```
Bạn giúp tôi viết bài review sản phẩm cho website affiliate Offerdy, để nhập bằng Excel.

TÔI SẼ ĐƯA: danh sách link sản phẩm (mỗi dòng một link).
BẠN PHẢI: MỞ TỪNG LINK và chỉ dùng thông tin ĐỌC ĐƯỢC TRÊN TRANG ĐÓ.

═══ QUY TẮC TUYỆT ĐỐI ═══

Đây là bài review công khai, Google index, có gắn số sao. Một câu bịa là một khẳng
định mà chủ website phải chịu trách nhiệm.

1. KHÔNG BAO GIỜ tự nghĩ ra thông số. Công suất, dung lượng pin, kích thước, dung
   tích, thành phần, chất liệu, thời gian bảo hành, tốc độ — chỉ lấy từ trang.
2. Với con số do shop công bố, phải ghi rõ là shop nói: dùng "claimed", "the listing
   states", "according to the seller". KHÔNG viết như thể bạn đã đo.
3. KHÔNG viết như thể bạn đã dùng sản phẩm. Không "I tested", không "in my
   experience", không "I've been using this for". Đây là bài tổng hợp thông tin
   công bố, không phải bài trải nghiệm.
4. KHÔNG so sánh với thương hiệu cụ thể nào ("better than Dyson", "same as Apple").
   Bạn không có dữ liệu để so.
5. KHÔNG giải thích vì sao giá rẻ (xả kho, thanh lý, hàng tồn).
6. KHÔNG tạo cảm giác gấp gáp giả nếu trang không ghi.
7. Nếu trang mô tả sơ sài: viết bài NGẮN. Bài 400 từ đúng tốt hơn bài 1200 từ có
   3 câu bịa. Và nêu sản phẩm đó ở KHỐI 4 để tôi biết.
8. Nếu không mở được link: bỏ hẳn sản phẩm đó, nêu ở KHỐI 4. Đừng viết review cho
   một sản phẩm bạn chưa đọc được trang.
9. Toàn bộ nội dung viết bằng TIẾNG ANH (website là tiếng Anh).

═══ 17 CỘT ═══

- title      : Tiêu đề bài review, tiếng Anh, ≤ 70 ký tự. Dạng
               "<Tên sản phẩm> Review: <góc nhìn ngắn>".
               ⚠️ CẮT đuôi tên shop mà trang tự thêm (" | ShopName", " - Official Store").
               ⚠️ Trùng tiêu đề bài đã có thì importer BÁO LỖI và BỎ QUA dòng đó
               (khác sheet Deals: Deals thì cập nhật, Reviews thì không).
- excerpt    : 1–2 câu tóm tắt, ≤ 200 ký tự. Nêu cả điểm mạnh và một giới hạn thật.
- stars      : số nguyên 1–5. KÈM lý do ở KHỐI 4 để tôi kiểm.
               Đừng cho 5 sao nếu trang không nói đủ để khẳng định điều đó.
               Thiếu thông tin (không giá, không thông số) là lý do HỢP LỆ để hạ sao.
- tag        : chọn ĐÚNG một trong HAI giá trị: Review | Comparison
               (schema chỉ nhận đúng hai giá trị này, viết khác là sai dữ liệu)
- author     : để trống (hệ thống dùng tác giả mặc định).
- emoji      : một emoji đại diện sản phẩm. VD: 🎧 ⌚ 🛴 💧
- publishedAt: định dạng YYYY-MM-DD, dùng ngày hôm nay.
- imgBg      : một CSS gradient nhạt làm nền thẻ, dạng
               linear-gradient(135deg,#EEF2FF,#C7D2FE)
               Chọn tông phù hợp loại sản phẩm (tech xanh, beauty hồng, sports cam...).
- content    : BÀI VIẾT HTML. Xem yêu cầu riêng ở KHỐI 2.
- externalImageUrl : URL trực tiếp tới FILE ẢNH sản phẩm chính (.jpg/.png/.webp).
               Không dùng link trang, không dùng logo shop.
- productUrl : dán Y NGUYÊN link tôi đưa.
- affiliateUrl : ĐỂ TRỐNG. Hệ thống tự gắn mã tiếp thị theo tên miền.
- pros       : 3–5 ý, mỗi ý một dòng. Chỉ điều trang xác nhận.
- cons       : 2–4 ý, mỗi ý một dòng. PHẢI có thật và cụ thể. Nếu không rõ nhược
               điểm, dùng những gì trang KHÔNG nói: "No warranty period stated",
               "Ingredient list not published", "Battery life not specified".
               TUYỆT ĐỐI không bịa nhược điểm, và không viết nhược điểm vô nghĩa
               kiểu "might not suit everyone".
- metaTitle  : ≤ 60 ký tự.
- metaDescription : ≤ 160 ký tự.

═══ ĐỊNH DẠNG TRẢ VỀ — BỐN KHỐI ═══

KHỐI 1 — bảng TSV (phân tách TAB). ĐÚNG 17 cột, ĐÚNG thứ tự này (khớp cột A→Q):

title	excerpt	stars	tag	author	emoji	publishedAt	imgBg	content	externalImageUrl	productUrl	affiliateUrl	pros	cons	faq	metaTitle	metaDescription

⚠️ Trong bảng này, ĐỂ TRỐNG bốn cột: content, pros, cons, faq — chúng nhiều dòng nên
tôi sẽ điền tay từ KHỐI 2 và KHỐI 3. Cột affiliateUrl cũng để trống.
Ô trống là hai TAB liền nhau. KHÔNG viết "N/A". Không có ký tự xuống dòng trong ô.

KHỐI 2 — HTML bài viết, riêng từng sản phẩm:

### CONTENT — [title]
(HTML ở đây)

Yêu cầu HTML:
- Chỉ dùng: <h2> <h3> <p> <ul> <li> <strong>. KHÔNG <html>, <body>, <style>,
  <script>, KHÔNG thuộc tính class/style.
- 400–900 từ tuỳ lượng thông tin trang có.
- Cấu trúc: mở đầu ngắn → <h2>What it is</h2> → <h2>Key specs</h2> (chỉ thông số
  trang công bố, ghi "claimed") → <h2>Who it suits</h2> → <h2>Who should skip it</h2>
  → <h2>Bottom line</h2>.
- Mục "Who should skip it" phải thật và cụ thể, đây là phần tạo lòng tin.
- KHÔNG chèn ảnh, KHÔNG chèn link ra ngoài — hệ thống tự thêm nút mua và ảnh.

KHỐI 3 — pros / cons / faq riêng từng sản phẩm:

### [title]
PROS:
(mỗi ý một dòng)

CONS:
(mỗi ý một dòng)

FAQ:
Câu hỏi 1?
Trả lời 1
(dòng trống)
Câu hỏi 2?
Trả lời 2

FAQ cần 3–4 cặp, là câu người sắp mua thật sự hỏi. Nếu trang không nói (bảo hành,
thời gian giao), trả lời trung thực: "The listing does not specify".

KHỐI 4 — GHI CHÚ (tiếng Việt, cho tôi đọc, KHÔNG dán vào Excel):
- Với TỪNG sản phẩm: vì sao bạn cho số sao đó.
- Sản phẩm nào trang mô tả sơ sài, sản phẩm nào không mở được link.
- Mọi thứ bạn không chắc.

═══ DANH SÁCH LINK CỦA TÔI ═══

[DÁN LINK VÀO ĐÂY, MỖI DÒNG MỘT LINK]
```

---

## Sau khi có kết quả

1. **Đọc KHỐI 4 trước tiên.** Đây là chỗ AI khai số sao vì sao và bài nào thiếu dữ liệu. Bài nào bị nêu tên thì đọc kỹ trước khi import.
2. **KHỐI 1**: copy (không lấy dòng tiêu đề) → dán vào Excel từ ô `A2`.
3. **KHỐI 2**: dán HTML từng bài vào cột `I` (`content`).
4. **KHỐI 3**: `pros` → cột `M`, `cons` → cột `N`, `faq` → cột `O`. Xuống dòng trong ô bằng **Alt+Enter**; FAQ cần **một dòng trống** giữa mỗi cặp hỏi–đáp.
5. `/admin/import` → sheet **Reviews** → xem preview → mới Import.

## Việc bạn không cần làm

- **`affiliateUrl`**: để trống. Trang review tự gắn `?ref=` của shop theo tên miền lúc hiển thị.
- **Mã giảm giá**: sheet Reviews không có cột này, nhưng **không cần** — trang tự suy mã của shop từ tên miền. Đã kiểm chứng trên bài Katyayani (ô mã trống, trang vẫn hiện đúng mã `duy`).
- **Ảnh trong bài**: đừng chèn vào HTML. Hệ thống dùng `externalImageUrl` làm ảnh đại diện.

## Cảnh báo

- **Sheet Reviews chỉ TẠO MỚI, không cập nhật.** Trùng tiêu đề (chính xác hơn: trùng slug sinh từ tiêu đề) thì importer **báo lỗi và bỏ qua dòng đó**. Muốn sửa một bài đã có thì sửa trong `/admin/reviews`, đừng import lại.
- **Ba cột importer thật sự bắt buộc**: `title`, `excerpt`, `stars` (1–5). Thiếu là dòng đó bị từ chối.
  `publishedAt` **không** bắt buộc ở importer — nhưng schema thì đòi, nên cứ điền để bài hiển thị đúng ngày.
- Nếu tên miền của `productUrl` không khớp store nào trong hệ thống thì **không gắn được mã tiếp thị** — click không ra hoa hồng. Thêm store cho shop đó trước.
