-- =============================================================================
-- BỔ SUNG THÔNG TIN LỚP HỌC: ngày khai giảng/kết thúc, tình trạng (multi-select).
-- Không đụng cột/constraint/RLS cấu thành ID (cap_hoc_ma, chuong_trinh_ma,
-- nam_hoc, so_lop) — các cột đó vẫn bất biến, chỉ đổi cách hiển thị ở tầng UI.
-- =============================================================================

alter table lop
    add column if not exists ngay_khai_giang date,
    add column if not exists ngay_ket_thuc   date,
    add column if not exists tinh_trang      text[];

alter table lop drop constraint if exists lop_tinh_trang_check;
alter table lop add constraint lop_tinh_trang_check
    check (tinh_trang <@ array['dang_tuyen_sinh','da_khai_giang','dang_hoc','da_hoan_thanh','da_huy']::text[]);
