-- adr004-type: expand
-- 0043_import_master_sheet_expand.sql
-- Expand thuần: nới CHECK hinh_thuc của phieu_thu (thêm 'chua_ro') + thêm bảng import_batch
-- và các cột nullable. ĐÃ ÁP lên production 02/10/2026 qua MCP (trái ADR-004 luật (a))
-- để import Master sheet 2026-2027 — file này ghi nhận lại cho khớp. Idempotent.

alter table phieu_thu drop constraint if exists phieu_thu_hinh_thuc_check;
alter table phieu_thu add constraint phieu_thu_hinh_thuc_check check (hinh_thuc = any (array['tien_mat','chuyen_khoan','chua_ro']));

create table if not exists import_batch (
  id uuid primary key default uuidv7(),
  ten text not null,
  created_at timestamptz not null default now()
);
alter table import_batch enable row level security;

alter table hoc_sinh add column if not exists nam_sinh smallint,
  add column if not exists truong_dai_hoc text,
  add column if not exists import_batch_id uuid references import_batch(id);
alter table lop add column if not exists khoa_nhap_hoc smallint,
  add column if not exists import_batch_id uuid references import_batch(id);
alter table ghi_danh add column if not exists import_batch_id uuid references import_batch(id);
alter table hop_dong_hoc_phi add column if not exists ghi_chu text,
  add column if not exists import_batch_id uuid references import_batch(id);
alter table ky_dong_hoc_phi add column if not exists import_batch_id uuid references import_batch(id);
alter table phieu_thu add column if not exists import_batch_id uuid references import_batch(id);
