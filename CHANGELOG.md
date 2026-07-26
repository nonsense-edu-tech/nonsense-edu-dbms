# Changelog — Nonsense Edu

Nhật ký từng lần deploy (migration DB + thay đổi code đáng kể). **Quy tắc bắt
buộc cho Claude Code:** sau MỖI lần áp dụng migration hoặc deploy thay đổi
đáng kể (tính năng mới, sửa lỗi ảnh hưởng hành vi, thay đổi RLS/policy), PHẢI
thêm 1 mục mới vào đầu file này — không sửa lại các mục cũ (trừ khi phát hiện
mục cũ ghi sai). Không cần ghi việc nhỏ (sửa chính tả, đổi CSS thuần tuý).

Mỗi mục ghi rõ:
- **Ngày**
- **Tóm tắt** (1-2 câu, việc gì, tại sao)
- **Migration** (tên file trong `supabase/migrations/`, nếu có — ghi "không
  có" nếu chỉ đổi code frontend)
- **Staging**: ✅ đã áp dụng / 🔲 chưa
- **Production**: ✅ đã áp dụng / 🔲 chưa
- **Commit**: hash git (nếu đã commit)

2 project Supabase: `nonsense-edu-staging` (`yxfgwzdxoxuoaulcjlcf`) = staging,
`DBMS Project (Jul2026)` (`pdyerenojwrtejyhlcbs`) = production.

---

## 2026-07-26 — Mở rộng toast sang module học phí + ghi quy ước bắt buộc

**Tóm tắt:** Nối `useToast()` vào 7 component còn lại của module học phí
(`goi_hoc_phi`, `hop_dong_hoc_phi`, `phieu_thu`). Ghi vào
`CLAUDE_new_22.07.26.md`: từ nay MỌI module mới/sửa lại đều phải gắn toast
thông báo thành công/thất bại, bổ sung thêm vào khung lỗi inline hiện có
(không thay thế).
**Migration:** không có (chỉ code frontend + tài liệu).
**Staging:** ✅ | **Production:** — (không áp dụng, thuần frontend + docs)
**Commit:** `169e8fa`

## 2026-07-26 — Thêm hệ thống toast thông báo (lop/hoc-sinh/chi-nhanh/van-hanh)

**Tóm tắt:** Thêm `ToastProvider` (`src/components/ToastProvider.tsx`,
context + hook `useToast()`), hiện thông báo dạng side-modal góc phải trên,
tự tắt sau 5s, phân biệt thành công/thất bại bằng viền + icon. Gắn vào
`src/app/layout.tsx` nên dùng được toàn app. Nối vào 19 component tạo/sửa/xoá
ở 4 module: `lop`, `hoc-sinh` (kể cả chuyển lớp), `chi-nhanh` (kể cả gán/gỡ
quản lý), `van-hanh` (loại phòng/phòng học/buổi học, kể cả ghi nhận chi phí).
**Migration:** không có.
**Staging:** ✅ | **Production:** — (không áp dụng, thuần frontend)
**Commit:** `5d3b890`

## 2026-07-26 — Vá lỗi RLS: xoá mềm lop/hoc_sinh vẫn hiện lại sau khi xoá

**Tóm tắt:** Lỗi thật của Postgres RLS, không phải cấu hình sai. Policy ghi
(`p_write`) khai báo `FOR ALL` nên `USING` của nó cũng chi phối SELECT
(OR-combine với `p_read`). Migration trước (`0032`/`0033`) bỏ
`deleted_at IS NULL` khỏi `USING` để sửa lỗi UPDATE bị chặn — tác dụng phụ:
mọi dòng kể cả đã xoá mềm trở nên "nhìn thấy được" khi đọc. Thử tách
`FOR ALL` thành `FOR INSERT`+`FOR UPDATE` riêng (`0034`) để vá đúng phạm vi
nhưng xác nhận qua test trực tiếp (bọc UPDATE trong hàm PL/pgSQL, không
RETURNING, không qua PostgREST) rằng Postgres **thật sự** yêu cầu dòng sau
UPDATE phải còn được 1 policy có phạm vi SELECT chấp nhận thì UPDATE mới
thành công — tách riêng không đủ. Giải pháp cuối (`0035`): quay lại
`FOR ALL`, chuyển trách nhiệm ẩn dòng đã xoá sang tầng ứng dụng — thêm
`.is('deleted_at', null)` tường minh vào `lop/page.tsx` và
`hoc-sinh/page.tsx` (`phong_hoc`/`buoi_hoc`/`loai_phong` đã có sẵn filter
này). **Bài học: RLS cho ghi ảnh hưởng cả đọc nếu dùng `FOR ALL` — cẩn thận
khi thêm điều kiện vào USING của policy `FOR ALL`.**
**Migration:** `0034_fix_ro_ri_deleted_at_qua_policy_all.sql` (bị 0035 đảo
ngược một phần), `0035_revert_split_ve_for_all_va_giai_thich.sql`.
**Staging:** ✅ | **Production:** 🔲 chưa
**Commit:** `658a814`

## 2026-07-26 — Vá lỗi id:number ở chi-nhanh/van-hanh + trùng mã STT/so_lop + RLS phong_hoc/buoi_hoc

**Tóm tắt:** Cùng lỗi kiểu ID (`number` thay vì `uuid`) như đã gặp ở
`lop`/`hoc-sinh` — phát hiện thêm ở `chi-nhanh` (gán/gỡ quản lý chi nhánh) và
`van-hanh` (loại phòng/phòng học/buổi học). Đã sửa toàn bộ 11 file. Riêng
`tao_hoc_sinh()`/`tao_lop()`: tính STT/so_lop tiếp theo trước đây bỏ qua dòng
đã xoá mềm (`deleted_at is null`), trong khi ràng buộc UNIQUE áp dụng cho cả
dòng đã xoá → xoá 1 học sinh/lớp rồi tạo lại cùng lớp/tổ hợp sẽ đụng mã cũ.
Bỏ điều kiện `deleted_at` khỏi phép tính (mã không được tái sử dụng — đúng
nguyên tắc "cố định vĩnh viễn"). `phong_hoc`/`buoi_hoc` cũng có cùng pattern
RLS `deleted_at IS NULL` trong `USING` như `lop`/`hoc_sinh` — vá tương tự
(sau đó phát hiện tác dụng phụ, xem mục kế tiếp).
**Migration:** `0033_fix_stt_solop_va_rls_phong_buoi_hoc.sql`.
**Staging:** ✅ | **Production:** 🔲 chưa
**Commit:** `a196b05`

## 2026-07-26 — Vá lỗi xoá mềm lop/hoc_sinh bị RLS chặn + tao_hoc_sinh() lệch id_old

**Tóm tắt:** Test thật qua UI (role master_admin) phát hiện 2 lỗi: (1) xoá
lớp/học sinh báo lỗi RLS dù đúng quyền — nguyên nhân PostgREST luôn phát
sinh `RETURNING` cho UPDATE (bất kể `.select()` client có gọi hay không), mà
policy ghi có `deleted_at IS NULL` trong `USING` nên dòng sau khi xoá mềm
không còn thoả policy nào → Postgres từ chối cả câu lệnh; (2) `tao_hoc_sinh()`
đang chạy trên staging bị lệch so với file migration trong repo — vẫn dùng
`id_old` (bigint) thay vì `id` (uuid) khi insert vào `ghi_danh`, gây lỗi kiểu
dữ liệu. Production không dính lỗi (2) vì đã áp dụng đúng bản chuẩn từ trước.
**Migration:** `0032_fix_soft_delete_rls_va_tao_hoc_sinh.sql`.
**Staging:** ✅ | **Production:** 🔲 chưa
**Commit:** `93225fe`

## 2026-07-26 — Hoàn thiện Khối 2: CRUD, chuyển lớp, trạng thái ghi danh, UI quan_ly_chi_nhanh

**Tóm tắt:** (1) Vá lỗi chặn toàn bộ CRUD `lop`/`hoc-sinh`: `id` khai kiểu
`number` nhưng thực tế đã là `uuid` từ ADR-003, khiến sửa/xoá/tạo học sinh
luôn báo lỗi. (2) Thêm luồng **chuyển lớp** (hàm `chuyen_lop()`, trạng thái
mới `da_chuyen_lop`) và **quản lý trạng thái ghi danh** trực tiếp trong bảng
(hàm `cap_nhat_trang_thai_ghi_danh()`). (3) Mở quyền UI cho vai trò
`quan_ly_chi_nhanh`, lọc đúng phạm vi chi nhánh ở tầng ứng dụng (RLS đọc vốn
mở cho mọi vai trò). (4) Thêm bộ lọc lớp/chi nhánh/trạng thái ghi danh vào
danh sách học sinh. (5) Generate lại TypeScript types từ schema thật, lưu
`src/lib/database.types.ts` làm tài liệu tham chiếu (chưa gắn cứng vào
`createClient()` toàn cục để tránh vỡ các module chưa sửa).
**Migration:** `0031_chuyen_lop_ghi_danh.sql`.
**Staging:** ✅ | **Production:** 🔲 chưa
**Commit:** `cb6f780`

## 2026-07-23 — ADR-003: chuyển toàn bộ khóa chính sang UUIDv7 (8 phase)

**Tóm tắt:** Chuyển PK của 26 bảng từ `bigint`/mã tự nhiên sang `uuid`
(hàm `public.uuidv7()` tự viết, RFC 9562 random method) — theo đúng chiến
lược Expand-Backfill-Contract-Verify (ADR-003 Mục 4), 8 phase theo thứ tự
phụ thuộc FK. Đối chiếu số dòng + dữ liệu mẫu khớp tuyệt đối sau mỗi phase
trên CẢ hai môi trường (test riêng trên staging trước, backup thủ công +
đối chiếu schema staging↔production trước khi chạy production, dừng ngay nếu
lệch — không có phase nào lệch). Sau ADR-003, 4 bảng ngoài phạm vi
(`loai_phong`/`phong_hoc`/`chuong_trinh_mon_hoc`/`buoi_hoc`) được build mới
bằng UUID luôn — **quyết định: 4 bảng này CHỈ có trên staging, KHÔNG đưa lên
production trong đợt này.**
**Migration:** `0019`-`0030` (staging), `0019`-`0029` bản tương ứng trong
`supabase/migrations/production-adr003/` (production, khác vài tên
constraint do lịch sử schema riêng — xem comment đầu mỗi file).
**Staging:** ✅ (cả 30 file) | **Production:** ✅ (29 file, không có `0030`)
**Commit:** chưa commit các file migration này vào git tại thời điểm áp dụng
— **cần `git add`/`commit` các file `supabase/migrations/0019`-`0030*.sql`
và `supabase/migrations/production-adr003/` nếu chưa nằm trong lịch sử git**
(kiểm tra `git log --diff-filter=A -- supabase/migrations/0019*` trước khi
giả định).

---

## Trước 2026-07-23 (chưa có nhật ký chi tiết — xem `roadmap.md`)

Các migration `0001`-`0018` (bảng mã gốc, users/RBAC, học sinh/lớp/ghi danh,
ngân hàng câu hỏi, module học phí GĐ1, đính kèm biên lai, chi nhánh, vai trò
`quan_ly_chi_nhanh`) và module vận hành lớp học (`0017`/`0018` trên staging)
đã áp dụng trước khi file changelog này được tạo — xem `roadmap.md` mục
"Ghi chú migration" để biết chi tiết lịch sử từng file.
