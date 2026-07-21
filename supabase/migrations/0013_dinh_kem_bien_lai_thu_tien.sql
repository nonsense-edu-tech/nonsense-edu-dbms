-- =============================================================================
-- ĐÍNH KÈM BIÊN LAI CHO PHIẾU THU — tối đa 2 file (jpg/png/heic/pdf).
--
-- phieu_thu vốn chỉ có 1 slot (tep_dinh_kem_id). Thêm slot thứ 2
-- (tep_dinh_kem_id_2) thay vì dựng bảng nối M-N, vì giới hạn cứng "tối đa 2"
-- không cần mô hình quan hệ nhiều-nhiều đầy đủ.
--
-- Tạo Storage bucket riêng (private) cho biên lai + RLS trên storage.objects,
-- cùng nhóm vai trò với phieu_thu/tep_dinh_kem (master_admin, ke_toan,
-- thu_ngan, admin_ts). File giới hạn 10MB, đúng 4 mime type theo
-- tep_dinh_kem_loai_mime_check đã có.
-- =============================================================================

alter table phieu_thu
    add column if not exists tep_dinh_kem_id_2 bigint references tep_dinh_kem(id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bien-lai', 'bien-lai', false, 10485760, array['image/jpeg','image/png','image/heic','application/pdf'])
on conflict (id) do nothing;

drop policy if exists p_read_bien_lai on storage.objects;
create policy p_read_bien_lai on storage.objects for select
    using (bucket_id = 'bien-lai' and auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));

drop policy if exists p_insert_bien_lai on storage.objects;
create policy p_insert_bien_lai on storage.objects for insert
    with check (bucket_id = 'bien-lai' and auth_role() = any (array['master_admin','ke_toan','thu_ngan','admin_ts']));
