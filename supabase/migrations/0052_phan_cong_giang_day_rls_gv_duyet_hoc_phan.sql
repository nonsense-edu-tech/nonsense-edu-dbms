-- adr004-type: expand
-- 0052 — Phân công giảng dạy (lớp × môn × người), thu hẹp quyền đọc của gv/tro_giang/truong_bm
-- theo lớp được phân công, vòng đời duyệt học phần, RPC tạo người dùng một bước.
--
-- ⚠️ Ghi chú lịch sử (03/10/2026): migration này đã được áp lên production bằng MCP
-- (version 20261003130132) TRƯỚC khi có file này — vi phạm ADR-004. File này là bản ghi
-- nguyên văn nội dung đã áp; bản ghi lịch sử production đã được đổi version → 0052 để parity khớp.
-- Xem docs/adr/ADR-007 về việc migration này có DROP + tạo lại policy p_read (ngoại lệ so với
-- luật "chỉ thêm policy" của ADR-002) và tác động tới code cũ.
-- =====================================================================
-- 1. Bảng phân công giảng dạy (lớp × môn × người)
-- =====================================================================
create table public.phan_cong_giang_day (
  id uuid primary key default uuidv7(),
  user_id uuid not null references public.users(id),
  lop_id uuid not null references public.lop(id),
  mon_hoc_ma smallint not null,
  tu_ngay date not null default current_date,
  den_ngay date,
  nguoi_tao uuid references public.users(id),
  created_at timestamptz not null default now(),
  constraint uq_phan_cong unique (user_id, lop_id, mon_hoc_ma),
  constraint ck_phan_cong_ngay check (den_ngay is null or den_ngay >= tu_ngay)
);
create index idx_phan_cong_lop on public.phan_cong_giang_day (lop_id);
alter table public.phan_cong_giang_day enable row level security;
revoke all on table public.phan_cong_giang_day from anon;

create function public.trg_phan_cong_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_vai_tro text; v_cap smallint;
begin
  select vai_tro into v_vai_tro from users where id = new.user_id and deleted_at is null;
  if v_vai_tro is null or v_vai_tro not in ('gv','tro_giang','truong_bm') then
    raise exception 'Chỉ phân công lớp cho Giáo viên, Trợ giảng hoặc Trưởng bộ môn.';
  end if;
  select cap_hoc_ma into v_cap from lop where id = new.lop_id and deleted_at is null;
  if v_cap is null then raise exception 'Lớp không tồn tại hoặc đã bị xoá.'; end if;
  if not exists (select 1 from mon_hoc where cap_hoc_ma = v_cap and ma = new.mon_hoc_ma and deleted_at is null) then
    raise exception 'Môn học % không hợp lệ với cấp học của lớp.', new.mon_hoc_ma;
  end if;
  if not exists (
    select 1 from user_pham_vi
    where user_id = new.user_id and cap_hoc_ma = v_cap
      and (mon_hoc_ma is null or mon_hoc_ma = new.mon_hoc_ma)
  ) then
    raise exception 'Người dùng chưa được phân môn % (cấp học của lớp) nên không thể phân công lớp này.', new.mon_hoc_ma;
  end if;
  if tg_op = 'INSERT' and new.nguoi_tao is null then new.nguoi_tao := auth.uid(); end if;
  return new;
end $$;
create trigger trg_phan_cong_validate before insert or update on public.phan_cong_giang_day
  for each row execute function public.trg_phan_cong_validate();
revoke all on function public.trg_phan_cong_validate() from public, anon, authenticated;

-- =====================================================================
-- 2. Hàm helper cho RLS
-- =====================================================================
-- Lớp mà vai trò bị giới hạn (gv / tro_giang / truong_bm) được phép thấy.
create function public.lop_trong_pham_vi() returns setof uuid
language sql stable security definer set search_path = public as $$
  select pc.lop_id from phan_cong_giang_day pc
  where (select auth_role()) in ('gv','tro_giang','truong_bm')
    and pc.user_id = (select auth.uid())
    and pc.tu_ngay <= current_date and (pc.den_ngay is null or pc.den_ngay >= current_date)
  union
  select pc.lop_id from phan_cong_giang_day pc
  join lop l on l.id = pc.lop_id
  where (select auth_role()) = 'truong_bm'
    and co_quyen_mon(pc.mon_hoc_ma, l.cap_hoc_ma)
    and pc.tu_ngay <= current_date and (pc.den_ngay is null or pc.den_ngay >= current_date)
$$;

-- Người dùng hiện tại có đang được phân công lớp × môn này không.
create function public.co_phan_cong(p_lop_id uuid, p_mon_hoc_ma smallint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from phan_cong_giang_day pc
    where pc.user_id = (select auth.uid()) and pc.lop_id = p_lop_id and pc.mon_hoc_ma = p_mon_hoc_ma
      and pc.tu_ngay <= current_date and (pc.den_ngay is null or pc.den_ngay >= current_date)
  )
$$;
revoke all on function public.lop_trong_pham_vi() from public, anon;
revoke all on function public.co_phan_cong(uuid, smallint) from public, anon;
grant execute on function public.lop_trong_pham_vi() to authenticated;
grant execute on function public.co_phan_cong(uuid, smallint) to authenticated;

-- RLS của chính bảng phân công
create policy p_read_phan_cong on public.phan_cong_giang_day for select to authenticated using (
  (select auth_role()) in ('master_admin','admin_ht','admin_ts','quan_ly_chi_nhanh')
  or user_id = (select auth.uid())
  or ((select auth_role()) = 'truong_bm' and lop_id in (select lop_trong_pham_vi()))
);
create policy p_insert_phan_cong on public.phan_cong_giang_day for insert to authenticated
  with check ((select auth_role()) in ('master_admin','admin_ht'));
create policy p_update_phan_cong on public.phan_cong_giang_day for update to authenticated
  using ((select auth_role()) in ('master_admin','admin_ht'))
  with check ((select auth_role()) in ('master_admin','admin_ht'));
create policy p_delete_phan_cong on public.phan_cong_giang_day for delete to authenticated
  using ((select auth_role()) in ('master_admin','admin_ht'));

-- =====================================================================
-- 3. Thu hẹp quyền ĐỌC theo lớp cho gv / tro_giang / truong_bm
--    (thay thế policy cũ, không thêm song song vì permissive policy bị OR)
-- =====================================================================
drop policy p_read on public.lop;
create policy p_read on public.lop for select to authenticated using (
  deleted_at is null and (
    (select auth_role()) not in ('gv','tro_giang','truong_bm')
    or id in (select lop_trong_pham_vi())
  )
);

drop policy p_read on public.ghi_danh;
create policy p_read on public.ghi_danh for select to authenticated using (
  deleted_at is null and (
    (select auth_role()) not in ('gv','tro_giang','truong_bm')
    or lop_id in (select lop_trong_pham_vi())
  )
);

-- hoc_sinh: vai trò giới hạn KHÔNG đọc trực tiếp bảng gốc (có SĐT, CCCD...), chỉ qua RPC hoc_sinh_cua_toi
drop policy p_read on public.hoc_sinh;
create policy p_read on public.hoc_sinh for select to authenticated using (
  deleted_at is null and (select auth_role()) not in ('gv','tro_giang','truong_bm')
);

drop policy p_read_buoi_hoc on public.buoi_hoc;
create policy p_read_buoi_hoc on public.buoi_hoc for select to authenticated using (
  deleted_at is null and (
    (select auth_role()) not in ('gv','tro_giang','truong_bm')
    or lop_id in (select lop_trong_pham_vi())
  )
);

-- Phòng học thuộc cụm Vận hành: ẩn với vai trò giới hạn
drop policy p_read_phong_hoc on public.phong_hoc;
create policy p_read_phong_hoc on public.phong_hoc for select to authenticated using (
  deleted_at is null and (select auth_role()) not in ('gv','tro_giang','truong_bm')
);

-- Giáo viên chỉ ghi buổi học của lớp × môn mình được phân công (tách khỏi FOR ALL để không vô tình mở SELECT)
drop policy p_write_buoi_hoc_gv on public.buoi_hoc;
create policy p_insert_buoi_hoc_gv on public.buoi_hoc for insert to authenticated with check (
  (select auth_role()) = 'gv' and gv_id = (select auth.uid()) and co_phan_cong(lop_id, mon_hoc_ma)
);
create policy p_update_buoi_hoc_gv on public.buoi_hoc for update to authenticated
  using ((select auth_role()) = 'gv' and gv_id = (select auth.uid()) and co_phan_cong(lop_id, mon_hoc_ma))
  with check ((select auth_role()) = 'gv' and gv_id = (select auth.uid()) and co_phan_cong(lop_id, mon_hoc_ma));
create policy p_delete_buoi_hoc_gv on public.buoi_hoc for delete to authenticated
  using ((select auth_role()) = 'gv' and gv_id = (select auth.uid()) and co_phan_cong(lop_id, mon_hoc_ma));

-- Đánh giá học sinh: chỉ học sinh thuộc lớp trong phạm vi (ghi_danh đã bị RLS lọc theo invoker)
drop policy p_read_danh_gia on public.danh_gia_hoc_sinh;
drop policy p_write_danh_gia on public.danh_gia_hoc_sinh;
create policy p_read_danh_gia on public.danh_gia_hoc_sinh for select to authenticated using (
  deleted_at is null and (
    (select auth_role()) not in ('gv','tro_giang','truong_bm')
    or exists (select 1 from public.ghi_danh g where g.hoc_sinh_id = danh_gia_hoc_sinh.hoc_sinh_id)
  )
);
create policy p_insert_danh_gia on public.danh_gia_hoc_sinh for insert to authenticated with check (
  (select auth_role()) in ('master_admin','admin_ht')
  or ((select auth_role()) in ('truong_bm','gv')
      and exists (select 1 from public.ghi_danh g where g.hoc_sinh_id = danh_gia_hoc_sinh.hoc_sinh_id))
);
create policy p_update_danh_gia on public.danh_gia_hoc_sinh for update to authenticated
  using (deleted_at is null and (
    (select auth_role()) in ('master_admin','admin_ht')
    or ((select auth_role()) in ('truong_bm','gv')
        and exists (select 1 from public.ghi_danh g where g.hoc_sinh_id = danh_gia_hoc_sinh.hoc_sinh_id))))
  with check (
    (select auth_role()) in ('master_admin','admin_ht')
    or ((select auth_role()) in ('truong_bm','gv')
        and exists (select 1 from public.ghi_danh g where g.hoc_sinh_id = danh_gia_hoc_sinh.hoc_sinh_id)));
create policy p_delete_danh_gia on public.danh_gia_hoc_sinh for delete to authenticated
  using ((select auth_role()) in ('master_admin','admin_ht'));

-- =====================================================================
-- 4. RPC: học sinh trong lớp mình phụ trách — CHỈ tên + mã + lớp
-- =====================================================================
create function public.hoc_sinh_cua_toi(p_lop_id uuid default null)
returns table (hoc_sinh_id uuid, ma_hoc_sinh text, ho_ten text, lop_id uuid, ma_lop text, ten_lop text)
language sql stable security definer set search_path = public as $$
  select hs.id, hs.ma_hoc_sinh::text, hs.ho_ten, l.id, l.ma_lop::text, l.ten_lop
  from ghi_danh g
  join hoc_sinh hs on hs.id = g.hoc_sinh_id
  join lop l on l.id = g.lop_id
  where g.deleted_at is null and g.trang_thai = 'dang_hoc'
    and hs.deleted_at is null and l.deleted_at is null
    and g.lop_id in (select lop_trong_pham_vi())
    and (p_lop_id is null or g.lop_id = p_lop_id)
  order by l.ma_lop, hs.ho_ten
$$;
revoke all on function public.hoc_sinh_cua_toi(uuid) from public, anon;
grant execute on function public.hoc_sinh_cua_toi(uuid) to authenticated;

-- =====================================================================
-- 5. Học phần: vòng đời duyệt (gv tạo → trưởng bộ môn duyệt)
-- =====================================================================
alter table public.hoc_phan
  add column trang_thai text not null default 'da_duyet'
    check (trang_thai in ('cho_duyet','da_duyet','tu_choi')),
  add column nguoi_duyet uuid references public.users(id),
  add column duyet_luc timestamptz,
  add column ly_do_tu_choi text;
alter table public.hoc_phan alter column ma drop not null;
alter table public.hoc_phan add constraint ck_hoc_phan_da_duyet_co_ma
  check (trang_thai <> 'da_duyet' or ma is not null);

create function public.trg_hoc_phan_workflow() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role text := auth_role(); v_next smallint;
begin
  if tg_op = 'INSERT' then
    if new.nguoi_tao is null then new.nguoi_tao := auth.uid(); end if;
  else
    if auth.uid() is not null then
      if new.nguoi_tao is distinct from old.nguoi_tao then
        raise exception 'Không được đổi người tạo học phần.';
      end if;
      if old.trang_thai <> 'da_duyet' and new.trang_thai = 'da_duyet' then
        if old.nguoi_tao is not distinct from auth.uid() then
          raise exception 'Không được tự duyệt học phần do chính mình tạo.';
        end if;
        if v_role not in ('master_admin','admin_ht','truong_bm') then
          raise exception 'Chỉ Trưởng bộ môn hoặc quản trị mới được duyệt học phần.';
        end if;
      end if;
      if old.trang_thai = 'da_duyet' and new.trang_thai <> 'da_duyet' and v_role <> 'master_admin' then
        raise exception 'Học phần đã duyệt không thể chuyển về trạng thái khác.';
      end if;
    end if;
    if old.trang_thai <> 'da_duyet' and new.trang_thai = 'da_duyet' then
      new.nguoi_duyet := auth.uid();
      new.duyet_luc := now();
    end if;
  end if;

  -- Mã học phần (2 số, tuần tự theo cấp học + môn) chỉ cấp khi duyệt → không để lỗ hổng do học phần bị từ chối
  if new.trang_thai = 'da_duyet' and new.ma is null then
    perform pg_advisory_xact_lock(hashtext('hoc_phan_ma:' || new.cap_hoc_ma || ':' || new.mon_hoc_ma));
    select coalesce(max(ma), 0) + 1 into v_next
      from hoc_phan where cap_hoc_ma = new.cap_hoc_ma and mon_hoc_ma = new.mon_hoc_ma;
    if v_next > 99 then raise exception 'Đã hết mã học phần (tối đa 99) cho môn này.'; end if;
    new.ma := v_next;
  end if;
  return new;
end $$;
create trigger trg_hoc_phan_workflow before insert or update on public.hoc_phan
  for each row execute function public.trg_hoc_phan_workflow();
revoke all on function public.trg_hoc_phan_workflow() from public, anon, authenticated;

drop policy p_write on public.hoc_phan;
drop policy p_read on public.hoc_phan;
create policy p_read on public.hoc_phan for select to authenticated using (
  deleted_at is null and (
    trang_thai = 'da_duyet'
    or nguoi_tao = (select auth.uid())
    or (select auth_role()) in ('master_admin','admin_ht')
    or ((select auth_role()) = 'truong_bm' and can_manage_mon_hoc(cap_hoc_ma, mon_hoc_ma))
  )
);
create policy p_insert_hoc_phan on public.hoc_phan for insert to authenticated with check (
  (select auth_role()) = 'master_admin'
  or ((select auth_role()) = 'admin_ht' and can_manage_cap_hoc(cap_hoc_ma))
  or ((select auth_role()) = 'truong_bm' and can_manage_mon_hoc(cap_hoc_ma, mon_hoc_ma))
  or ((select auth_role()) = 'gv' and trang_thai = 'cho_duyet' and ma is null
      and nguoi_tao = (select auth.uid()) and co_quyen_mon(mon_hoc_ma, cap_hoc_ma))
);
create policy p_update_hoc_phan on public.hoc_phan for update to authenticated
  using (deleted_at is null and (
    (select auth_role()) = 'master_admin'
    or ((select auth_role()) = 'admin_ht' and can_manage_cap_hoc(cap_hoc_ma))
    or ((select auth_role()) = 'truong_bm' and can_manage_mon_hoc(cap_hoc_ma, mon_hoc_ma))
    or ((select auth_role()) = 'gv' and nguoi_tao = (select auth.uid())
        and trang_thai in ('cho_duyet','tu_choi') and co_quyen_mon(mon_hoc_ma, cap_hoc_ma))))
  with check (
    (select auth_role()) = 'master_admin'
    or ((select auth_role()) = 'admin_ht' and can_manage_cap_hoc(cap_hoc_ma))
    or ((select auth_role()) = 'truong_bm' and can_manage_mon_hoc(cap_hoc_ma, mon_hoc_ma))
    or ((select auth_role()) = 'gv' and nguoi_tao = (select auth.uid())
        and trang_thai = 'cho_duyet' and nguoi_duyet is null and ma is null
        and co_quyen_mon(mon_hoc_ma, cap_hoc_ma)));
create policy p_delete_hoc_phan on public.hoc_phan for delete to authenticated using (
  (select auth_role()) = 'master_admin'
  or ((select auth_role()) = 'admin_ht' and can_manage_cap_hoc(cap_hoc_ma))
  or ((select auth_role()) = 'truong_bm' and can_manage_mon_hoc(cap_hoc_ma, mon_hoc_ma))
);

-- =====================================================================
-- 6. Bài học: gv tạo trong môn mình phụ trách, dưới học phần ĐÃ DUYỆT, không cần duyệt
-- =====================================================================
create function public.trg_bai_hoc_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_next smallint;
begin
  if new.nguoi_tao is null then new.nguoi_tao := auth.uid(); end if;
  if new.ma is null then
    perform pg_advisory_xact_lock(hashtext('bai_hoc_ma:' || new.hoc_phan_id::text));
    select coalesce(max(ma), 0) + 1 into v_next from bai_hoc where hoc_phan_id = new.hoc_phan_id;
    if v_next > 99 then raise exception 'Đã hết mã bài học (tối đa 99) cho học phần này.'; end if;
    new.ma := v_next;
  end if;
  return new;
end $$;
create trigger trg_bai_hoc_before_insert before insert on public.bai_hoc
  for each row execute function public.trg_bai_hoc_before_insert();
revoke all on function public.trg_bai_hoc_before_insert() from public, anon, authenticated;

drop policy p_write on public.bai_hoc;
create policy p_insert_bai_hoc on public.bai_hoc for insert to authenticated with check (
  (select auth_role()) in ('master_admin','admin_ht','truong_bm')
  or ((select auth_role()) = 'gv' and nguoi_tao = (select auth.uid()) and exists (
        select 1 from public.hoc_phan hp
        where hp.id = bai_hoc.hoc_phan_id and hp.trang_thai = 'da_duyet' and hp.deleted_at is null
          and co_quyen_mon(hp.mon_hoc_ma, hp.cap_hoc_ma)))
);
create policy p_update_bai_hoc on public.bai_hoc for update to authenticated
  using (deleted_at is null and (
    (select auth_role()) in ('master_admin','admin_ht','truong_bm')
    or ((select auth_role()) = 'gv' and (
         nguoi_tao = (select auth.uid())
         or exists (select 1 from public.user_bai_hoc u where u.user_id = (select auth.uid()) and u.bai_hoc_id = bai_hoc.id)))))
  with check (
    (select auth_role()) in ('master_admin','admin_ht','truong_bm')
    or ((select auth_role()) = 'gv' and (
         nguoi_tao = (select auth.uid())
         or exists (select 1 from public.user_bai_hoc u where u.user_id = (select auth.uid()) and u.bai_hoc_id = bai_hoc.id))
        and exists (select 1 from public.hoc_phan hp
                    where hp.id = bai_hoc.hoc_phan_id and hp.trang_thai = 'da_duyet' and hp.deleted_at is null
                      and co_quyen_mon(hp.mon_hoc_ma, hp.cap_hoc_ma))));
create policy p_delete_bai_hoc on public.bai_hoc for delete to authenticated
  using ((select auth_role()) in ('master_admin','admin_ht','truong_bm'));

-- =====================================================================
-- 7. RPC tạo người dùng MỘT BƯỚC (Master Admin)
--    Tài khoản Auth được tạo ở server (service_role); RPC này áp toàn bộ hồ sơ trong 1 transaction.
-- =====================================================================
create function public.master_admin_tao_nguoi_dung(
  p_user_id uuid, p_ho_ten text, p_vai_tro text,
  p_chi_nhanh_ids uuid[] default '{}',
  p_pham_vi jsonb default '[]'::jsonb,
  p_phan_cong jsonb default '[]'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cn_min int; v_pv_mode text; v_pc_ok boolean;
  v_truoc jsonb; e jsonb; v_cap smallint; v_mon smallint; v_lop uuid; v_lop_cn uuid; v_n int;
  v_cn uuid;
begin
  if auth_role() <> 'master_admin' then
    raise exception 'Chỉ Master Admin được tạo người dùng.';
  end if;
  if p_user_id = auth.uid() then raise exception 'Không thể tự cấu hình lại chính mình.'; end if;
  if coalesce(btrim(p_ho_ten), '') = '' then raise exception 'Họ tên không được để trống.'; end if;

  case p_vai_tro
    when 'master_admin'      then v_cn_min := 0; v_pv_mode := 'none'; v_pc_ok := false;
    when 'admin_ts'          then v_cn_min := 0; v_pv_mode := 'none'; v_pc_ok := false;
    when 'ke_toan'           then v_cn_min := 0; v_pv_mode := 'none'; v_pc_ok := false;
    when 'thu_ngan'          then v_cn_min := 0; v_pv_mode := 'none'; v_pc_ok := false;
    when 'quan_ly_chi_nhanh' then v_cn_min := 1; v_pv_mode := 'none'; v_pc_ok := false;
    when 'admin_ht'          then v_cn_min := 1; v_pv_mode := 'cap';  v_pc_ok := false;
    when 'truong_bm'         then v_cn_min := 1; v_pv_mode := 'mon';  v_pc_ok := true;
    when 'gv'                then v_cn_min := 1; v_pv_mode := 'mon';  v_pc_ok := true;
    when 'tro_giang'         then v_cn_min := 1; v_pv_mode := 'mon';  v_pc_ok := true;
    else raise exception 'Vai trò không hợp lệ: %', p_vai_tro;
  end case;

  if coalesce(cardinality(p_chi_nhanh_ids), 0) < v_cn_min then
    raise exception 'Vai trò % bắt buộc phân ít nhất % chi nhánh.', p_vai_tro, v_cn_min;
  end if;
  if p_vai_tro = 'master_admin' and coalesce(cardinality(p_chi_nhanh_ids), 0) > 0 then
    raise exception 'Master Admin không gắn chi nhánh.';
  end if;
  if v_pv_mode = 'none' and jsonb_array_length(coalesce(p_pham_vi, '[]'::jsonb)) > 0 then
    raise exception 'Vai trò % không dùng phạm vi cấp học/môn học.', p_vai_tro;
  end if;
  if v_pv_mode <> 'none' and jsonb_array_length(coalesce(p_pham_vi, '[]'::jsonb)) = 0 then
    raise exception 'Vai trò % bắt buộc phân %.', p_vai_tro, case v_pv_mode when 'cap' then 'cấp học' else 'môn học' end;
  end if;
  if not v_pc_ok and jsonb_array_length(coalesce(p_phan_cong, '[]'::jsonb)) > 0 then
    raise exception 'Vai trò % không được phân lớp.', p_vai_tro;
  end if;

  select to_jsonb(u) into v_truoc from users u where u.id = p_user_id and u.deleted_at is null;
  if v_truoc is null then
    raise exception 'Không tìm thấy tài khoản (id=%). Tài khoản Auth có thể chưa được tạo.', p_user_id;
  end if;
  if exists (select 1 from user_chi_nhanh where user_id = p_user_id)
     or exists (select 1 from user_pham_vi where user_id = p_user_id)
     or exists (select 1 from phan_cong_giang_day where user_id = p_user_id) then
    raise exception 'Tài khoản này đã được thiết lập hồ sơ; hãy dùng chức năng chỉnh sửa.';
  end if;

  update users set ho_ten = btrim(p_ho_ten), vai_tro = p_vai_tro where id = p_user_id;

  foreach v_cn in array coalesce(p_chi_nhanh_ids, '{}') loop
    if not exists (select 1 from chi_nhanh where id = v_cn and deleted_at is null) then
      raise exception 'Chi nhánh không tồn tại: %', v_cn;
    end if;
    insert into user_chi_nhanh (user_id, chi_nhanh_id) values (p_user_id, v_cn)
      on conflict (user_id, chi_nhanh_id) do nothing;
  end loop;

  for e in select * from jsonb_array_elements(coalesce(p_pham_vi, '[]'::jsonb)) loop
    v_cap := (e->>'cap_hoc_ma')::smallint;
    v_mon := nullif(e->>'mon_hoc_ma', '')::smallint;
    if v_pv_mode = 'cap' and v_mon is not null then
      raise exception 'Admin Hiệu trưởng chỉ phân theo cấp học, không phân môn.';
    end if;
    if v_pv_mode = 'mon' and v_mon is null then
      raise exception 'Vai trò % phải phân theo từng môn học.', p_vai_tro;
    end if;
    if v_mon is null then
      insert into user_pham_vi (user_id, cap_hoc_ma, mon_hoc_ma, cap_hoc_id, mon_hoc_id)
        select p_user_id, c.ma, null, c.id, null from cap_hoc c where c.ma = v_cap and c.deleted_at is null;
    else
      insert into user_pham_vi (user_id, cap_hoc_ma, mon_hoc_ma, cap_hoc_id, mon_hoc_id)
        select p_user_id, c.ma, m.ma, c.id, m.id
        from cap_hoc c join mon_hoc m on m.cap_hoc_ma = c.ma
        where c.ma = v_cap and m.ma = v_mon and c.deleted_at is null and m.deleted_at is null;
    end if;
    get diagnostics v_n = row_count;
    if v_n = 0 then raise exception 'Cấp học/môn học không hợp lệ: cấp %, môn %', v_cap, v_mon; end if;
  end loop;

  for e in select * from jsonb_array_elements(coalesce(p_phan_cong, '[]'::jsonb)) loop
    v_lop := (e->>'lop_id')::uuid;
    v_mon := (e->>'mon_hoc_ma')::smallint;
    select chi_nhanh_id into v_lop_cn from lop where id = v_lop and deleted_at is null;
    if not found then raise exception 'Lớp không tồn tại: %', v_lop; end if;
    if v_lop_cn is not null and not (v_lop_cn = any (coalesce(p_chi_nhanh_ids, '{}'))) then
      raise exception 'Lớp % thuộc chi nhánh chưa được phân cho người dùng này.', v_lop;
    end if;
    insert into phan_cong_giang_day (user_id, lop_id, mon_hoc_ma, nguoi_tao)
      values (p_user_id, v_lop, v_mon, auth.uid());   -- trigger kiểm tra môn nằm trong phạm vi đã phân
  end loop;

  insert into nhat_ky (nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau)
  values (auth.uid(), 'master_admin_tao_nguoi_dung', 'users', p_user_id, v_truoc,
          jsonb_build_object('ho_ten', btrim(p_ho_ten), 'vai_tro', p_vai_tro,
                             'chi_nhanh_ids', p_chi_nhanh_ids, 'pham_vi', p_pham_vi, 'phan_cong', p_phan_cong));
end $$;
revoke all on function public.master_admin_tao_nguoi_dung(uuid, text, text, uuid[], jsonb, jsonb) from public, anon;
grant execute on function public.master_admin_tao_nguoi_dung(uuid, text, text, uuid[], jsonb, jsonb) to authenticated;
