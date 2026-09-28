-- adr004-type: expand
-- 0042_module_quan_ly_nguoi_dung.sql
-- Module "Quản lý người dùng" (CRUD tài khoản nội bộ) — Khối 1.
-- Toàn bộ thay đổi dưới đây là Expand thuần (ADR-004 luật (c)): chỉ thêm
-- cột/bảng/hàm/policy mới — không đổi/xoá gì code cũ đang chạy còn phụ thuộc.
-- Không tự áp file này lên production qua MCP/SQL Editor — chỉ merge vào
-- main, để pipeline CI (ADR-005, tag expand) xử lý qua gate GitHub
-- Environment "production-db".

begin;

-- 1) Cờ bắt đổi mật khẩu ở lần đăng nhập đầu -------------------------------
alter table public.users
  add column if not exists phai_doi_mat_khau boolean not null default true;

-- 2 tài khoản đang dùng thật hôm nay không bị ép đổi mật khẩu ngay lập tức;
-- mọi tài khoản tạo MỚI từ module này sau đây sẽ có cờ = true theo default.
update public.users set phai_doi_mat_khau = false where phai_doi_mat_khau is distinct from false;

-- (Đã khảo sát user_chi_nhanh.id_old tưởng là NOT NULL thiếu default — hoá
-- ra là cột GENERATED ALWAYS AS IDENTITY, tự sinh giá trị bình thường, không
-- có lỗi gì thật. Xác nhận lại bằng dry-run migration này trong transaction
-- ROLLBACK trên production 28/09/2026 trước khi merge — không có thay đổi
-- nào ở đây.)

-- 2) Bảng nhật ký chung (append-only), theo đúng mẫu nhat_ky_tai_chinh đã có
--    (ghi trực tiếp từ code qua RLS INSERT theo vai trò, không qua trigger).
create table if not exists public.nhat_ky (
  id uuid primary key default uuidv7(),
  nguoi_dung_id uuid references public.users(id),
  hanh_dong text not null,
  doi_tuong text not null,
  doi_tuong_id uuid,
  truoc jsonb,
  sau jsonb,
  created_at timestamptz not null default now()
);

alter table public.nhat_ky enable row level security;

create policy p_read_nhat_ky on public.nhat_ky
  for select
  using (auth_role() = 'master_admin');

create policy p_insert_nhat_ky on public.nhat_ky
  for insert
  with check (auth_role() = any (array['master_admin', 'admin_ht']));

-- 3) Tách p_write của users (đang FOR ALL) thành INSERT/UPDATE riêng, và bỏ
--    hẳn quyền DELETE cứng qua REST (không tạo policy DELETE nào cho ai cả)
--    — quyết định "không xoá cứng bất kỳ account nào" (28/09/2026). Theo
--    đúng bài học Khối 5: FOR ALL từng âm thầm áp cho cả SELECT.
drop policy if exists p_write on public.users;

create policy p_insert_users on public.users
  for insert
  with check (auth_role() = 'master_admin');

create policy p_update_users on public.users
  for update
  using (auth_role() = 'master_admin')
  with check (auth_role() = 'master_admin');

-- 4) Trigger bảo vệ ở tầng CSDL (không dựa vào quy ước UI, đúng bài học vụ
--    tự duyệt hợp đồng học phí):
--    - Chặn 1 master_admin tự đổi vai_tro của chính mình.
--    - Chặn hạ vai trò / khoá / xoá mềm master_admin CUỐI CÙNG còn hoạt động.
create or replace function public.chan_mat_master_admin_cuoi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.vai_tro = 'master_admin' and old.id = auth.uid() and new.vai_tro <> 'master_admin' then
    raise exception 'Không thể tự đổi vai trò của chính mình khỏi Master Admin.';
  end if;

  if old.vai_tro = 'master_admin'
     and old.trang_thai = 'active'
     and old.deleted_at is null
     and (new.vai_tro <> 'master_admin' or new.trang_thai <> 'active' or new.deleted_at is not null)
  then
    if not exists (
      select 1 from public.users
      where vai_tro = 'master_admin' and trang_thai = 'active' and deleted_at is null and id <> old.id
    ) then
      raise exception 'Không thể hạ vai trò/khoá/xoá Master Admin cuối cùng còn hoạt động.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_chan_mat_master_admin_cuoi on public.users;
create trigger trg_chan_mat_master_admin_cuoi
  before update on public.users
  for each row
  execute function public.chan_mat_master_admin_cuoi();

-- 5) RPC cho admin_ht: hoàn tất hồ sơ + gán chi nhánh cho tài khoản GV/Trợ
--    giảng MỚI, chỉ khi chi nhánh đích nằm trong user_chi_nhanh của chính
--    admin_ht đang gọi — kiểm tra ngay trong hàm (SECURITY DEFINER), không
--    dựa vào quy ước UI hay tầng ứng dụng. Tài khoản Auth (auth.users) phải
--    được tạo TRƯỚC qua Admin API ở tầng server (service role) — hàm này
--    chạy bằng chính phiên đăng nhập của admin_ht, không cần service role.
create or replace function public.admin_ht_tao_nhan_su(
  p_user_id uuid,
  p_ho_ten text,
  p_vai_tro text,
  p_chi_nhanh_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_truoc jsonb;
begin
  if auth_role() <> 'admin_ht' then
    raise exception 'Chỉ Admin Hiệu trưởng được dùng chức năng này.';
  end if;

  if p_vai_tro not in ('gv', 'tro_giang') then
    raise exception 'Admin Hiệu trưởng chỉ được cấp tài khoản Giáo viên hoặc Trợ giảng.';
  end if;

  if not exists (
    select 1 from public.user_chi_nhanh
    where user_id = auth.uid() and chi_nhanh_id = p_chi_nhanh_id
  ) then
    raise exception 'Bạn không quản lý chi nhánh này.';
  end if;

  select to_jsonb(u) into v_truoc from public.users u where u.id = p_user_id;
  if v_truoc is null then
    raise exception 'Không tìm thấy tài khoản (id=%). Tài khoản Auth có thể chưa được tạo.', p_user_id;
  end if;

  update public.users
  set ho_ten = p_ho_ten, vai_tro = p_vai_tro
  where id = p_user_id;

  insert into public.user_chi_nhanh (user_id, chi_nhanh_id)
  values (p_user_id, p_chi_nhanh_id)
  on conflict (user_id, chi_nhanh_id) do nothing;

  insert into public.nhat_ky (nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau)
  values (
    auth.uid(), 'admin_ht_tao_nhan_su', 'users', p_user_id, v_truoc,
    jsonb_build_object('ho_ten', p_ho_ten, 'vai_tro', p_vai_tro, 'chi_nhanh_id', p_chi_nhanh_id)
  );
end;
$$;

revoke all on function public.admin_ht_tao_nhan_su(uuid, text, text, uuid) from public, anon;
grant execute on function public.admin_ht_tao_nhan_su(uuid, text, text, uuid) to authenticated;

-- 6) RPC cho MỌI người dùng tự tắt cờ "bắt đổi mật khẩu" của CHÍNH mình, sau
--    khi đã đổi mật khẩu thật qua Supabase Auth (supabase.auth.updateUser).
--    Cần SECURITY DEFINER vì p_update_users chỉ cho phép master_admin UPDATE
--    bảng users — RLS ở mức dòng không tách được cột nào được phép đổi, nên
--    tách hẳn hành động hẹp này ra một hàm riêng thay vì nới UPDATE chung.
create or replace function public.danh_dau_da_doi_mat_khau()
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set phai_doi_mat_khau = false where id = auth.uid();
$$;

revoke all on function public.danh_dau_da_doi_mat_khau() from public, anon;
grant execute on function public.danh_dau_da_doi_mat_khau() to authenticated;

commit;
