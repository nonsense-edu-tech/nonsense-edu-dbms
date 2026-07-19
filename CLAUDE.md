# Nonsense Edu — Hệ thống quản lý ID nội bộ

Hệ thống web nội bộ cho trung tâm luyện thi Nonsense Edu: đặt & tra cứu ID thống
nhất cho lớp học, học sinh, tài liệu, câu hỏi; có phân quyền theo vai trò; tích
hợp điểm danh khuôn mặt (Hikvision) ở giai đoạn sau.

## Tech stack

- **Next.js** (App Router) + React, TypeScript.
- **Supabase** (PostgreSQL + Auth + RLS) làm backend/CSDL.
- **Vercel** deploy: branch `main` = production, `develop` = staging.
- Đăng nhập bằng **email + mật khẩu** (Supabase Auth).
  ⚠️ **KHÔNG dùng Google OAuth** — đã quyết định bỏ. Đừng tự thêm lại.

## Cấu trúc repo

- `src/app/login/` — trang đăng nhập (đã xong, đang chạy).
- `src/app/dashboard/` — placeholder, sẽ mở rộng theo GĐ1.
- `src/lib/supabase/` — `client.ts` (browser) + `server.ts` (SSR).
- `src/middleware.ts` — chặn route khi chưa đăng nhập.
- `docs/dac-ta-he-thong.md` — **đặc tả đầy đủ** (đọc trước khi động vào ID/CSDL).
- `docs/roadmap.md` — lộ trình 5 giai đoạn, danh sách việc.
- `supabase/migrations/` — SQL migration.

## Quy ước ID (BẤT BIẾN — nhớ kỹ)

ID là **chuỗi chữ số ghép liền**, padding `0` ở đầu cho đủ độ dài (lớp 7 → `007`).
**Luôn lưu dạng CHAR/text, KHÔNG lưu dạng số** (số sẽ mất `0` đầu).

- **Gốc 4 số** = Cấp học(1) + Chương trình(3). Nền tảng chung cho cả 4 nhánh.
- **ID Lớp học — 9 số** = Gốc + Năm học(2) + Lớp(3).
- **ID Học sinh — 12 số** = ID Lớp học + STT(3). Gắn theo **lớp nhập học đầu tiên**
  và **cố định vĩnh viễn**; chuyển lớp thì ID giữ nguyên, lớp hiện tại lưu ở cột riêng.
- **ID Tài liệu — 14 số** = Gốc + Môn(1) + Học phần(2) + Bài(2) + Hình thức(1) +
  Chủ đề(2) + TL cụ thể(2). **Đã chốt 14 số** (không phải 19 số bản cũ). Không gắn lớp.
- **ID Câu hỏi — 16 số** = Gốc + Môn(1) + Học phần(2) + Bài(2) + Chủ đề(2) +
  **Dạng câu(1)** + STT câu(4). Là **nhánh độc lập từ gốc**, KHÔNG nối vào ID tài liệu.

Chi tiết từng vị trí: xem `docs/dac-ta-he-thong.md`.

## Nguyên tắc thiết kế (invariants)

1. **Phân quyền kiểm ở CẢ UI lẫn CSDL** (RLS Supabase), không chỉ ẩn nút.
2. **Tự đánh số thứ tự** để chống trùng — hệ thống cấp số kế tiếp cho STT học sinh,
   số lớp, STT câu hỏi; người dùng không tự nhớ.
3. Mỗi cột ID có **ràng buộc UNIQUE** ở tầng CSDL.
4. **Ngữ liệu** (đề dẫn dùng chung) là **thực thể riêng** (`ngu_lieu`), không mã hoá
   vào ID câu hỏi. Câu hỏi trỏ về ngữ liệu qua FK (nullable).
5. **Câu hỏi ↔ đề** nối **nhiều-nhiều** qua `de_cau_hoi` để tái sử dụng câu.
6. **Độ khó, đáp án, lời giải, tag = metadata**, KHÔNG mã hoá vào ID.
7. Person ID cho Hikvision: tối đa **16 ký tự**, chấp nhận chuỗi số 0 đầu → ID câu
   hỏi 16 số vừa khít, ID học sinh 12 số cũng ổn.

## Trạng thái & lộ trình

- ✅ **Xong:** trang đăng nhập, deploy Vercel, project Supabase đã tạo.
- 🔜 **GĐ1 (đang tới):** bảng mã gốc (`cap_hoc`, `chuong_trinh`, `mon_hoc`,
  `hinh_thuc`, `dang_cau`), bảng `users` + RLS phân quyền, quản lý lớp, quản lý
  học sinh, tra cứu/xuất file định dạng Hikvision.
- **GĐ2:** chấm công/điểm danh, báo cáo phụ huynh, CRM tuyển sinh.
- **GĐ3:** ngân hàng tài liệu + câu hỏi (schema ở `supabase/migrations/`).
- **GĐ4:** QA dashboard, nhật ký, chuẩn bị scale.

Chi tiết 71 đầu việc: `docs/roadmap.md`.

## Quy ước làm việc

- Trả lời & comment code bằng **tiếng Việt**.
- Tên bảng/cột **tiếng Việt không dấu** (vd `hoc_sinh`, `ma_cau_hoi`).
- Trước khi động vào cấu trúc ID hoặc CSDL, **đọc `docs/dac-ta-he-thong.md`**.
- Mọi thay đổi CSDL viết thành **migration SQL** trong `supabase/migrations/`,
  đặt tên `NNNN_mo_ta.sql` tăng dần.
- Commit dưới tài khoản tổ chức (`git config user.email "it@nonsense.edu.vn"`).
