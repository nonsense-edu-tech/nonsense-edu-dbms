-- adr004-type: expand
-- 0044_chan_duyet_hop_dong_va_policy_import_batch.sql
-- Siết trigger tự duyệt hợp đồng (chặn cả nhap/cho_duyet -> hoan_thanh) + policy master_admin cho import_batch.
-- ĐÃ ÁP lên production 02/10/2026 thủ công qua SQL Editor — file này ghi nhận lại. Idempotent.

create or replace function public.chan_tu_duyet_hop_dong_hoc_phi()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  -- Chặn nhảy cóc: mọi bước từ nháp/chờ duyệt sang đang hoạt động hoặc hoàn thành đều là "duyệt"
  if new.trang_thai is distinct from old.trang_thai
     and new.trang_thai in ('dang_hoat_dong','hoan_thanh')
     and old.trang_thai in ('nhap','cho_duyet')
     and auth_role() not in ('master_admin','ke_toan') then
    raise exception 'Chỉ Kế toán hoặc Master Admin được duyệt hợp đồng học phí.';
  end if;
  return new;
end;
$$;

drop policy if exists p_read_import_batch on public.import_batch;
create policy p_read_import_batch on public.import_batch for select
  using (auth_role() = 'master_admin');
drop policy if exists p_write_import_batch on public.import_batch;
create policy p_write_import_batch on public.import_batch for all
  using (auth_role() = 'master_admin') with check (auth_role() = 'master_admin');
