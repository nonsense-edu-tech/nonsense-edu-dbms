-- adr004-type: expand
-- 0055 — Quy trình đề xuất → phê duyệt khi chỉnh sửa hợp đồng học phí (Admin Tuyển sinh đề xuất, Master Admin duyệt).
--
-- Quy trình (05/10/2026):
--   1) Admin Tuyển sinh (admin_ts) đề xuất chỉnh sửa, BẮT BUỘC nêu lý do  → de_xuat_sua_hop_dong
--   2) Master Admin xem xét, PHÊ DUYỆT hoặc TỪ CHỐI, BẮT BUỘC nêu lý do   → xu_ly_yeu_cau_sua_hop_dong
--      (duyệt = áp thay đổi vào hợp đồng qua sua_hop_dong_master của 0054, nên hợp đồng cũng có nhật ký riêng)
--   3) Người đề xuất có thể rút yêu cầu đang chờ                          → rut_yeu_cau_sua_hop_dong
--   Mọi bước đều ghi nhat_ky (doi_tuong = 'yeu_cau_sua_hop_dong') bằng trigger.
--
-- Chốt chặn ở DB (không chỉ ở giao diện):
--   * Bảng yeu_cau_sua_hop_dong chỉ ghi được qua 3 hàm SECURITY DEFINER; client không có quyền INSERT/UPDATE/DELETE.
--     Yêu cầu đã xử lý là bất biến; không xoá được.
--   * Trigger chặn người dùng đăng nhập sửa trực tiếp các cột tài chính của hợp đồng đã qua trạng thái nháp
--     (giá niêm yết, giảm giá, doanh thu thuần, hình thức đóng, gói) — chỉ đi qua sua_hop_dong_master. Hợp đồng
--     nháp vẫn tự do sửa. SQL Editor/service role (không có JWT) không bị chặn nhưng vẫn được trigger nhật ký ghi lại.
--   * Duyệt kiểm tra hợp đồng chưa bị đổi kể từ lúc đề xuất (tránh duyệt đè lên số liệu đã khác).
--
-- Phụ thuộc: 0054 (nhat_ky.ly_do, sua_hop_dong_master, chuan_hoa_thong_so_hop_dong, trigger nhật ký hợp đồng).
-- Expand: bảng/hàm/trigger mới; trigger chặn chỉ siết đường sửa tài chính hợp đồng không-nháp (code hiện tại không có
-- đường nào làm việc này). Idempotent.

-- 1) Bảng yêu cầu --------------------------------------------------------------------------------------------
create table if not exists public.yeu_cau_sua_hop_dong (
  id                 uuid primary key default uuidv7(),
  hop_dong_id        uuid not null references public.hop_dong_hoc_phi(id),
  nguoi_de_xuat      uuid not null references public.users(id),
  ly_do_de_xuat      text not null check (char_length(btrim(ly_do_de_xuat)) >= 5),
  truoc              jsonb not null,                       -- ảnh chụp giá trị hợp đồng lúc đề xuất
  gia_niem_yet       bigint not null check (gia_niem_yet >= 0),
  loai_giam_gia      text not null check (loai_giam_gia in ('khong', 'phan_tram', 'co_dinh')),
  gia_tri_giam_gia   bigint not null default 0 check (gia_tri_giam_gia >= 0),
  hinh_thuc_dong     text not null check (hinh_thuc_dong in ('mot_lan', 'hang_thang', 'hang_quy', 'tra_gop')),
  ghi_chu            text,
  trang_thai         text not null default 'cho_duyet' check (trang_thai in ('cho_duyet', 'da_duyet', 'tu_choi', 'da_rut')),
  nguoi_xu_ly        uuid references public.users(id),
  xu_ly_luc          timestamptz,
  ly_do_xu_ly        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint chk_yc_sua_hd_xu_ly check (
    (trang_thai = 'cho_duyet' and nguoi_xu_ly is null and xu_ly_luc is null)
    or (trang_thai <> 'cho_duyet' and nguoi_xu_ly is not null and xu_ly_luc is not null)
  ),
  constraint chk_yc_sua_hd_ly_do_xu_ly check (
    trang_thai in ('cho_duyet', 'da_rut') or char_length(btrim(coalesce(ly_do_xu_ly, ''))) >= 5
  )
);

-- Mỗi hợp đồng chỉ có tối đa 1 yêu cầu đang chờ duyệt.
create unique index if not exists uq_yc_sua_hd_cho_duyet
  on public.yeu_cau_sua_hop_dong (hop_dong_id) where trang_thai = 'cho_duyet';
create index if not exists idx_yc_sua_hd_trang_thai on public.yeu_cau_sua_hop_dong (trang_thai, created_at desc);
create index if not exists idx_yc_sua_hd_hop_dong on public.yeu_cau_sua_hop_dong (hop_dong_id, created_at desc);

alter table public.yeu_cau_sua_hop_dong enable row level security;

-- Chỉ ĐỌC trực tiếp; mọi ghi đi qua hàm SECURITY DEFINER bên dưới.
drop policy if exists p_read_yc_sua_hop_dong on public.yeu_cau_sua_hop_dong;
create policy p_read_yc_sua_hop_dong on public.yeu_cau_sua_hop_dong for select
  using (auth_role() = any (array['master_admin', 'ke_toan', 'thu_ngan', 'admin_ts']));

revoke insert, update, delete, truncate on public.yeu_cau_sua_hop_dong from public, anon, authenticated;

drop trigger if exists trg_yc_sua_hd_set_updated_at on public.yeu_cau_sua_hop_dong;
create trigger trg_yc_sua_hd_set_updated_at
  before update on public.yeu_cau_sua_hop_dong
  for each row execute function public.set_updated_at();

-- 2) Bất biến: không xoá; yêu cầu đã xử lý không sửa; lõi đề xuất không đổi ------------------------------------
create or replace function public.chan_sua_yeu_cau_sua_hop_dong()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Yêu cầu chỉnh sửa hợp đồng không được xoá (giữ làm vết).';
  end if;
  if old.trang_thai <> 'cho_duyet' then
    raise exception 'Yêu cầu đã được xử lý, không sửa được.';
  end if;
  if new.hop_dong_id is distinct from old.hop_dong_id
     or new.nguoi_de_xuat is distinct from old.nguoi_de_xuat
     or new.ly_do_de_xuat is distinct from old.ly_do_de_xuat
     or new.truoc is distinct from old.truoc
     or new.gia_niem_yet is distinct from old.gia_niem_yet
     or new.loai_giam_gia is distinct from old.loai_giam_gia
     or new.gia_tri_giam_gia is distinct from old.gia_tri_giam_gia
     or new.hinh_thuc_dong is distinct from old.hinh_thuc_dong
     or new.ghi_chu is distinct from old.ghi_chu then
    raise exception 'Nội dung đề xuất không được sửa sau khi gửi — hãy rút và gửi đề xuất mới.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_yc_sua_hd_bat_bien on public.yeu_cau_sua_hop_dong;
create trigger trg_yc_sua_hd_bat_bien
  before update or delete on public.yeu_cau_sua_hop_dong
  for each row execute function public.chan_sua_yeu_cau_sua_hop_dong();

-- 3) Nhật ký vòng đời yêu cầu -----------------------------------------------------------------------------------
create or replace function public.ghi_nhat_ky_yeu_cau_sua_hop_dong()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_hanh  text;
  v_nguoi uuid;
begin
  if tg_op = 'INSERT' then
    select u.id into v_nguoi from public.users u where u.id = new.nguoi_de_xuat;
    insert into public.nhat_ky (nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau, ly_do)
    values (v_nguoi, 'de_xuat_sua_hop_dong', 'yeu_cau_sua_hop_dong', new.id, new.truoc,
            jsonb_build_object('hop_dong_id', new.hop_dong_id, 'trang_thai', new.trang_thai,
                               'gia_niem_yet', new.gia_niem_yet, 'loai_giam_gia', new.loai_giam_gia,
                               'gia_tri_giam_gia', new.gia_tri_giam_gia, 'hinh_thuc_dong', new.hinh_thuc_dong,
                               'ghi_chu', new.ghi_chu),
            new.ly_do_de_xuat);
    return new;
  end if;

  if new.trang_thai is not distinct from old.trang_thai then
    return new;
  end if;
  v_hanh := case new.trang_thai
              when 'da_duyet' then 'duyet_yeu_cau_sua_hop_dong'
              when 'tu_choi'  then 'tu_choi_yeu_cau_sua_hop_dong'
              when 'da_rut'   then 'rut_yeu_cau_sua_hop_dong'
              else 'cap_nhat_yeu_cau_sua_hop_dong'
            end;
  select u.id into v_nguoi from public.users u where u.id = new.nguoi_xu_ly;
  insert into public.nhat_ky (nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau, ly_do)
  values (v_nguoi, v_hanh, 'yeu_cau_sua_hop_dong', new.id,
          jsonb_build_object('trang_thai', old.trang_thai),
          jsonb_build_object('hop_dong_id', new.hop_dong_id, 'trang_thai', new.trang_thai),
          nullif(btrim(coalesce(new.ly_do_xu_ly, '')), ''));
  return new;
end;
$$;

drop trigger if exists trg_yc_sua_hd_ghi_nhat_ky on public.yeu_cau_sua_hop_dong;
create trigger trg_yc_sua_hd_ghi_nhat_ky
  after insert or update on public.yeu_cau_sua_hop_dong
  for each row execute function public.ghi_nhat_ky_yeu_cau_sua_hop_dong();

-- 4) Chặn sửa trực tiếp các cột tài chính của hợp đồng ngoài quy trình -----------------------------------------
create or replace function public.chan_sua_tai_chinh_hop_dong()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  -- Chỉ áp cho người dùng đăng nhập (có JWT); SQL Editor/service role không có auth.uid().
  if auth.uid() is not null
     and coalesce(current_setting('app.nguon', true), '') <> 'sua_master'
     and old.trang_thai <> 'nhap'
     and (new.gia_niem_yet     is distinct from old.gia_niem_yet
       or new.loai_giam_gia    is distinct from old.loai_giam_gia
       or new.gia_tri_giam_gia is distinct from old.gia_tri_giam_gia
       or new.so_tien_giam     is distinct from old.so_tien_giam
       or new.doanh_thu_thuan  is distinct from old.doanh_thu_thuan
       or new.hinh_thuc_dong   is distinct from old.hinh_thuc_dong
       or new.goi_hoc_phi_id   is distinct from old.goi_hoc_phi_id) then
    raise exception 'Thay đổi giá, giảm giá hoặc hình thức đóng của hợp đồng phải được đề xuất và Master Admin phê duyệt.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hop_dong_chan_sua_tai_chinh on public.hop_dong_hoc_phi;
create trigger trg_hop_dong_chan_sua_tai_chinh
  before update on public.hop_dong_hoc_phi
  for each row execute function public.chan_sua_tai_chinh_hop_dong();

-- 5) Admin Tuyển sinh đề xuất ---------------------------------------------------------------------------------
create or replace function public.de_xuat_sua_hop_dong(
  p_hop_dong_id       uuid,
  p_gia_niem_yet      bigint,
  p_loai_giam_gia     text,
  p_gia_tri_giam_gia  bigint,
  p_hinh_thuc_dong    text,
  p_ghi_chu           text,
  p_ly_do             text
) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  r         public.hop_dong_hoc_phi%rowtype;
  v_gia_tri bigint;
  v_giam    bigint;
  v_ghi_chu text := nullif(btrim(coalesce(p_ghi_chu, '')), '');
  v_id      uuid;
begin
  if auth_role() is distinct from 'admin_ts' then
    raise exception 'Chỉ Admin Tuyển sinh được đề xuất chỉnh sửa hợp đồng (Master Admin sửa trực tiếp).';
  end if;
  if p_ly_do is null or char_length(btrim(p_ly_do)) < 5 then
    raise exception 'Cần nêu lý do đề xuất (tối thiểu 5 ký tự).';
  end if;

  select * into r from public.hop_dong_hoc_phi where id = p_hop_dong_id and deleted_at is null for update;
  if not found then
    raise exception 'Không tìm thấy hợp đồng.';
  end if;
  if r.trang_thai = 'da_huy' then
    raise exception 'Hợp đồng đã huỷ, không đề xuất sửa được.';
  end if;

  select o_gia_tri, o_so_tien_giam into v_gia_tri, v_giam
    from public.chuan_hoa_thong_so_hop_dong(p_gia_niem_yet, p_loai_giam_gia, p_gia_tri_giam_gia, p_hinh_thuc_dong);

  if r.gia_niem_yet = p_gia_niem_yet
     and r.loai_giam_gia = p_loai_giam_gia
     and r.gia_tri_giam_gia = v_gia_tri
     and r.hinh_thuc_dong = p_hinh_thuc_dong
     and r.ghi_chu is not distinct from v_ghi_chu then
    raise exception 'Đề xuất không khác gì hợp đồng hiện tại.';
  end if;

  begin
    insert into public.yeu_cau_sua_hop_dong
      (hop_dong_id, nguoi_de_xuat, ly_do_de_xuat, truoc,
       gia_niem_yet, loai_giam_gia, gia_tri_giam_gia, hinh_thuc_dong, ghi_chu)
    values
      (p_hop_dong_id, auth.uid(), btrim(p_ly_do),
       jsonb_build_object('gia_niem_yet', r.gia_niem_yet, 'loai_giam_gia', r.loai_giam_gia,
                          'gia_tri_giam_gia', r.gia_tri_giam_gia, 'so_tien_giam', r.so_tien_giam,
                          'doanh_thu_thuan', r.doanh_thu_thuan, 'hinh_thuc_dong', r.hinh_thuc_dong,
                          'ghi_chu', r.ghi_chu),
       p_gia_niem_yet, p_loai_giam_gia, v_gia_tri, p_hinh_thuc_dong, v_ghi_chu)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Hợp đồng này đang có một yêu cầu chờ duyệt. Hãy rút yêu cầu cũ hoặc đợi Master Admin xử lý.';
  end;

  return v_id;
end;
$$;

-- 6) Master Admin phê duyệt / từ chối ----------------------------------------------------------------------------
create or replace function public.xu_ly_yeu_cau_sua_hop_dong(
  p_id     uuid,
  p_quyet  text,      -- 'duyet' | 'tu_choi'
  p_ly_do  text
) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  y        public.yeu_cau_sua_hop_dong%rowtype;
  h        public.hop_dong_hoc_phi%rowtype;
  v_ket_qua jsonb := '{}'::jsonb;
begin
  if auth_role() is distinct from 'master_admin' then
    raise exception 'Chỉ Master Admin được phê duyệt hoặc từ chối yêu cầu.';
  end if;
  if p_quyet is null or p_quyet not in ('duyet', 'tu_choi') then
    raise exception 'Quyết định không hợp lệ.';
  end if;
  if p_ly_do is null or char_length(btrim(p_ly_do)) < 5 then
    raise exception 'Cần nêu lý do % (tối thiểu 5 ký tự).', case p_quyet when 'duyet' then 'phê duyệt' else 'từ chối' end;
  end if;

  select * into y from public.yeu_cau_sua_hop_dong where id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy yêu cầu.';
  end if;
  if y.trang_thai <> 'cho_duyet' then
    raise exception 'Yêu cầu này đã được xử lý.';
  end if;

  if p_quyet = 'duyet' then
    select * into h from public.hop_dong_hoc_phi where id = y.hop_dong_id and deleted_at is null for update;
    if not found then
      raise exception 'Hợp đồng không còn tồn tại.';
    end if;
    -- Hợp đồng phải còn nguyên như lúc đề xuất.
    if h.gia_niem_yet <> (y.truoc ->> 'gia_niem_yet')::bigint
       or h.loai_giam_gia <> (y.truoc ->> 'loai_giam_gia')
       or h.gia_tri_giam_gia <> (y.truoc ->> 'gia_tri_giam_gia')::bigint
       or h.hinh_thuc_dong <> (y.truoc ->> 'hinh_thuc_dong')
       or h.ghi_chu is distinct from (y.truoc ->> 'ghi_chu') then
      raise exception 'Hợp đồng đã thay đổi kể từ lúc đề xuất. Hãy từ chối yêu cầu này và đề nghị gửi đề xuất mới.';
    end if;

    perform set_config('app.yeu_cau_id', y.id::text, true);
    v_ket_qua := public.sua_hop_dong_master(
      y.hop_dong_id, y.gia_niem_yet, y.loai_giam_gia, y.gia_tri_giam_gia, y.hinh_thuc_dong, y.ghi_chu,
      'Theo yêu cầu ' || y.id::text || ' — lý do đề xuất: ' || y.ly_do_de_xuat || ' — lý do phê duyệt: ' || btrim(p_ly_do));
  end if;

  update public.yeu_cau_sua_hop_dong
     set trang_thai  = case p_quyet when 'duyet' then 'da_duyet' else 'tu_choi' end,
         nguoi_xu_ly = auth.uid(),
         xu_ly_luc   = now(),
         ly_do_xu_ly = btrim(p_ly_do)
   where id = p_id;

  return v_ket_qua;
end;
$$;

-- 7) Người đề xuất rút yêu cầu đang chờ -------------------------------------------------------------------------
create or replace function public.rut_yeu_cau_sua_hop_dong(p_id uuid)
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  y public.yeu_cau_sua_hop_dong%rowtype;
begin
  select * into y from public.yeu_cau_sua_hop_dong where id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy yêu cầu.';
  end if;
  if y.nguoi_de_xuat is distinct from auth.uid() then
    raise exception 'Chỉ người đã đề xuất mới được rút yêu cầu.';
  end if;
  if y.trang_thai <> 'cho_duyet' then
    raise exception 'Yêu cầu này đã được xử lý, không rút được.';
  end if;
  update public.yeu_cau_sua_hop_dong
     set trang_thai = 'da_rut', nguoi_xu_ly = auth.uid(), xu_ly_luc = now()
   where id = p_id;
end;
$$;

revoke all on function public.de_xuat_sua_hop_dong(uuid, bigint, text, bigint, text, text, text) from public, anon;
revoke all on function public.xu_ly_yeu_cau_sua_hop_dong(uuid, text, text) from public, anon;
revoke all on function public.rut_yeu_cau_sua_hop_dong(uuid) from public, anon;
grant execute on function public.de_xuat_sua_hop_dong(uuid, bigint, text, bigint, text, text, text) to authenticated;
grant execute on function public.xu_ly_yeu_cau_sua_hop_dong(uuid, text, text) to authenticated;
grant execute on function public.rut_yeu_cau_sua_hop_dong(uuid) to authenticated;
