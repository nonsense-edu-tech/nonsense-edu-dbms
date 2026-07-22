-- =============================================================================
-- ĐA CHI NHÁNH — bảng chi_nhanh + ràng buộc FK cho lop.chi_nhanh_id
--
-- QUYẾT ĐỊNH ĐÃ CHỐT (không đổi gì về ID): ma_lop/ma_hoc_sinh giữ nguyên định
-- dạng và cách đếm hiện tại (so_lop đếm CHUNG toàn hệ thống theo tổ hợp
-- cấp học+chương trình+năm học, KHÔNG phân biệt chi nhánh). Migration này
-- THUẦN TÚY ADDITIVE — không sửa tao_lop()/tao_hoc_sinh(), không đụng cột
-- GENERATED nào, không ảnh hưởng ID đã cấp cho lớp/học sinh hiện có.
--
-- lop.chi_nhanh_id đã tồn tại từ migration 0004 (tham số p_chi_nhanh_id của
-- tao_lop()) nhưng chưa có bảng chi_nhanh gốc để tham chiếu — migration này
-- bổ sung phần còn thiếu đó.
-- =============================================================================

create table chi_nhanh (
    id          bigint generated always as identity primary key,
    ma          text not null unique,
    ten         text not null,
    dia_chi     text,
    deleted_at  timestamptz
);

comment on table chi_nhanh is
    'Chi nhánh trung tâm. Không ảnh hưởng cách sinh ma_lop/ma_hoc_sinh — chi_nhanh_id là cột FK độc lập, không mã hoá vào chuỗi ID (quyết định đã chốt).';

-- Gắn FK cho cột đã tồn tại trên lop (trước đây chưa có bảng đích để trỏ tới)
alter table lop
    add constraint fk_lop_chi_nhanh foreign key (chi_nhanh_id) references chi_nhanh (id);

alter table chi_nhanh enable row level security;

-- Đọc: mọi user đã đăng nhập (giống pattern RLS đọc của các bảng danh mục khác)
create policy p_read_chi_nhanh on chi_nhanh for select to authenticated using (true);

-- Ghi: chỉ master_admin (giống mức độ hạn chế của các bảng mã gốc khác:
-- cap_hoc, chuong_trinh, mon_hoc — đều chỉ Admin quản lý theo Mục 5.1
-- dac-ta-he-thong.md)
create policy p_write_chi_nhanh on chi_nhanh for all to authenticated
    using (auth_role() = 'master_admin')
    with check (auth_role() = 'master_admin');

-- =============================================================================
-- HẾT
-- =============================================================================
