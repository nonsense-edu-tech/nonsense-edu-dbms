# ĐẶC TẢ HỆ THỐNG ID NỘI BỘ — TRUNG TÂM NONSENSE EDU

> Tài liệu tham chiếu cho toàn bộ quy ước đặt ID và kế hoạch xây dựng hệ thống web quản lý ID.
> Cập nhật lần cuối: 16/07/2026 (bản 3) · Trạng thái: đang chốt thiết kế, chuẩn bị code.

---

## 1. Tổng quan

Trung tâm cần một quy ước ID thống nhất cho 4 loại đối tượng dữ liệu (lớp học, học sinh, tài liệu, câu hỏi), và một công cụ để tạo/tra cứu ID.

- **Đã có:** file Google Sheets `He_thong_tao_ID_NonsenseEdu.xlsx` — vừa là tài liệu quy tắc, vừa là công cụ tạo ID tự động bằng công thức.
- **Đang lên kế hoạch:** website nội bộ tạo & tra cứu ID, có phân quyền theo vai trò.

---

## 2. Quy ước ID

Mỗi ID là một **chuỗi chữ số ghép liền, không dấu cách**, đọc từ trái sang phải. Mọi thành phần đều thêm số 0 ở đầu cho đủ số chữ số (vd lớp thứ 7 → `007`).

### 2.0. Gốc — 4 chữ số (nền tảng chung cho cả 4 nhánh)

| STT | Thành phần | Số chữ số | Vị trí | Ví dụ |
|---|---|:---:|:---:|:---:|
| 1 | Cấp học | 1 | 1 | 3 |
| 2 | Chương trình đào tạo | 3 | 2–4 | 012 |

→ Ví dụ gốc: `3012`. Từ gốc này ánh xạ ra 4 nhánh ID **ngang hàng**: **lớp học, học sinh, tài liệu, câu hỏi**. Lưu ý: câu hỏi là một nhánh độc lập rẽ thẳng từ gốc, **không phải hậu tố của ID tài liệu** — nhờ vậy một câu hỏi tồn tại độc lập và tái sử dụng được ở nhiều đề/tài liệu khác nhau (xem 2.4).

### 2.1. ID Lớp học — 9 chữ số = Gốc + Năm học + Lớp

| STT | Thành phần | Số chữ số | Vị trí | Ví dụ |
|---|---|:---:|:---:|:---:|
| 1–2 | (Gốc: Cấp học + Chương trình) | 4 | 1–4 | 3012 |
| 3 | Năm học (2 số cuối) | 2 | 5–6 | 25 |
| 4 | Lớp | 3 | 7–9 | 007 |

→ Ví dụ: `301225007`

### 2.2. ID Học sinh — 12 chữ số = ID Lớp học + STT học sinh

| STT | Thành phần | Số chữ số | Vị trí | Ví dụ |
|---|---|:---:|:---:|:---:|
| 1–4 | (ID Lớp học) | 9 | 1–9 | 301225007 |
| 5 | Số thứ tự học sinh | 3 | 10–12 | 015 |

→ Ví dụ: `301225007015` (mỗi lớp tối đa 999 học sinh)

> **Quan trọng:** ID học sinh gắn theo **lớp nhập học đầu tiên** và **cố định vĩnh viễn**. Nếu sau này em đó chuyển lớp, ID vẫn giữ nguyên; lớp hiện tại được lưu thành một cột riêng trong CSDL, không ảnh hưởng đến ID.

### 2.3. ID Tài liệu — 14 chữ số = Gốc + 6 thành phần nội dung

| STT | Thành phần | Số chữ số | Vị trí | Ví dụ |
|---|---|:---:|:---:|:---:|
| 1–2 | (Gốc: Cấp học + Chương trình) | 4 | 1–4 | 3012 |
| 3 | Môn học | 1 | 5 | 5 |
| 4 | Học phần | 2 | 6–7 | 03 |
| 5 | Bài học | 2 | 8–9 | 04 |
| 6 | Hình thức tài liệu | 1 | 10 | 1 |
| 7 | Chủ đề | 2 | 11–12 | 02 |
| 8 | ID tài liệu cụ thể | 2 | 13–14 | 01 |

→ Ví dụ: `30125030410201`

> Tài liệu **không gắn lớp** (chỉ gắn gốc = cấp + chương trình), nên một tài liệu dùng chung cho mọi lớp cùng chương trình chỉ có **một ID** duy nhất, tái sử dụng qua các niên khóa.

### 2.4. ID Câu hỏi — 16 chữ số = Gốc + 5 thành phần nội dung

Câu hỏi là **nhánh ID thứ 4**, rẽ thẳng từ gốc (không nối vào ID tài liệu). Điểm khác cốt lõi so với tài liệu: câu hỏi có thành phần **Dạng câu** ở đúng cấp của nó (cấp câu hỏi), thay vì mượn "Hình thức tài liệu" ở cấp vỏ chứa.

| STT | Thành phần | Số chữ số | Vị trí | Ví dụ |
|---|---|:---:|:---:|:---:|
| 1–2 | (Gốc: Cấp học + Chương trình) | 4 | 1–4 | 3012 |
| 3 | Môn học | 1 | 5 | 5 |
| 4 | Học phần | 2 | 6–7 | 03 |
| 5 | Bài học | 2 | 8–9 | 04 |
| 6 | Chủ đề | 2 | 10–11 | 02 |
| 7 | Dạng câu hỏi | 1 | 12 | 1 |
| 8 | STT câu hỏi | 4 | 13–16 | 0007 |

→ Ví dụ: `3012503040210007` (mỗi tổ hợp môn/học phần/bài/chủ đề tối đa 9999 câu mỗi dạng)

> **Tại sao tách "Dạng câu" khỏi "Hình thức tài liệu":** "Hình thức tài liệu" (slide, worksheet, đề, đáp án…) mô tả *cái vỏ chứa*; "Dạng câu" (MCQ, đúng/sai, tự luận…) mô tả *từng câu nguyên tử*. Dùng hình thức tài liệu = MCQ để ngầm suy ra câu bên trong là MCQ sẽ vỡ khi: (a) câu không phải MCQ, (b) một worksheet trộn nhiều dạng, (c) muốn tái sử dụng một câu ở nhiều tài liệu. Đặt "Dạng câu" ngay tại cấp câu hỏi giải quyết cả ba.

> **Không đưa vào ID (để làm cột metadata):** độ khó (biến động theo thống kê tỉ lệ làm đúng — nếu nhét vào ID thì mỗi lần cập nhật phải đổi ID), đáp án đúng, lời giải, tag, và **"câu này nằm trong đề nào"** (đây là quan hệ, thuộc bảng nối `de_cau_hoi`, không phải thuộc tính của câu).

### 2.5. Ngữ liệu (đề dẫn dùng chung) — thực thể riêng, không mã hoá vào ID câu hỏi

Đặc thù V-ACT (bài đọc khoa học CORE, phân tích số liệu, logic sắp xếp): **một đoạn ngữ liệu / bảng số liệu / tình huống logic đi kèm nhiều câu hỏi**. Nếu chép nguyên đoạn dẫn vào từng câu sẽ trùng lặp và khó bảo trì.

→ Ngữ liệu được lưu thành **một thực thể riêng** (`ngu_lieu`), có ID/khoá riêng. Mỗi câu hỏi trỏ về một ngữ liệu qua khoá ngoại (tuỳ chọn — câu đứng một mình thì để trống). Đề thi = ghép ngữ liệu + các câu qua bảng nối. Ngữ liệu **không** cần mã hoá vào chuỗi ID câu hỏi.

---

## 3. Dữ liệu gốc (bảng mã)

Các trường phân loại cần bảng mã (điền theo thực tế trung tâm):

- **Cấp học** (1 số): mã → tên.
- **Chương trình đào tạo** (3 số): vd `012` = V-ACT (ĐGNL ĐHQG-HCM), `020` = SAT.
- **Môn học** (1 số): mã → tên.
- **Hình thức tài liệu** (1 số): `1` = Slide, `2` = MCQ, `3` = Textbook, `4` = Bài tập/Worksheet, `5` = Đáp án/Lời giải (gợi ý, sửa tùy trung tâm). *Trường này ở cấp tài liệu, không dùng cho câu hỏi.*
- **Dạng câu hỏi** (1 số, dùng cho ID câu hỏi): `1` = Trắc nghiệm 1 đáp án, `2` = Trắc nghiệm nhiều đáp án, `3` = Đúng/Sai (từng ý), `4` = Điền khuyết, `5` = Nối/ghép cặp, `6` = Sắp xếp thứ tự/kéo thả, `7` = Trả lời ngắn, `8` = Tự luận (sửa tùy trung tâm; `1`–`6` chủ yếu cho V-ACT, `7`–`8` cho mảng y dược).

Các trường đánh số tuần tự, **không cần bảng mã**: Năm học (2 số cuối năm bắt đầu niên khóa, vd 25 = 2025–2026), Lớp, STT học sinh, Học phần, Bài học, Chủ đề, ID tài liệu cụ thể, STT câu hỏi.

---

## 4. Công cụ Google Sheets (đã bàn giao)

File `He_thong_tao_ID_NonsenseEdu.xlsx` gồm 5 sheet:

1. **Hướng dẫn** — cách dùng.
2. **TẠO ID** — công cụ chính: chọn/nhập ở ô nền vàng, ID hiện tự động (Bước 1: chọn lớp → ID Lớp học; Bước 2A: nhập STT HS → ID Học sinh; Bước 2B: điền nội dung → ID Tài liệu).
3. **Cấu trúc ID** — bảng quy tắc từng thành phần.
4. **Ví dụ minh họa** — cách đọc/tách chuỗi ID.
5. **Bảng mã tham chiếu** — nơi điền dữ liệu gốc; dropdown ở sheet TẠO ID lấy từ đây.

Lưu ý khi dùng trong Google Sheets: đặt định dạng cột ID là **Plain text** để không mất số 0 ở đầu. Hệ thống tự thêm số 0 (nhập 7 → ra "007").

> ⚠️ Công cụ Google Sheets hiện đang theo cấu trúc **ID tài liệu 19 số** (bản cũ). Chưa cập nhật theo cấu trúc 14 số mới — sẽ dựng lại khi cần.

---

## 5. Hệ thống web (đề xuất kiến trúc)

### 5.1. Vai trò & phân quyền

| Chức năng | Admin | Tuyển sinh | GV & Trợ giảng |
|---|:---:|:---:|:---:|
| Quản lý bảng mã gốc | ✅ | — | — |
| Tạo/sửa lớp (ID lớp học) | ✅ | 👁 | 👁 |
| Tạo ID học sinh | ✅ | ✅ | — |
| Tạo ID tài liệu / câu hỏi | ✅ | — | ✅ |
| Tra cứu & xuất ID | ✅ | ✅ | ✅ |
| Quản lý người dùng & phân quyền | ✅ | — | — |
| Xem nhật ký thao tác | ✅ | — | — |

Phân quyền kiểm ở **cả giao diện lẫn cơ sở dữ liệu** (không chỉ ẩn nút).

### 5.2. Mô hình dữ liệu (bảng chính)

- `users` — email, tên, vai trò, trạng thái.
- `cap_hoc`, `chuong_trinh`, `mon_hoc`, `hinh_thuc`, `dang_cau` — bảng mã gốc.
- `lop` — cấp/chương trình/năm/số lớp, **ID lớp học (9 số)**, người tạo.
- `hoc_sinh` — gắn với **lớp nhập học đầu tiên**, STT, họ tên, **ID học sinh (12 số) cố định vĩnh viễn**; lớp hiện tại lưu ở cột riêng; người tạo.
- `tai_lieu` — gắn nội dung (không gắn lớp), **ID tài liệu (14 số)**, tiêu đề, người tạo.
- `ngu_lieu` — đề dẫn dùng chung (đoạn đọc / bảng số liệu / tình huống logic): loại, nội dung, vị trí giáo án (môn/bài); khoá riêng.
- `cau_hoi` — **ID câu hỏi (16 số)**, khoá ngoại `ngu_lieu_id` (nullable), dạng câu, độ khó *(metadata, không vào ID)*, nội dung, đáp án đúng, lời giải, người tạo.
- `lua_chon` — phương án của câu MCQ: khoá ngoại `cau_hoi_id`, nội dung, cờ `la_dap_an`.
- `de` — đề/bộ đề: ID, tên, người tạo.
- `de_cau_hoi` — **bảng nối nhiều-nhiều** giữa `de` và `cau_hoi`: `de_id`, `cau_hoi_id`, thứ tự. Đây là nơi thể hiện "câu này xuất hiện trong đề nào" và cho phép tái sử dụng câu hỏi.
- `nhat_ky` — ai, làm gì, lúc nào.

Mỗi cột ID có **ràng buộc duy nhất** ở tầng CSDL → không thể tạo trùng. Cặp (`de_id`, `cau_hoi_id`) trong `de_cau_hoi` cũng đặt ràng buộc duy nhất để một câu không bị thêm trùng vào cùng một đề.

### 5.3. Ba cải tiến so với file Excel

1. **Tự đánh số thứ tự** (chống trùng tự động): hệ thống cấp số kế tiếp cho STT học sinh, số lớp, số tài liệu — người dùng không phải nhớ "đã tới số mấy".
2. **Đăng nhập Google Workspace** của trung tâm, giới hạn theo domain.
3. **Nhật ký thao tác** để truy vết.

### 5.4. Công nghệ (xếp theo mức khuyến nghị)

1. **(Khuyến nghị) Supabase + React/Next.js** — CSDL PostgreSQL + đăng nhập Google + phân quyền theo dòng (RLS) sẵn có; frontend deploy Vercel/Cloudflare, trỏ subdomain trung tâm. Nhanh, dễ bảo trì.
2. **Next.js full-stack + PostgreSQL trên VPS** — tự chủ hoàn toàn, mọi thứ trên hạ tầng trung tâm; đổi lại tự làm auth và tự vận hành.
3. **Nền tảng internal-tool (Budibase / Appsmith / NocoDB) self-host** — ít code nhất, có sẵn phân quyền; kém linh hoạt khi tùy biến sâu.

### 5.5. Lộ trình

- **GĐ1:** Admin + bảng mã + tạo lớp + tạo ID học sinh (đủ cho tuyển sinh chạy).
- **GĐ2:** Tạo ID tài liệu + tra cứu/xuất.
- **GĐ3:** Ngân hàng tài liệu + ngân hàng câu hỏi (ID câu hỏi 16 số, ngữ liệu dùng chung, bảng nối đề–câu); công cụ ghép đề; nhật ký, thống kê từng câu (độ khó, tỉ lệ đúng).

---

## 6. Quyết định đang chờ chốt

1. **Nơi lưu trữ:** đám mây (Supabase — nhanh) hay server riêng của trung tâm (tự chủ)? *(Khuyến nghị: Supabase — có backup tự động, RLS phân quyền tận tầng dữ liệu; dữ liệu là PostgreSQL chuẩn nên `pg_dump` di dời được, không khoá chân.)*

> **Đã chốt:** gốc ID = 4 số (Cấp học + Chương trình); ID tài liệu 14 số; ID học sinh gắn theo lớp nhập học đầu tiên và cố định vĩnh viễn; **ID câu hỏi = nhánh độc lập 16 số, có thành phần Dạng câu riêng**; **ngữ liệu là thực thể riêng**; **câu hỏi ↔ đề nối qua bảng nhiều-nhiều** (tái sử dụng câu). Trước đây quyết định #1 (ID câu hỏi) và câu hỏi về nhiều dạng câu đã được chốt theo hướng này.

---

## 7. Nhật ký phiên bản

| Ngày | Nội dung |
|---|---|
| 15/07/2026 | Chốt cấu trúc 3 loại ID; bàn giao công cụ Google Sheets; đề xuất kiến trúc hệ thống web. Còn 3 quyết định ở mục 6. |
| 16/07/2026 | Định nghĩa **gốc 4 số** (Cấp học + Chương trình) làm nền tảng chung. **ID Tài liệu** rút từ 19 → **14 số** (bỏ mã lớp khỏi tiền tố, dùng chung mọi lớp cùng chương trình). Làm rõ **ID Học sinh** gắn theo lớp nhập học đầu tiên, cố định vĩnh viễn. Chốt quyết định #1 cũ. Công cụ Google Sheets chưa cập nhật theo cấu trúc mới. |
| 16/07/2026 (bản 3) | Thêm **nhánh ID thứ 4 — ID Câu hỏi 16 số** (mục 2.4): gốc + môn + học phần + bài + chủ đề + **dạng câu (1 số)** + STT câu (4 số); rẽ độc lập từ gốc, không nối vào ID tài liệu. Bổ sung **bảng mã Dạng câu hỏi** (8 dạng, mục 3). Thêm thực thể **Ngữ liệu** (đề dẫn dùng chung, mục 2.5) và các bảng `ngu_lieu`, `cau_hoi`, `lua_chon`, `de`, `de_cau_hoi` (mục 5.2) — câu hỏi ↔ đề nối nhiều-nhiều để tái sử dụng. Độ khó/đáp án/lời giải để làm metadata, không vào ID. Cập nhật lộ trình GĐ3. **Chốt quyết định ID câu hỏi**; mục 6 còn lại 1 quyết định (nơi lưu trữ). |
