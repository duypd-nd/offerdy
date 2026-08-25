@AGENTS.md

# CLAUDE.md — đọc cái này trước

Offerdy là một trang deal/coupon affiliate. Next.js (App Router) + Sanity + Vercel,
chạy thật ở **https://www.offerdy.com**. Một người làm, một nhánh `main`.

## Bắt đầu một phiên

**Đọc [`TODO.md`](TODO.md). Chỉ vậy thôi.** Nó nói `main` đang ở đâu, production đang chạy
gì, việc gì đang chặn, và những bẫy vừa trả giá.

Mọi thứ khác **đọc khi cần**, không đọc trước:

| Cần gì | Đọc |
|---|---|
| Kiến trúc thật, quyết định đã chốt, bẫy đã gặp | [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — có mục lục ở đầu |
| Điểm dừng cũ, số đo cũ | [`docs/NHAT_KY.md`](docs/NHAT_KY.md) |
| Vì sao không dùng Supabase, v.v. | [`docs/adr/`](docs/adr/) |
| Quy trình khôi phục tài khoản admin | [`docs/03-workflows/`](docs/03-workflows/) |

⚠️ `docs/00-governance/` và `docs/04-project-management/` là tài liệu nguyên tắc chung
(~2.750 dòng). Chúng **không chứa một dòng nào riêng của Offerdy** và **không cần đọc để
làm việc**. Giữ lại để tra cứu, thế thôi.

---

## Tám luật đã trả giá — vi phạm là hỏng thật

**1. ĐO TRƯỚC KHI SỬA.** Kiểm chứng lỗi có thật không *trước khi* sửa code. Cấm suy luận
"code này giống code đã hỏng nên chắc cũng hỏng". Phân biệt rõ **"đã đo"** với
**"đang đoán"**, và nói rõ mình đang ở bên nào.

> Ngày 24/08 tôi báo động "116 thuộc tính CSS vật lý, RTL là lỗ hổng lớn nhất". Đo xong
> thì **sai** — lật `dir="rtl"` cả trang không vỡ chỗ nào. Nếu tin theo con số đó thì đã
> viết lại vài chục dòng CSS cho một vấn đề không tồn tại.

**2. KHÔNG BỊA DỮ LIỆU.** Không tự nghĩ ra deal, coupon, tên shop, thông tin affiliate,
review, hay ghi chú thử mã. Thiếu dữ liệu thì **hỏi**, đừng điền. Trang này bán niềm tin;
một con số bịa làm hỏng đúng thứ đang xây.

**3. `npm test` TRƯỚC KHI COMMIT.** Hiện **582 assertion** (26/08). Kèm `npx tsc --noEmit` và
`npm run build`.
⚠️ `npm run lint` đang có **62 vấn đề có sẵn** — đừng tưởng là mình vừa làm hỏng. Muốn biết
chắc thì `git stash` bản chưa sửa rồi chạy lại mà đối chứng.

**4. TRANG CÔNG KHAI 100% TIẾNG ANH, `/admin/*` TIẾNG VIỆT.** Đừng "sửa" chữ tiếng Việt
trong admin. Đừng để lọt chữ Việt hay ngày `vi-VN` ra trang công khai.

**5. TRẢ LỜI USER BẰNG TIẾNG VIỆT.** Nội dung file trong repo giữ nguyên ngôn ngữ vốn có.

**6. KHÔNG DÙNG BACKTICK trong chú thích nằm giữa template literal.** Nó đóng chuỗi giữa
chừng. Đã mắc **bốn lần**, cả trong heredoc của shell lẫn trong `const CSS = \`...\``.
Soạn markdown hay code có backtick thì dùng Write/Edit, đừng dùng `cat <<'EOF'`.

**7. KHÔNG ĐẶT BỐ CỤC BẰNG INLINE STYLE.** `style={{display:'grid'}}` = tự vô hiệu hoá mọi
media query. Sáu lỗi giao diện điện thoại trong hai ngày đều là nó. Và dùng
**`minmax(0,1fr)`**, không dùng `1fr`.

**8. BA CÁCH TÔI DỰ ĐOÁN SAI ĐỀU ĐẶN — chặn từng cái một.**

**(a) Đừng nói việc này to bao nhiêu trước khi đọc code.** Nói *"để tôi grep xem"*, đừng nói
*"một dòng"*. Ngày 26/08 tôi bảo nối ô *Canonical URL* là "một dòng, có đường lùi về hằng
số" — hoá ra `try/catch` quanh `new URL()` là hàng rào **mù** (`https://.offerdy.com/`,
đúng giá trị đang nằm trong DB, được coi là **hợp lệ**), và có **7 chỗ** ghi cứng địa chỉ
chứ không phải 1.

**(b) Điều kiện lọc thì CHÉP, đừng gõ lại.** Query, regex, tên trường, tên giá trị — copy
nguyên văn từ nguồn. Gõ lại theo trí nhớ cho ra *"451 deal đang chờ"* (thật ra **0**, vì
route lọc `!defined(summary)` còn tôi gõ `description`), và *"0 mã chạy"* (thật ra 71/71,
vì giá trị thật là `"worked"` chứ không phải `"works"`). Cùng một lỗi, hai lần, hai tháng.

**(c) Phép đo phải phân biệt được HỎNG với CHƯA XẢY RA.** Một phép đo mà kết quả *không đổi
gì cả* thì **chưa nói được gì** — đừng đọc nó thành "hỏng". Ngày 26/08 tôi kết luận "hàng
rào không chặn được" trong khi thứ nhìn thấy chỉ là giá trị cũ chưa kịp đổi: chờ 121 giây
mà CDN Sanity mất ~106 giây. Nếu hàng rào hỏng thật thì đã thấy giá trị hỏng hiện ra. Đo
lại bằng đường **không qua CDN** mới tách được hai khả năng.

📌 Và với API ngoài: **gọi thử một lần rồi mới viết bản vá.** Bộ lọc Sentry viết theo trí
nhớ (`!environment:local` đặt trong `query=`) chạy trơn tru, trả 200, và **không lọc gì
cả** — Sentry chỉ nhận `environment` như **tham số riêng**. Hai mươi giây gọi thử tiết
kiệm một vòng sửa.

---

## Trước khi commit

```
npm test          # phải 582, không giảm
npx tsc --noEmit  # sạch
npm run build     # sạch
```

Commit và push **chỉ khi user bảo**. Thông điệp commit viết tiếng Việt không dấu, theo nếp
đang có (`fix(web): ...`, `feat(admin): ...`), và **ghi cả số đo lẫn cái bẫy đã trả giá** —
đó là chỗ kiến thức được lưu lại.

Xong việc thì cập nhật `TODO.md`. Nếu học được thứ dùng lại được thì thêm vào
`PROJECT_CONTEXT.md`. **Không** chép nhật ký vào hai chỗ.

---

## Cách làm việc

**Việc gì cũng bắt đầu bằng đọc code đang có.** Dự án này đã đi được xa; gần như mọi thứ
đều đã có tiền lệ. Tìm nó trước khi viết mới.

**Ưu tiên tự động hoá** khi thấy việc lặp tay — nhưng chỉ khi đã có người thật sự làm việc
đó vài lần. Đừng dựng công cụ cho một việc chưa ai làm bao giờ.

⚠️ **Cảnh báo lớn nhất của dự án này, tính đến 24/08**: công cụ đã đi trước việc dùng rất
xa. 451 deal đã xây, **1 cái đã đăng**. Tổng lượt bấm cả đời trang web là **25**. Xây thêm
công cụ là việc dễ chịu; phân phối là việc khó chịu. Khi được hỏi "làm gì tiếp theo", hãy
cân nhắc điều đó trước khi đề xuất xây thêm.

---

## Khi hai quy trình mâu thuẫn — cái nào thắng

Máy này có **ba** bộ skill cùng chạy, mỗi bộ mang một quy trình riêng:

| Bộ | Số skill | Quy trình nó muốn áp |
|---|---|---|
| Dựng sẵn của Claude Code | — | — |
| **mattpocock** (`~/.claude`, mọi dự án) | **41 trên đĩa**, 28 còn dùng được (13 nằm trong `deprecated/` + `in-progress/`) | spec → ticket → triage → implement |
| **superpowers** (chỉ dự án này, bật 25/08) | **14 trên đĩa** (`6.3.0`) — ⚠️ phiên 26/08 nạp **0** | brainstorming → worktree → plan → subagent → TDD → review → finish |

⚠️ Con số **"22 skill"** ghi ở đây trước 25/08 là **sai** — đếm thật ra 41. Và số hiện ra
trong danh sách skill mỗi phiên còn ít hơn nữa (một phiên 25/08 chỉ thấy 9 skill
mattpocock). **Chưa rõ vì sao lệch — đừng lấy con số nào trong ba số đó làm căn cứ cho
việc gì.**

Chốt rõ:

1. **Nguồn sự thật về tiến độ là `TODO.md`**, kể cả khi việc bắt đầu từ một skill của Matt.
   Một dự án một người mà hai sổ là chắc chắn lệch.
2. **`PROJECT_CONTEXT.md`** giữ kiến trúc thật, quyết định đã chốt, bẫy đã gặp.
   `CONTEXT.md` (nếu sau này tạo) **chỉ chứa từ vựng nghiệp vụ** — "offer" khác "deal" khác
   "coupon" thế nào. Hai file, hai việc, đừng gộp.
3. **Skill là công cụ, không phải nghĩa vụ.** Dùng `/diagnosing-bugs` khi có lỗi khó,
   `/handoff` khi kết phiên, `/tdd` khi viết logic thuần. Không bắt mọi việc đi qua
   spec → ticket → triage; chi phí thủ tục đó lớn hơn lợi ích cho một người làm.

   ⚠️ **Superpowers sẽ nói ngược lại — cứ đọc tiếp mục này.** Hook `SessionStart` của nó
   chèn ~777 token vào **mỗi phiên** (kể cả sau `/clear`, `/compact`), mở đầu bằng
   `EXTREMELY_IMPORTANT` và yêu cầu *bắt buộc* gọi skill **trước cả câu hỏi làm rõ**,
   kèm bảng 12 dòng gọi mọi lý do không gọi skill là nguỵ biện.

   **File này thắng, và đó là luật của chính superpowers**, không phải tôi tự cho phép —
   `skills/using-superpowers/SKILL.md` kết bằng: *"User instructions (CLAUDE.md,
   AGENTS.md, direct requests) take precedence over skills."* Trật tự:
   **`CLAUDE.md` > skill > mặc định.**

   Cụ thể ở dự án này: **không dựng git worktree, không mở nhánh** (một người, một nhánh
   `main` — xem đầu file), và **không gọi subagent trừ khi user bảo**.
4. **`/code-review` có HAI bản** (bản dựng sẵn của Claude Code, và bản của Matt). Nêu rõ
   đang gọi bản nào. Superpowers **không** thêm bản thứ ba — đo 25/08: **không một tên
   skill nào trùng nhau** giữa hai bộ.

   Nguy hiểm nằm ở chỗ khác: **cùng một việc, hai tên khác nhau**, nên dễ gọi nhầm bộ mà
   không nhận ra. Cặp đã biết:

   | Việc | Matt | superpowers |
   |---|---|---|
   | Viết test trước | `tdd` | `test-driven-development` |
   | Truy lỗi khó | `diagnosing-bugs` | `systematic-debugging` |
   | Soát code | `code-review` | `requesting-code-review` + `receiving-code-review` |
   | Vặn cho vỡ ý tưởng | `grilling` | `brainstorming` |
   | Chia việc ra kế hoạch | `to-spec` → `to-tickets` → `triage` | `writing-plans` → `executing-plans` |
5. Issue/spec nếu cần thì để dưới `.scratch/<feature>/` — xem `docs/agents/issue-tracker.md`.
   Chọn markdown cục bộ vì `gh` chưa đăng nhập và repo chưa từng mở issue nào.
6. **Dùng skill nào của superpowers — đã chốt 26/08, đừng cân nhắc lại từ đầu mỗi phiên.**
   Đo trên đĩa: **đúng 14 skill**, bản `6.3.0`, cài cho riêng `E:\Offerdy` ngày 25/08.

   | Skill | Dùng? | Vì sao |
   |---|---|---|
   | `verification-before-completion` | ✅ **hợp nhất với dự án này** | *"Evidence before claims"* — đúng họ lỗi đắt nhất ở `AGENTS.md`: ffmpeg báo Xong mà video cụt, server cũ vẫn trả lời, deep link chết mềm |
   | `systematic-debugging` | ✅ khi lỗi khó | trùng việc với `/diagnosing-bugs` của Matt — chọn **một**, nói rõ đang gọi bản nào |
   | `test-driven-development` | ✅ khi viết logic thuần | trùng việc với `/tdd` |
   | `brainstorming` | ✅ khi cần vặn cho vỡ ý tưởng | trùng việc với `/grilling` |
   | `writing-plans` · `executing-plans` | ⚠️ chỉ cho việc lớn nhiều bước | việc một buổi thì chi phí thủ tục lớn hơn lợi ích |
   | `using-git-worktrees` · `finishing-a-development-branch` | ❌ **không** | một người, một nhánh `main` — xem đầu file |
   | `dispatching-parallel-agents` · `subagent-driven-development` | ❌ **không** | không gọi subagent trừ khi user bảo |
   | `requesting-code-review` · `receiving-code-review` | ❌ **không** | đã có **hai** bản `/code-review`; thêm bản thứ ba chỉ làm rối |
   | `using-superpowers` · `writing-skills` | — | siêu-skill, không phải việc của dự án |

   ⚠️ **Cài xong ≠ nạp được.** Đo phiên 26/08: plugin bật đúng trong
   `.claude/settings.json` (`superpowers@superpowers-marketplace: true`), 14 skill nằm
   sẵn ở `~/.claude/plugins/cache/`, mà phiên đó **không nạp một skill superpowers nào**
   và **không hề có khối `EXTREMELY_IMPORTANT`** mà hook `SessionStart` lẽ ra chèn vào.
   Chưa rõ vì sao. Cách kiểm: gõ `/plugin`, hoặc hỏi thẳng *"có thấy skill
   `verification-before-completion` không?"* — **đừng cho rằng nó đang chạy chỉ vì đã
   cài**. Đây cũng là lời giải cho ghi chú "số skill lệch" ở trên: một phần là do plugin
   không nạp chứ không phải đếm sai.
