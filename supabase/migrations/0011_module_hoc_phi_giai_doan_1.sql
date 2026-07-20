-- =============================================================================
-- MODULE HỌC PHÍ / TÀI CHÍNH — GIAI ĐOẠN 1 (xem finance_module/01..07).
--
-- BỐI CẢNH: đặc tả gốc ở finance_module/07-schema-phase1.sql dùng tên bảng tiếng
-- Anh (students/programs/enrollments/contracts/...) và giả định hệ thống chưa
-- có gì. Thực tế production ĐÃ CÓ users (vai_tro), hoc_sinh, chuong_trinh,
-- ghi_danh — nên migration này KHÔNG tạo lại students/programs/enrollments hay
-- enum vai trò riêng, mà tái sử dụng và chỉ tạo phần thật sự mới:
--   goi_hoc_phi        (= fee_packages, FK -> chuong_trinh.ma)
--   hop_dong_hoc_phi   (= contracts,    FK -> ghi_danh.id, UNIQUE)
--   ky_dong_hoc_phi    (= payment_schedules)
--   tep_dinh_kem       (= attachments)
--   phieu_thu          (= receipts, append-only — không soft delete, KHÔNG ai
--                        sửa/xoá được kể cả master_admin, chỉ tạo phiếu đảo)
--   nhat_ky_tai_chinh  (= audit_logs, phạm vi module tài chính)
--
-- Tên bảng/cột tiếng Việt không dấu theo quy ước CLAUDE.md. PK dùng bigint
-- identity (giống hoc_sinh/lop/ghi_danh/cau_hoi) — không dùng UUID (UUID chỉ
-- dành cho users vì đồng bộ với auth.users.id).
--
-- Vai trò mới: ke_toan (kế toán), thu_ngan (thu ngân) — mở rộng CHECK constraint
-- users_vai_tro_check hiện có (KHÔNG phải ALTER TYPE, vai_tro là cột text kèm
-- CHECK, không phải enum).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Mở rộng vai trò: thêm ke_toan, thu_ngan vào CHECK constraint của users.
-- -----------------------------------------------------------------------------
alter table users drop constraint if exists users_vai_tro_check;
alter table users add constraint users_vai_tro_check
    check (vai_tro = any (array['master_admin','admin_ts','admin_ht','truong_bm','gv','ke_toan','thu_ngan']::text[]));

-- -----------------------------------------------------------------------------
-- 1. GÓI HỌC PHÍ (versioned theo chương trình + hình thức đóng).
-- Đổi giá = insert dòng mới + set hieu_luc_den cho dòng cũ, không update tại chỗ.
-- -----------------------------------------------------------------------------
create table if not exists goi_hoc_phi (
    id             bigint generated always as identity primary key,
    chuong_trinh_ma char(3) not null references chuong_trinh(ma),
    ten            text not null,
    hinh_thuc_dong text not null check (hinh_thuc_dong in ('mot_lan','hang_thang','hang_quy','tra_gop')),
    gia_niem_yet   bigint not null check (gia_niem_yet >= 0),
    hieu_luc_tu    date not null default current_date,
    hieu_luc_den   date,
    dang_ap_dung   boolean not null default true,
    nguoi_tao      uuid references users(id),
    created_at     timestamptz not null default now(),
    deleted_at     timestamptz,
    check (hieu_luc_den is null or hieu_luc_den >= hieu_luc_tu)
);
create index if not exists idx_goi_hoc_phi_hien_hanh on goi_hoc_phi (chuong_trinh_ma) where hieu_luc_den is null and deleted_at is null;

-- -----------------------------------------------------------------------------
-- 2. HỢP ĐỒNG HỌC PHÍ — 1-1 với một lượt ghi danh (INV-8).
-- Giá + giảm giá + doanh thu thuần là snapshot tại thời điểm tạo (INV-5).
-- -----------------------------------------------------------------------------
create table if not exists hop_dong_hoc_phi (
    id              bigint generated always as identity primary key,
    ghi_danh_id     bigint not null unique references ghi_danh(id),
    goi_hoc_phi_id  bigint not null references goi_hoc_phi(id),
    gia_niem_yet    bigint not null check (gia_niem_yet >= 0),
    loai_giam_gia   text not null default 'khong' check (loai_giam_gia in ('khong','phan_tram','co_dinh')),
    gia_tri_giam_gia bigint not null default 0 check (gia_tri_giam_gia >= 0),
    so_tien_giam    bigint not null default 0 check (so_tien_giam >= 0),
    doanh_thu_thuan bigint not null check (doanh_thu_thuan >= 0),
    hinh_thuc_dong  text not null check (hinh_thuc_dong in ('mot_lan','hang_thang','hang_quy','tra_gop')),
    trang_thai      text not null default 'nhap' check (trang_thai in ('nhap','cho_duyet','dang_hoat_dong','hoan_thanh','da_huy')),
    nguoi_tao       uuid references users(id),
    nguoi_duyet     uuid references users(id),
    kich_hoat_luc   timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz,
    -- INV-1: doanh thu thuần = giá niêm yết - số tiền giảm, và giảm không vượt giá.
    constraint chk_hop_dong_doanh_thu check (doanh_thu_thuan = gia_niem_yet - so_tien_giam),
    constraint chk_hop_dong_giam      check (so_tien_giam <= gia_niem_yet)
);
create index if not exists idx_hop_dong_trang_thai on hop_dong_hoc_phi (trang_thai);

drop trigger if exists trg_hop_dong_set_updated_at on hop_dong_hoc_phi;
create trigger trg_hop_dong_set_updated_at before update on hop_dong_hoc_phi
    for each row execute function set_updated_at();

-- Chỉ master_admin được xoá (mềm) hợp đồng — cùng quy ước với lop/hoc_sinh.
create or replace function forbid_hop_dong_soft_delete_by_non_master()
returns trigger language plpgsql as $$
begin
    if new.deleted_at is distinct from old.deleted_at and auth_role() <> 'master_admin' then
        raise exception 'Chỉ Master Admin được xoá (mềm) hợp đồng học phí.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_hop_dong_forbid_soft_delete on hop_dong_hoc_phi;
create trigger trg_hop_dong_forbid_soft_delete before update on hop_dong_hoc_phi
    for each row execute function forbid_hop_dong_soft_delete_by_non_master();

-- -----------------------------------------------------------------------------
-- 3. KỲ ĐÓNG HỌC PHÍ (chia kỳ của một hợp đồng).
-- -----------------------------------------------------------------------------
create table if not exists ky_dong_hoc_phi (
    id              bigint generated always as identity primary key,
    hop_dong_id     bigint not null references hop_dong_hoc_phi(id) on delete cascade,
    so_ky           int not null check (so_ky >= 1),
    ngay_den_han    date not null,
    so_tien_du_kien bigint not null check (so_tien_du_kien >= 0),
    trang_thai      text not null default 'cho_thu' check (trang_thai in ('cho_thu','dong_mot_phan','da_dong','qua_han')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (hop_dong_id, so_ky)
);
create index if not exists idx_ky_dong_hop_dong on ky_dong_hoc_phi (hop_dong_id);
create index if not exists idx_ky_dong_den_han  on ky_dong_hoc_phi (ngay_den_han);

drop trigger if exists trg_ky_dong_set_updated_at on ky_dong_hoc_phi;
create trigger trg_ky_dong_set_updated_at before update on ky_dong_hoc_phi
    for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. TỆP ĐÍNH KÈM (biên lai).
-- -----------------------------------------------------------------------------
create table if not exists tep_dinh_kem (
    id               bigint generated always as identity primary key,
    ten_tep          text not null,
    loai_mime        text not null check (loai_mime in ('image/jpeg','image/png','image/heic','application/pdf')),
    dung_luong       bigint check (dung_luong is null or dung_luong > 0),
    duong_dan_luu_tru text not null,
    nguoi_tai_len    uuid references users(id),
    created_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5. PHIẾU THU — APPEND-ONLY (INV-2). Không có deleted_at: sửa sai = phiếu đảo,
-- không phải xoá mềm. Trigger chặn UPDATE/DELETE với MỌI vai trò, kể cả master_admin.
-- -----------------------------------------------------------------------------
create table if not exists phieu_thu (
    id                  bigint generated always as identity primary key,
    ma_phieu_thu        text not null unique,
    hop_dong_id         bigint not null references hop_dong_hoc_phi(id),
    ky_dong_id          bigint references ky_dong_hoc_phi(id),
    so_tien             bigint not null check (so_tien > 0),
    ngay_thu            timestamptz not null default now(),
    hinh_thuc           text not null check (hinh_thuc in ('tien_mat','chuyen_khoan')),
    tep_dinh_kem_id     bigint references tep_dinh_kem(id),
    la_phieu_dao        boolean not null default false,
    phieu_dao_cua_id    bigint references phieu_thu(id),
    ghi_chu             text,
    nguoi_thu           uuid references users(id),
    created_at          timestamptz not null default now(),
    -- INV-4: phiếu đảo phải trỏ tới phiếu gốc; phiếu thường thì không.
    constraint chk_phieu_thu_dao check (
        (la_phieu_dao = false and phieu_dao_cua_id is null) or
        (la_phieu_dao = true  and phieu_dao_cua_id is not null)
    )
);
create index if not exists idx_phieu_thu_hop_dong on phieu_thu (hop_dong_id);
create index if not exists idx_phieu_thu_ky_dong  on phieu_thu (ky_dong_id);
create index if not exists idx_phieu_thu_ngay_thu on phieu_thu (ngay_thu);

create or replace function forbid_phieu_thu_mutation()
returns trigger language plpgsql as $$
begin
    raise exception 'Phiếu thu là append-only: không được sửa/xoá (kể cả Master Admin). Hãy tạo phiếu đảo.';
end;
$$;

drop trigger if exists trg_phieu_thu_no_update on phieu_thu;
create trigger trg_phieu_thu_no_update before update on phieu_thu
    for each row execute function forbid_phieu_thu_mutation();
drop trigger if exists trg_phieu_thu_no_delete on phieu_thu;
create trigger trg_phieu_thu_no_delete before delete on phieu_thu
    for each row execute function forbid_phieu_thu_mutation();

-- Hàm sinh mã phiếu thu tự tăng theo năm: PT-<năm>-<số thứ tự 6 chữ số>.
create or replace function tao_ma_phieu_thu()
returns text
language plpgsql
security invoker
as $$
declare
    v_nam  text := to_char(current_date, 'YYYY');
    v_next int;
begin
    perform pg_advisory_xact_lock(hashtext('phieu_thu_' || v_nam));

    select coalesce(max(substring(ma_phieu_thu from 9)::int), 0) + 1 into v_next
    from phieu_thu
    where ma_phieu_thu like 'PT-' || v_nam || '-%';

    return 'PT-' || v_nam || '-' || lpad(v_next::text, 6, '0');
end;
$$;

comment on function tao_ma_phieu_thu is 'Sinh mã phiếu thu kế tiếp trong năm hiện tại, dạng PT-<năm>-<6 chữ số>.';
grant execute on function tao_ma_phieu_thu() to authenticated;

-- -----------------------------------------------------------------------------
-- 6. NHẬT KÝ TÀI CHÍNH (audit log phạm vi module học phí).
-- -----------------------------------------------------------------------------
create table if not exists nhat_ky_tai_chinh (
    id            bigint generated always as identity primary key,
    nguoi_dung_id uuid references users(id),
    hanh_dong     text not null,
    doi_tuong     text not null,
    doi_tuong_id  bigint,
    truoc         jsonb,
    sau           jsonb,
    created_at    timestamptz not null default now()
);
create index if not exists idx_nhat_ky_doi_tuong on nhat_ky_tai_chinh (doi_tuong, doi_tuong_id);

-- =============================================================================
-- RLS — theo ma trận phân quyền finance_module/04-rbac-permissions.md, thu gọn
-- cho GĐ1 (RBAC "ở mức khung"). admissions = admin_ts đã có sẵn; principal
-- không có vai trò riêng trong production, master_admin đã bao trùm vai trò đó.
-- =============================================================================

alter table goi_hoc_phi      enable row level security;
alter table hop_dong_hoc_phi enable row level security;
alter table ky_dong_hoc_phi  enable row level security;
alter table tep_dinh_kem     enable row level security;
alter table phieu_thu        enable row level security;
alter table nhat_ky_tai_chinh enable row level security;

-- goi_hoc_phi: đọc = 4 vai trò tài chính; ghi (định giá) = master_admin/ke_toan.
drop policy if exists p_read_goi_hoc_phi on goi_hoc_phi;
create policy p_read_goi_hoc_phi on goi_hoc_phi for select
    using (deleted_at is null and auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));

drop policy if exists p_write_goi_hoc_phi on goi_hoc_phi;
create policy p_write_goi_hoc_phi on goi_hoc_phi for all
    using (deleted_at is null and auth_role() = any (array['master_admin','ke_toan']))
    with check (auth_role() = any (array['master_admin','ke_toan']));

-- hop_dong_hoc_phi: đọc = 4 vai trò; ghi (tạo/sửa hợp đồng, kích hoạt) = master_admin/ke_toan/admin_ts.
drop policy if exists p_read_hop_dong on hop_dong_hoc_phi;
create policy p_read_hop_dong on hop_dong_hoc_phi for select
    using (deleted_at is null and auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));

drop policy if exists p_write_hop_dong on hop_dong_hoc_phi;
create policy p_write_hop_dong on hop_dong_hoc_phi for all
    using (deleted_at is null and auth_role() = any (array['master_admin','ke_toan','admin_ts']))
    with check (auth_role() = any (array['master_admin','ke_toan','admin_ts']));

-- ky_dong_hoc_phi: đọc = 4 vai trò; ghi (chia/sửa kỳ) = master_admin/ke_toan/admin_ts (không thu_ngan).
drop policy if exists p_read_ky_dong on ky_dong_hoc_phi;
create policy p_read_ky_dong on ky_dong_hoc_phi for select
    using (auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));

drop policy if exists p_write_ky_dong on ky_dong_hoc_phi;
create policy p_write_ky_dong on ky_dong_hoc_phi for all
    using (auth_role() = any (array['master_admin','ke_toan','admin_ts']))
    with check (auth_role() = any (array['master_admin','ke_toan','admin_ts']));

-- tep_dinh_kem: đọc = 4 vai trò; tạo = ai được ghi phiếu thu cũng đính kèm được được.
drop policy if exists p_read_tep_dinh_kem on tep_dinh_kem;
create policy p_read_tep_dinh_kem on tep_dinh_kem for select
    using (auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));

drop policy if exists p_insert_tep_dinh_kem on tep_dinh_kem;
create policy p_insert_tep_dinh_kem on tep_dinh_kem for insert
    with check (auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));

-- phieu_thu: đọc = 4 vai trò; CHỈ insert (append-only — update/delete đã bị trigger chặn tuyệt đối).
drop policy if exists p_read_phieu_thu on phieu_thu;
create policy p_read_phieu_thu on phieu_thu for select
    using (auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));

drop policy if exists p_insert_phieu_thu on phieu_thu;
create policy p_insert_phieu_thu on phieu_thu for insert
    with check (auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));

-- nhat_ky_tai_chinh: đọc = master_admin/ke_toan; ghi = bất kỳ ai thao tác tài chính (tự ghi log hành động của mình).
drop policy if exists p_read_nhat_ky on nhat_ky_tai_chinh;
create policy p_read_nhat_ky on nhat_ky_tai_chinh for select
    using (auth_role() = any (array['master_admin','ke_toan']));

drop policy if exists p_insert_nhat_ky on nhat_ky_tai_chinh;
create policy p_insert_nhat_ky on nhat_ky_tai_chinh for insert
    with check (auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));

-- =============================================================================
-- VIEWS cho dashboard (xem finance_module/05-dashboard-spec.md).
-- =============================================================================
create or replace view v_thuc_thu_hop_dong as
select hd.id as hop_dong_id,
       coalesce(sum(case when pt.la_phieu_dao then -pt.so_tien else pt.so_tien end), 0) as thuc_thu
from hop_dong_hoc_phi hd
left join phieu_thu pt on pt.hop_dong_id = hd.id
group by hd.id;

create or replace view v_tai_chinh_hop_dong as
select hd.id as hop_dong_id,
       hd.ghi_danh_id,
       gd.lop_id,
       l.chuong_trinh_ma,
       hd.doanh_thu_thuan,
       tt.thuc_thu,
       (hd.doanh_thu_thuan - tt.thuc_thu) as con_phai_thu,
       hd.trang_thai,
       hd.kich_hoat_luc
from hop_dong_hoc_phi hd
join ghi_danh gd on gd.id = hd.ghi_danh_id
join lop l on l.id = gd.lop_id
join v_thuc_thu_hop_dong tt on tt.hop_dong_id = hd.id
where hd.deleted_at is null;

create or replace view v_hop_dong_qua_han as
select hd.id as hop_dong_id, hs.ho_ten, hs.ma_hoc_sinh, l.ten_lop,
       sum(greatest(ky.so_tien_du_kien - coalesce(da_thu.da_thu_trong_ky, 0), 0)) as so_tien_cham,
       max(current_date - ky.ngay_den_han) as so_ngay_tre_nhat
from hop_dong_hoc_phi hd
join ghi_danh gd on gd.id = hd.ghi_danh_id
join hoc_sinh hs on hs.id = gd.hoc_sinh_id
join lop l on l.id = gd.lop_id
join ky_dong_hoc_phi ky on ky.hop_dong_id = hd.id
left join (
    select ky_dong_id,
           sum(case when la_phieu_dao then -so_tien else so_tien end) as da_thu_trong_ky
    from phieu_thu where ky_dong_id is not null group by ky_dong_id
) da_thu on da_thu.ky_dong_id = ky.id
where hd.deleted_at is null
  and hd.trang_thai = 'dang_hoat_dong'
  and ky.ngay_den_han < current_date
  and coalesce(da_thu.da_thu_trong_ky, 0) < ky.so_tien_du_kien
group by hd.id, hs.ho_ten, hs.ma_hoc_sinh, l.ten_lop
order by so_ngay_tre_nhat desc;

-- =============================================================================
-- HẾT — chưa tạo (giai đoạn sau): adjustments, revenue_recognition, period_closes,
-- chart_of_accounts, ledger_transactions, ledger_entries, einvoice_exports.
-- =============================================================================
