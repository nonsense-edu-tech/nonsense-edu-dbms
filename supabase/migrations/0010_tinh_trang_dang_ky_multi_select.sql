-- =============================================================================
-- ĐỔI hoc_sinh.tinh_trang_dang_ky TỪ text (1 lựa chọn) SANG text[] (nhiều lựa
-- chọn), giống cách làm với lop.tinh_trang ở migration 0009. Giữ nguyên dữ
-- liệu cũ (nếu đã có giá trị single-text từ trước, bọc vào mảng 1 phần tử).
-- =============================================================================

alter table hoc_sinh
    alter column tinh_trang_dang_ky type text[]
    using (case when tinh_trang_dang_ky is null then null else array[tinh_trang_dang_ky] end);

alter table hoc_sinh drop constraint if exists hoc_sinh_tinh_trang_dang_ky_check;
alter table hoc_sinh add constraint hoc_sinh_tinh_trang_dang_ky_check
    check (tinh_trang_dang_ky <@ array['da_dang_ky','da_xac_nhan','da_nhap_hoc','huy_dang_ky']::text[]);
