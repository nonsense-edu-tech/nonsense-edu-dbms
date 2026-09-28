-- adr004-type: expand
-- =============================================================================
-- Tiếp theo `0038` — viết lại hồi tố cho migration thứ 2 trong đợt áp tay lên
-- production ngày 28/09/2026 (vi phạm ADR-004, xem ghi chú đầu `0038`).
-- Production đang có dưới version tự sinh `20260928093116`
-- (`gd3_buoc2_va_loi_bao_mat_advisor`).
--
-- Gốc: `Supabase:get_advisors` (security lint) sau khi áp `0038` báo 2 lỗ hổng:
--   1. `cau_hoi_bo_dem` được tạo trong `0038` nhưng thiếu `ENABLE ROW LEVEL
--      SECURITY` — đã được gộp sẵn vào `0038` ở bản viết lại này (bảng RLS
--      bật ngay lúc tạo), nên KHÔNG lặp lại ở đây.
--   2. 3/4 hàm SECURITY DEFINER mới (`cap_ma_cau_hoi`,
--      `danh_muc_cau_hoi_tro_giang`, `xem_mot_cau_hoi`) mặc định được Postgres
--      cấp EXECUTE cho PUBLIC lúc tạo hàm — nghĩa là vai trò `anon` (chưa đăng
--      nhập) gọi được, dù bên trong có check vai trò. Thu hồi quyền này để chỉ
--      vai trò đã đăng nhập (`authenticated`) mới gọi được — giảm bề mặt tấn
--      công dù logic bên trong đã chặn đúng.
--
-- ĐÃ ĐỐI CHIẾU LẠI VỚI PRODUCTION (28/09/2026, information_schema
-- .role_routine_grants): `co_quyen_mon` CỐ Ý không nằm trong danh sách thu hồi
-- — hàm này chỉ trả `boolean` (không lộ dữ liệu), SECURITY DEFINER, và với
-- `anon` thì `auth.uid()` luôn null → luôn trả `false`. Giữ EXECUTE cho PUBLIC
-- không tạo rủi ro, và nó cũng được gọi trực tiếp từ RLS policy của các bảng
-- khác. Đây là quyết định có chủ đích, không phải sơ suất bỏ sót.
--
-- Expand thuần: chỉ REVOKE quyền thực thi rộng hơn cần thiết, không đổi hành
-- vi hay chữ ký hàm — code cũ (nếu có) gọi qua vai trò `authenticated` không
-- bị ảnh hưởng.
-- =============================================================================

revoke execute on function public.cap_ma_cau_hoi(smallint, smallint, smallint, smallint, smallint, smallint, smallint) from public;
revoke execute on function public.danh_muc_cau_hoi_tro_giang(smallint) from public;
revoke execute on function public.xem_mot_cau_hoi(uuid) from public;
