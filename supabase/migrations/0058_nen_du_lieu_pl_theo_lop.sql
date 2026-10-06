-- adr004-type: expand
-- =============================================================================
-- 0058 — NỀN DỮ LIỆU P&L THEO LỚP (Giai đoạn A1) — EXPAND-ONLY
--
-- Thêm: lop.hinh_thuc_mac_dinh / so_buoi_tuan; buoi_hoc.loai_buoi / hinh_thuc_hoc /
-- nguon_xac_nhan / import_batch_id / co_tinh_chi_phi_khi_huy; ghi_danh.hinh_thuc_tham_gia;
-- bảng mới buoi_hoc_nhan_su (thù lao ẨN) và don_gia_giang_day (thuần chi phí).
-- Không sửa/xoá policy RLS đang chạy; chỉ thêm. Ràng buộc unique buoi_hoc được NỚI (an toàn ngược).
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

-- 1. lop --------------------------------------------------------------------
alter table lop
    add column if not exists hinh_thuc_mac_dinh text
        check (hinh_thuc_mac_dinh in ('offline','online','omo')),
    add column if not exists so_buoi_tuan smallint
        check (so_buoi_tuan between 1 and 14);

comment on column lop.hinh_thuc_mac_dinh is 'Hình thức dạy mặc định của lớp; buoi_hoc.hinh_thuc_hoc null = kế thừa cột này.';
comment on column lop.so_buoi_tuan is 'Số buổi chuẩn/tuần (V-ACT 4; sau đại học 2). Số buổi cả khóa = số tuần giảng dạy × cột này (+ tăng cường).';

-- Backfill theo quy ước đã chốt (06/10/2026); chỉ điền khi đang trống.
update lop set so_buoi_tuan = 4, hinh_thuc_mac_dinh = 'offline'
 where chuong_trinh_ma = '010' and so_buoi_tuan is null;
update lop set so_buoi_tuan = 2, hinh_thuc_mac_dinh = 'omo'
 where chuong_trinh_ma in ('021','022') and so_buoi_tuan is null;
-- Lớp có chữ "A" trong mã (NE - A02) là online.
update lop set hinh_thuc_mac_dinh = 'online'
 where chuong_trinh_ma = '010' and ten_lop ~* '(^|[^a-z0-9])A-?0*2([^0-9]|$)';

-- 2. ghi_danh ---------------------------------------------------------------
alter table ghi_danh
    add column if not exists hinh_thuc_tham_gia text
        check (hinh_thuc_tham_gia in ('offline','online'));
comment on column ghi_danh.hinh_thuc_tham_gia is 'Chỉ dùng cho lớp OMO: học sinh tham gia trực tiếp hay online.';

-- 3. buoi_hoc ---------------------------------------------------------------
alter table buoi_hoc
    add column if not exists loai_buoi text not null default 'chinh_khoa'
        check (loai_buoi in ('chinh_khoa','tang_cuong','hoc_bu','thi_thu')),
    add column if not exists hinh_thuc_hoc text
        check (hinh_thuc_hoc in ('offline','online','omo')),
    add column if not exists nguon_xac_nhan text
        check (nguon_xac_nhan in ('thu_cong','suy_ra')),
    add column if not exists import_batch_id uuid,
    add column if not exists co_tinh_chi_phi_khi_huy boolean not null default false;

alter table buoi_hoc drop constraint if exists buoi_hoc_lop_id_mon_hoc_ma_ngay_key;
alter table buoi_hoc add constraint buoi_hoc_lop_mon_ngay_gio_key
    unique nulls not distinct (lop_id, mon_hoc_ma, ngay, gio_bat_dau);

-- Cột mới không phải chi phí → GRANT thêm cho authenticated.
grant select (loai_buoi, hinh_thuc_hoc, nguon_xac_nhan, import_batch_id, co_tinh_chi_phi_khi_huy)
    on buoi_hoc to authenticated;
grant insert (loai_buoi, hinh_thuc_hoc, nguon_xac_nhan, import_batch_id, co_tinh_chi_phi_khi_huy)
    on buoi_hoc to authenticated;
grant update (loai_buoi, hinh_thuc_hoc, nguon_xac_nhan, co_tinh_chi_phi_khi_huy)
    on buoi_hoc to authenticated;

-- Thêm cột vào CUỐI view (CREATE OR REPLACE chỉ cho phép append).
create or replace view buoi_hoc_chi_phi as
select id, lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc,
       thu_lao_gv, chi_phi_phong, trang_thai, deleted_at,
       loai_buoi, hinh_thuc_hoc, nguon_xac_nhan, import_batch_id, co_tinh_chi_phi_khi_huy
from buoi_hoc
where auth_role() = any (array['master_admin','ke_toan']);

create or replace view buoi_hoc_lich with (security_invoker = true) as
select id, lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc,
       trang_thai, deleted_at,
       loai_buoi, hinh_thuc_hoc, nguon_xac_nhan, co_tinh_chi_phi_khi_huy
from buoi_hoc;

-- 4. buoi_hoc_nhan_su — ai dạy buổi nào, vai trò gì; thu_lao ẨN như buoi_hoc ----
create table buoi_hoc_nhan_su (
    id          uuid primary key default uuidv7(),
    buoi_hoc_id uuid not null references buoi_hoc (id),
    user_id     uuid not null references users (id),
    vai_tro     text not null check (vai_tro in ('gv_chinh','tro_giang','day_thay')),
    thu_lao     bigint check (thu_lao >= 0),   -- CHI PHÍ snapshot, ẩn
    created_at  timestamptz not null default now(),
    deleted_at  timestamptz
);
create unique index buoi_hoc_nhan_su_uq on buoi_hoc_nhan_su (buoi_hoc_id, user_id, vai_tro) where deleted_at is null;
create index buoi_hoc_nhan_su_user_idx on buoi_hoc_nhan_su (user_id);

comment on table buoi_hoc_nhan_su is 'Nhân sự của từng buổi (GV chính/trợ giảng/dạy thay). thu_lao bị ẩn: chỉ đọc/ghi qua view buoi_hoc_nhan_su_chi_phi (ke_toan/master_admin).';

alter table buoi_hoc_nhan_su enable row level security;

create policy p_read_buoi_hoc_nhan_su on buoi_hoc_nhan_su for select to authenticated
    using (deleted_at is null);
create policy p_write_buoi_hoc_nhan_su on buoi_hoc_nhan_su for all to authenticated
    using (deleted_at is null and auth_role() = any (array['master_admin','admin_ts']))
    with check (auth_role() = any (array['master_admin','admin_ts']));
create policy p_write_buoi_hoc_nhan_su_qlcn on buoi_hoc_nhan_su for all to authenticated
    using (deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
        and buoi_hoc_id in (select b.id from buoi_hoc b join lop l on l.id = b.lop_id
                            join user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
                            where uc.user_id = auth.uid()))
    with check (auth_role() = 'quan_ly_chi_nhanh'
        and buoi_hoc_id in (select b.id from buoi_hoc b join lop l on l.id = b.lop_id
                            join user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
                            where uc.user_id = auth.uid()));

revoke all on buoi_hoc_nhan_su from anon;
revoke select, insert, update on buoi_hoc_nhan_su from authenticated;
grant select (id, buoi_hoc_id, user_id, vai_tro, created_at, deleted_at) on buoi_hoc_nhan_su to authenticated;
grant insert (buoi_hoc_id, user_id, vai_tro, deleted_at) on buoi_hoc_nhan_su to authenticated;
grant update (buoi_hoc_id, user_id, vai_tro, deleted_at) on buoi_hoc_nhan_su to authenticated;
grant delete on buoi_hoc_nhan_su to authenticated;

create view buoi_hoc_nhan_su_chi_phi as
select id, buoi_hoc_id, user_id, vai_tro, thu_lao, created_at, deleted_at
from buoi_hoc_nhan_su
where auth_role() = any (array['master_admin','ke_toan'])
with check option;
grant select, update on buoi_hoc_nhan_su_chi_phi to authenticated;
revoke all on buoi_hoc_nhan_su_chi_phi from anon;

-- 5. don_gia_giang_day — bảng đơn giá, THUẦN CHI PHÍ ------------------------
create table don_gia_giang_day (
    id            uuid primary key default uuidv7(),
    user_id       uuid not null references users (id),
    vai_tro       text not null check (vai_tro in ('gv_chinh','tro_giang','day_thay')),
    hinh_thuc_hoc text not null check (hinh_thuc_hoc in ('offline','online','omo')),
    loai_buoi     text not null default 'chinh_khoa'
                  check (loai_buoi in ('chinh_khoa','tang_cuong','hoc_bu','thi_thu')),
    cach_tinh     text not null check (cach_tinh in ('theo_buoi','theo_gio')),
    don_gia       bigint not null check (don_gia >= 0),
    hieu_luc_tu   date not null,
    hieu_luc_den  date,
    created_at    timestamptz not null default now(),
    deleted_at    timestamptz,
    check (hieu_luc_den is null or hieu_luc_den >= hieu_luc_tu),
    constraint don_gia_giang_day_no_overlap exclude using gist (
        user_id with =, vai_tro with =, hinh_thuc_hoc with =, loai_buoi with =,
        daterange(hieu_luc_tu, hieu_luc_den, '[]') with &&
    ) where (deleted_at is null)
);
create index don_gia_giang_day_user_idx on don_gia_giang_day (user_id);

comment on table don_gia_giang_day is 'Đơn giá dạy theo người/vai trò/hình thức/loại buổi, có hiệu lực theo ngày, không chồng lấn. THUẦN CHI PHÍ: chỉ ke_toan/master_admin đọc.';

alter table don_gia_giang_day enable row level security;
create policy p_read_don_gia_giang_day on don_gia_giang_day for select to authenticated
    using (deleted_at is null and auth_role() = any (array['master_admin','ke_toan']));
create policy p_write_don_gia_giang_day on don_gia_giang_day for all to authenticated
    using (auth_role() = 'master_admin') with check (auth_role() = 'master_admin');
revoke all on don_gia_giang_day from anon;
