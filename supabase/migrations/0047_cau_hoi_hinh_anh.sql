-- adr004-type: expand
-- =============================================================================
-- HÌNH ẢNH ĐÍNH KÈM CÂU HỎI (đề bài / lời giải / từng lựa chọn)
--
-- Migration EXPAND (ADR-004 luật 3): chỉ THÊM bảng + bucket + policy mới, không
-- đụng cột/policy đang chạy → code cũ trên production chạy bình thường.
--
-- - Bảng `cau_hoi_hinh_anh` (PK UUIDv7 theo ADR-003) lưu metadata; file thật nằm
--   trong Storage bucket private `hinh-cau-hoi` (xem ảnh qua signed URL).
-- - Ảnh của lựa chọn gắn theo VỊ TRÍ (`thu_tu_lua_chon`), KHÔNG FK sang
--   `lua_chon.id`, vì khi sửa câu hỏi hệ thống xoá rồi chèn lại toàn bộ
--   `lua_chon` (id đổi) — FK sẽ làm mất ảnh.
-- - RLS: cùng nhóm vai trò với `lua_chon` (đọc: master_admin/admin_ht/truong_bm
--   + gv trong phạm vi môn; ghi: master_admin/admin_ht/truong_bm/gv). Chỉ thêm
--   policy mới, không sửa policy cũ (ADR-002).
-- =============================================================================

create table if not exists public.cau_hoi_hinh_anh (
    id               uuid primary key default public.uuidv7(),
    cau_hoi_id       uuid not null references public.cau_hoi(id) on delete cascade,
    vi_tri           text not null check (vi_tri in ('de', 'loi_giai', 'lua_chon')),
    thu_tu_lua_chon  smallint check (thu_tu_lua_chon >= 1),
    thu_tu           smallint not null default 1 check (thu_tu >= 1),
    duong_dan        text not null unique,
    loai_mime        text not null check (loai_mime in ('image/jpeg', 'image/png', 'image/webp')),
    kich_thuoc       integer not null check (kich_thuoc > 0 and kich_thuoc <= 2097152),
    alt_text         text,
    nguoi_tao        uuid references auth.users(id),
    created_at       timestamptz not null default now(),
    -- Ảnh lựa chọn bắt buộc có vị trí lựa chọn; ảnh đề/lời giải thì không.
    constraint chk_hinh_anh_vi_tri_lua_chon check ((vi_tri = 'lua_chon') = (thu_tu_lua_chon is not null))
);

create index if not exists idx_cau_hoi_hinh_anh_cau_hoi on public.cau_hoi_hinh_anh (cau_hoi_id);

grant select, insert, update, delete on public.cau_hoi_hinh_anh to authenticated;

alter table public.cau_hoi_hinh_anh enable row level security;

drop policy if exists p_read on public.cau_hoi_hinh_anh;
create policy p_read on public.cau_hoi_hinh_anh for select to authenticated
    using (
        exists (
            select 1 from public.cau_hoi c
            where c.id = cau_hoi_hinh_anh.cau_hoi_id
              and c.deleted_at is null
              and (
                  auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm'])
                  or (auth_role() = 'gv' and co_quyen_mon(c.mon_hoc, c.cap_hoc))
              )
        )
    );

drop policy if exists p_write_insert on public.cau_hoi_hinh_anh;
create policy p_write_insert on public.cau_hoi_hinh_anh for insert to authenticated
    with check (auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']));

drop policy if exists p_write_update on public.cau_hoi_hinh_anh;
create policy p_write_update on public.cau_hoi_hinh_anh for update to authenticated
    using (auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']))
    with check (auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']));

drop policy if exists p_write_delete on public.cau_hoi_hinh_anh;
create policy p_write_delete on public.cau_hoi_hinh_anh for delete to authenticated
    using (auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']));

-- Storage bucket private, 2MB/ảnh, chỉ jpg/png/webp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hinh-cau-hoi', 'hinh-cau-hoi', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists p_read_hinh_cau_hoi on storage.objects;
create policy p_read_hinh_cau_hoi on storage.objects for select
    using (bucket_id = 'hinh-cau-hoi' and auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']));

drop policy if exists p_insert_hinh_cau_hoi on storage.objects;
create policy p_insert_hinh_cau_hoi on storage.objects for insert
    with check (bucket_id = 'hinh-cau-hoi' and auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']));

drop policy if exists p_delete_hinh_cau_hoi on storage.objects;
create policy p_delete_hinh_cau_hoi on storage.objects for delete
    using (bucket_id = 'hinh-cau-hoi' and auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']));
