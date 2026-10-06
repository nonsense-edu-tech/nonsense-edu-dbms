-- adr004-type: expand
-- 0059 — Giai đoạn hợp đồng học phí (lớp dài >12 tháng: mỗi giai đoạn có giá, kỳ đóng, giảm giá, doanh thu riêng).
--
-- Bối cảnh (06/10/2026): lớp Nội trú có thể kéo dài 12/24 tháng. Học viên đóng theo giai đoạn (vd 50 triệu năm 1,
-- 60 triệu năm 2) và có thể nghỉ sau giai đoạn 1. Mô hình tham khảo trường đại học: cam kết & ghi nhận doanh thu
-- theo từng "kỳ", kỳ sau chỉ phát sinh khi kỳ trước xong. Quyết định đã chốt (phương án B):
--   * MỘT hợp đồng cho mỗi học viên (giữ chỉ mục uq_hop_dong_mo_theo_ghi_danh, quy trình sửa/tất toán/nhật ký cũ).
--   * Hợp đồng chia thành các giai đoạn (hop_dong_giai_doan); giá niêm yết/giảm giá/doanh thu thuần của HỢP ĐỒNG
--     luôn = tổng các giai đoạn. Giai đoạn chưa kích hoạt chỉ có "giá dự kiến", KHÔNG tính vào công nợ/doanh thu.
--   * Ranh giới giai đoạn: hết 12 tháng đầu của lớp -> TỰ kích hoạt giai đoạn 2, trừ khi admin đóng giai đoạn
--     (cho cả lớp hoặc riêng từng học viên). Học bổng/giảm giá áp riêng từng giai đoạn.
--   * Lớp vẫn là MỘT lớp (giữ tên, tiến độ buổi học); giai đoạn chỉ chia phí & doanh thu.
--
-- Gồm: (1) lop_giai_doan, (2) hop_dong_giai_doan, (3) ky_dong_hoc_phi.giai_doan_so, (4) trigger tự tạo/đồng bộ giai đoạn
-- khi hợp đồng được tạo/sửa bằng code cũ, (5) RPC: tao_giai_doan_lop, dat_gia_giai_doan_lop, kich_hoat_giai_doan,
-- dong_giai_doan, dong_giai_doan_lop và hàm tự động kich_hoat_giai_doan_den_han (gọi hằng ngày bằng service role),
-- (6) backfill: mọi hợp đồng hiện có = 1 giai đoạn.
-- Expand/tương thích ngược: chỉ thêm bảng/cột nullable/hàm; trigger đổi chỉ nới thêm nguồn 'giai_doan'. Không sửa policy cũ.

-- 1) lop_giai_doan -----------------------------------------------------------------------------------------------
create table if not exists public.lop_giai_doan (
  id          uuid primary key default public.uuidv7(),
  lop_id      uuid not null references public.lop (id),
  so_gd       integer not null check (so_gd >= 1),
  tu_ngay     date not null,
  den_ngay    date not null,
  trang_thai  text not null default 'mo' check (trang_thai in ('mo', 'da_dong')),
  ly_do_dong  text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  check (den_ngay >= tu_ngay),
  unique (lop_id, so_gd)
);
comment on table public.lop_giai_doan is
  'Giai đoạn của lớp (vd lớp 24 tháng = 2 giai đoạn). trang_thai da_dong = admin đóng, không tự kích hoạt giai đoạn này cho học viên.';

alter table public.lop_giai_doan enable row level security;
create policy p_read_lop_giai_doan on public.lop_giai_doan for select to authenticated using (deleted_at is null);
create policy p_write_lop_giai_doan on public.lop_giai_doan for all to authenticated
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));
revoke all on public.lop_giai_doan from anon;

-- 2) hop_dong_giai_doan ------------------------------------------------------------------------------------------
create table if not exists public.hop_dong_giai_doan (
  id                    uuid primary key default public.uuidv7(),
  hop_dong_id           uuid not null references public.hop_dong_hoc_phi (id),
  so_gd                 integer not null check (so_gd >= 1),
  tu_ngay               date,
  den_ngay              date,
  trang_thai            text not null default 'du_kien' check (trang_thai in ('du_kien', 'kich_hoat', 'hoan_thanh', 'da_dong')),
  gia_du_kien           bigint check (gia_du_kien >= 0),
  loai_giam_gia         text not null default 'khong' check (loai_giam_gia in ('khong', 'phan_tram', 'co_dinh')),
  gia_tri_giam_gia      bigint not null default 0 check (gia_tri_giam_gia >= 0),
  gia_niem_yet          bigint not null default 0 check (gia_niem_yet >= 0),
  so_tien_giam          bigint not null default 0 check (so_tien_giam >= 0),
  so_tien_mien_cong_no  bigint not null default 0 check (so_tien_mien_cong_no >= 0),
  doanh_thu_thuan       bigint not null default 0 check (doanh_thu_thuan >= 0),
  kich_hoat_luc         timestamptz,
  ly_do_dong            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint chk_hd_giai_doan_doanh_thu check (doanh_thu_thuan = gia_niem_yet - so_tien_giam - so_tien_mien_cong_no),
  unique (hop_dong_id, so_gd)
);
create index if not exists hop_dong_giai_doan_trang_thai_idx on public.hop_dong_giai_doan (trang_thai, tu_ngay);
comment on table public.hop_dong_giai_doan is
  'Giai đoạn của hợp đồng. Tổng gia_niem_yet/so_tien_giam/so_tien_mien_cong_no/doanh_thu_thuan các giai đoạn = số của hop_dong_hoc_phi. '
  'du_kien: chỉ có gia_du_kien (chưa tính công nợ/doanh thu). Nền cho ghi nhận doanh thu theo giai đoạn.';

alter table public.hop_dong_giai_doan enable row level security;
create policy p_read_hop_dong_giai_doan on public.hop_dong_giai_doan for select to authenticated
  using (auth_role() = any (array['master_admin', 'ke_toan', 'thu_ngan', 'admin_ts']));
create policy p_read_hop_dong_giai_doan_qlcn on public.hop_dong_giai_doan for select to authenticated
  using (auth_role() = 'quan_ly_chi_nhanh'
    and hop_dong_id in (select h.id from public.hop_dong_hoc_phi h
                        join public.ghi_danh gd on gd.id = h.ghi_danh_id
                        join public.lop l on l.id = gd.lop_id
                        join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
                        where uc.user_id = auth.uid()));
-- Chỉ được sửa trực tiếp các cột "kế hoạch" của giai đoạn CHƯA kích hoạt; mọi thay đổi khác qua RPC.
create policy p_update_ke_hoach_giai_doan on public.hop_dong_giai_doan for update to authenticated
  using (trang_thai = 'du_kien' and auth_role() = any (array['master_admin', 'ke_toan', 'admin_ts']))
  with check (trang_thai = 'du_kien' and auth_role() = any (array['master_admin', 'ke_toan', 'admin_ts']));
revoke all on public.hop_dong_giai_doan from anon;
revoke insert, update, delete on public.hop_dong_giai_doan from authenticated;
grant select on public.hop_dong_giai_doan to authenticated;
grant update (gia_du_kien, loai_giam_gia, gia_tri_giam_gia) on public.hop_dong_giai_doan to authenticated;

-- 3) kỳ đóng thuộc giai đoạn nào ---------------------------------------------------------------------------------
alter table public.ky_dong_hoc_phi add column if not exists giai_doan_so integer check (giai_doan_so >= 1);
comment on column public.ky_dong_hoc_phi.giai_doan_so is 'Kỳ đóng thuộc giai đoạn nào của hợp đồng (null = chưa gán, coi như giai đoạn 1).';

-- 4) Guard tài chính hợp đồng: cho phép nguồn 'giai_doan' (RPC kích hoạt giai đoạn) --------------------------------
create or replace function public.chan_sua_tai_chinh_hop_dong()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('app.nguon', true), '') not in ('sua_master', 'tat_toan', 'giai_doan')
     and old.trang_thai <> 'nhap'
     and (new.gia_niem_yet     is distinct from old.gia_niem_yet
       or new.loai_giam_gia    is distinct from old.loai_giam_gia
       or new.gia_tri_giam_gia is distinct from old.gia_tri_giam_gia
       or new.so_tien_giam     is distinct from old.so_tien_giam
       or new.so_tien_mien_cong_no is distinct from old.so_tien_mien_cong_no
       or new.doanh_thu_thuan  is distinct from old.doanh_thu_thuan
       or new.hinh_thuc_dong   is distinct from old.hinh_thuc_dong
       or new.goi_hoc_phi_id   is distinct from old.goi_hoc_phi_id) then
    raise exception 'Thay đổi giá, giảm giá hoặc hình thức đóng của hợp đồng phải được đề xuất và Master Admin phê duyệt.';
  end if;
  return new;
end;
$$;

-- 5) Trigger: hợp đồng mới tự có giai đoạn 1 (+ các giai đoạn dự kiến theo lớp); sửa hợp đồng bằng code cũ -> đồng bộ -----
create or replace function public.hd_tao_giai_doan_mac_dinh()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_lop  uuid;
  g      record;
  l      record;
begin
  select gd.lop_id into v_lop from public.ghi_danh gd where gd.id = new.ghi_danh_id;
  select ngay_khai_giang, ngay_ket_thuc into l from public.lop where id = v_lop;

  insert into public.hop_dong_giai_doan
    (hop_dong_id, so_gd, tu_ngay, den_ngay, trang_thai, gia_niem_yet, loai_giam_gia, gia_tri_giam_gia,
     so_tien_giam, so_tien_mien_cong_no, doanh_thu_thuan, kich_hoat_luc)
  select new.id, 1,
         coalesce((select lg.tu_ngay  from public.lop_giai_doan lg where lg.lop_id = v_lop and lg.so_gd = 1 and lg.deleted_at is null), l.ngay_khai_giang),
         coalesce((select lg.den_ngay from public.lop_giai_doan lg where lg.lop_id = v_lop and lg.so_gd = 1 and lg.deleted_at is null), l.ngay_ket_thuc),
         case when new.trang_thai = 'da_huy' then 'da_dong' when new.trang_thai = 'hoan_thanh' then 'hoan_thanh' else 'kich_hoat' end,
         new.gia_niem_yet, new.loai_giam_gia, new.gia_tri_giam_gia, new.so_tien_giam, new.so_tien_mien_cong_no,
         new.doanh_thu_thuan, now()
  on conflict (hop_dong_id, so_gd) do nothing;

  for g in select so_gd, tu_ngay, den_ngay from public.lop_giai_doan
            where lop_id = v_lop and so_gd >= 2 and deleted_at is null and trang_thai = 'mo' loop
    insert into public.hop_dong_giai_doan (hop_dong_id, so_gd, tu_ngay, den_ngay, trang_thai)
    values (new.id, g.so_gd, g.tu_ngay, g.den_ngay, 'du_kien')
    on conflict (hop_dong_id, so_gd) do nothing;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_hop_dong_tao_giai_doan on public.hop_dong_hoc_phi;
create trigger trg_hop_dong_tao_giai_doan
  after insert on public.hop_dong_hoc_phi
  for each row execute function public.hd_tao_giai_doan_mac_dinh();

-- Sửa hợp đồng bằng đường cũ (sua_hop_dong_master, tat_toan_hop_dong, duyệt đề xuất...) -> phần chênh lệch dồn vào
-- giai đoạn hiện hành (giai đoạn đã kích hoạt có số lớn nhất). Nguồn 'giai_doan' tự cập nhật cả hai phía nên bỏ qua.
create or replace function public.hd_dong_bo_giai_doan()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_gd  uuid;
  d_gia bigint := new.gia_niem_yet - old.gia_niem_yet;
  d_giam bigint := new.so_tien_giam - old.so_tien_giam;
  d_mien bigint := new.so_tien_mien_cong_no - old.so_tien_mien_cong_no;
  d_dt  bigint := new.doanh_thu_thuan - old.doanh_thu_thuan;
begin
  if coalesce(current_setting('app.nguon', true), '') = 'giai_doan' then
    return new;
  end if;
  if d_gia = 0 and d_giam = 0 and d_mien = 0 and d_dt = 0
     and new.loai_giam_gia is not distinct from old.loai_giam_gia
     and new.gia_tri_giam_gia is not distinct from old.gia_tri_giam_gia then
    return new;
  end if;

  select id into v_gd from public.hop_dong_giai_doan
   where hop_dong_id = new.id and trang_thai in ('kich_hoat', 'hoan_thanh')
   order by so_gd desc limit 1;
  if v_gd is null then
    return new; -- hợp đồng chưa có giai đoạn (dữ liệu trước migration) — backfill lo
  end if;

  update public.hop_dong_giai_doan
     set gia_niem_yet = gia_niem_yet + d_gia,
         so_tien_giam = so_tien_giam + d_giam,
         so_tien_mien_cong_no = so_tien_mien_cong_no + d_mien,
         doanh_thu_thuan = doanh_thu_thuan + d_dt,
         loai_giam_gia = case when (select count(*) from public.hop_dong_giai_doan where hop_dong_id = new.id and trang_thai <> 'du_kien') = 1
                              then new.loai_giam_gia else loai_giam_gia end,
         gia_tri_giam_gia = case when (select count(*) from public.hop_dong_giai_doan where hop_dong_id = new.id and trang_thai <> 'du_kien') = 1
                                 then new.gia_tri_giam_gia else gia_tri_giam_gia end,
         updated_at = now()
   where id = v_gd;
  return new;
end;
$$;

drop trigger if exists trg_hop_dong_dong_bo_giai_doan on public.hop_dong_hoc_phi;
create trigger trg_hop_dong_dong_bo_giai_doan
  after update on public.hop_dong_hoc_phi
  for each row execute function public.hd_dong_bo_giai_doan();

-- 6) Hàm lõi kích hoạt một giai đoạn ------------------------------------------------------------------------------
create or replace function public.kich_hoat_giai_doan_loi(p_id uuid, p_nguoi text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  s     public.hop_dong_giai_doan%rowtype;
  h     public.hop_dong_hoc_phi%rowtype;
  prev  public.hop_dong_giai_doan%rowtype;
  v_lop uuid;
  v_gd_status text;
  v_lg_dong boolean;
  v_giam bigint;
  v_doanh bigint;
  v_ky   integer;
begin
  select * into s from public.hop_dong_giai_doan where id = p_id for update;
  if not found then raise exception 'Không tìm thấy giai đoạn.'; end if;
  if s.so_gd < 2 then raise exception 'Giai đoạn 1 được kích hoạt cùng hợp đồng.'; end if;
  if s.trang_thai <> 'du_kien' then raise exception 'Giai đoạn đã %, không kích hoạt lại được.', s.trang_thai; end if;
  if s.gia_du_kien is null then raise exception 'Giai đoạn % chưa có giá dự kiến.', s.so_gd; end if;

  select * into h from public.hop_dong_hoc_phi where id = s.hop_dong_id and deleted_at is null for update;
  if not found or h.trang_thai <> 'dang_hoat_dong' then
    raise exception 'Hợp đồng không ở trạng thái đang hoạt động.';
  end if;

  select gd.lop_id, gd.trang_thai into v_lop, v_gd_status from public.ghi_danh gd where gd.id = h.ghi_danh_id;
  if v_gd_status is distinct from 'dang_hoc' then
    raise exception 'Học viên không còn đang học (ghi danh: %).', v_gd_status;
  end if;
  select (trang_thai = 'da_dong') into v_lg_dong from public.lop_giai_doan
   where lop_id = v_lop and so_gd = s.so_gd and deleted_at is null;
  if coalesce(v_lg_dong, false) then raise exception 'Giai đoạn % của lớp đã bị đóng.', s.so_gd; end if;

  select * into prev from public.hop_dong_giai_doan where hop_dong_id = s.hop_dong_id and so_gd = s.so_gd - 1;
  if not found or prev.trang_thai not in ('kich_hoat', 'hoan_thanh') then
    raise exception 'Giai đoạn % chưa được kích hoạt nên chưa thể kích hoạt giai đoạn %.', s.so_gd - 1, s.so_gd;
  end if;
  if prev.den_ngay is null or prev.den_ngay >= (now() at time zone 'Asia/Ho_Chi_Minh')::date then
    raise exception 'Giai đoạn % chưa kết thúc (đến %).', s.so_gd - 1, coalesce(prev.den_ngay::text, 'chưa có ngày kết thúc');
  end if;

  v_giam := case s.loai_giam_gia
              when 'phan_tram' then round(s.gia_du_kien::numeric * least(s.gia_tri_giam_gia, 100) / 100)::bigint
              when 'co_dinh'   then s.gia_tri_giam_gia
              else 0 end;
  v_giam := greatest(0, least(v_giam, s.gia_du_kien));
  v_doanh := s.gia_du_kien - v_giam;

  perform set_config('app.nguon', 'giai_doan', true);
  perform set_config('app.ly_do', 'Kích hoạt giai đoạn ' || s.so_gd || ' (' || p_nguoi || ')', true);

  update public.hop_dong_giai_doan set trang_thai = 'hoan_thanh', updated_at = now() where id = prev.id and trang_thai = 'kich_hoat';
  update public.hop_dong_giai_doan
     set trang_thai = 'kich_hoat', gia_niem_yet = s.gia_du_kien, so_tien_giam = v_giam,
         doanh_thu_thuan = v_doanh, kich_hoat_luc = now(), updated_at = now()
   where id = s.id;

  update public.hop_dong_hoc_phi
     set gia_niem_yet = gia_niem_yet + s.gia_du_kien,
         so_tien_giam = so_tien_giam + v_giam,
         doanh_thu_thuan = doanh_thu_thuan + v_doanh
   where id = h.id;

  if v_doanh > 0 then
    select coalesce(max(so_ky), 0) + 1 into v_ky from public.ky_dong_hoc_phi where hop_dong_id = h.id;
    insert into public.ky_dong_hoc_phi (hop_dong_id, so_ky, ngay_den_han, so_tien_du_kien, trang_thai, giai_doan_so)
    values (h.id, v_ky, coalesce(s.tu_ngay, (now() at time zone 'Asia/Ho_Chi_Minh')::date), v_doanh, 'cho_thu', s.so_gd);
  end if;

  insert into public.nhat_ky (nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau, ly_do)
  values ((select u.id from public.users u where u.id = auth.uid()), 'kich_hoat_giai_doan', 'hop_dong_giai_doan', s.id,
          jsonb_build_object('trang_thai', 'du_kien'),
          jsonb_build_object('trang_thai', 'kich_hoat', 'gia_niem_yet', s.gia_du_kien, 'so_tien_giam', v_giam, 'doanh_thu_thuan', v_doanh),
          p_nguoi);

  return jsonb_build_object('hop_dong_id', h.id, 'so_gd', s.so_gd, 'gia_niem_yet', s.gia_du_kien,
                            'so_tien_giam', v_giam, 'doanh_thu_thuan', v_doanh);
end;
$$;
revoke all on function public.kich_hoat_giai_doan_loi(uuid, text) from public, anon, authenticated;

-- 7) RPC cho người dùng ----------------------------------------------------------------------------------------------
create or replace function public.kich_hoat_giai_doan(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if auth_role() is null or auth_role() not in ('master_admin', 'admin_ts', 'ke_toan') then
    raise exception 'Chỉ Master Admin, Admin Tuyển sinh hoặc Kế toán được kích hoạt giai đoạn.';
  end if;
  return public.kich_hoat_giai_doan_loi(p_id, 'thủ công');
end;
$$;
revoke all on function public.kich_hoat_giai_doan(uuid) from public, anon;
grant execute on function public.kich_hoat_giai_doan(uuid) to authenticated;

create or replace function public.dong_giai_doan(p_id uuid, p_ly_do text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  s public.hop_dong_giai_doan%rowtype;
  v_ly_do text := btrim(coalesce(p_ly_do, ''));
begin
  if auth_role() is null or auth_role() not in ('master_admin', 'admin_ts') then
    raise exception 'Chỉ Master Admin hoặc Admin Tuyển sinh được đóng giai đoạn.';
  end if;
  if char_length(v_ly_do) < 5 then raise exception 'Cần nhập lý do đóng giai đoạn (tối thiểu 5 ký tự).'; end if;
  select * into s from public.hop_dong_giai_doan where id = p_id for update;
  if not found then raise exception 'Không tìm thấy giai đoạn.'; end if;
  if s.trang_thai <> 'du_kien' then
    raise exception 'Chỉ đóng được giai đoạn chưa kích hoạt (hiện: %). Giai đoạn đang chạy hãy dùng tất toán hợp đồng.', s.trang_thai;
  end if;
  update public.hop_dong_giai_doan set trang_thai = 'da_dong', ly_do_dong = v_ly_do, updated_at = now() where id = p_id;
  insert into public.nhat_ky (nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau, ly_do)
  values (auth.uid(), 'dong_giai_doan', 'hop_dong_giai_doan', p_id, jsonb_build_object('trang_thai', 'du_kien'),
          jsonb_build_object('trang_thai', 'da_dong'), v_ly_do);
end;
$$;
revoke all on function public.dong_giai_doan(uuid, text) from public, anon;
grant execute on function public.dong_giai_doan(uuid, text) to authenticated;

create or replace function public.dong_giai_doan_lop(p_lop_id uuid, p_so_gd integer, p_ly_do text)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  v_ly_do text := btrim(coalesce(p_ly_do, ''));
  n integer;
begin
  if auth_role() is null or auth_role() not in ('master_admin', 'admin_ts') then
    raise exception 'Chỉ Master Admin hoặc Admin Tuyển sinh được đóng giai đoạn của lớp.';
  end if;
  if p_so_gd < 2 then raise exception 'Chỉ đóng được từ giai đoạn 2 trở đi.'; end if;
  if char_length(v_ly_do) < 5 then raise exception 'Cần nhập lý do đóng giai đoạn (tối thiểu 5 ký tự).'; end if;

  update public.lop_giai_doan set trang_thai = 'da_dong', ly_do_dong = v_ly_do
   where lop_id = p_lop_id and so_gd >= p_so_gd and deleted_at is null;

  update public.hop_dong_giai_doan s
     set trang_thai = 'da_dong', ly_do_dong = v_ly_do, updated_at = now()
    from public.hop_dong_hoc_phi h, public.ghi_danh gd
   where s.hop_dong_id = h.id and h.ghi_danh_id = gd.id and gd.lop_id = p_lop_id
     and s.so_gd >= p_so_gd and s.trang_thai = 'du_kien';
  get diagnostics n = row_count;

  insert into public.nhat_ky (nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau, ly_do)
  values (auth.uid(), 'dong_giai_doan_lop', 'lop', p_lop_id, null,
          jsonb_build_object('tu_giai_doan', p_so_gd, 'so_hop_dong_giai_doan_dong', n), v_ly_do);
  return n;
end;
$$;
revoke all on function public.dong_giai_doan_lop(uuid, integer, text) from public, anon;
grant execute on function public.dong_giai_doan_lop(uuid, integer, text) to authenticated;

-- 8) Tạo giai đoạn cho lớp + đặt giá dự kiến hàng loạt ----------------------------------------------------------------
-- Mặc định: giai đoạn 1 = 12 tháng đầu kể từ ngày khai giảng; giai đoạn 2 = phần còn lại đến ngày kết thúc lớp.
create or replace function public.tao_giai_doan_lop(p_lop_id uuid, p_so_thang_gd1 integer default 12)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  l public.lop%rowtype;
  v_den1 date;
  n integer := 0;
begin
  if auth_role() is null or auth_role() not in ('master_admin', 'admin_ts') then
    raise exception 'Chỉ Master Admin hoặc Admin Tuyển sinh được tạo giai đoạn cho lớp.';
  end if;
  select * into l from public.lop where id = p_lop_id and deleted_at is null;
  if not found then raise exception 'Không tìm thấy lớp.'; end if;
  if l.ngay_khai_giang is null or l.ngay_ket_thuc is null then
    raise exception 'Lớp chưa có ngày khai giảng/ngày kết thúc.';
  end if;
  v_den1 := (l.ngay_khai_giang + make_interval(months => p_so_thang_gd1))::date - 1;
  if v_den1 + 1 >= l.ngay_ket_thuc then
    raise exception 'Lớp ngắn hơn % tháng nên chỉ có 1 giai đoạn.', p_so_thang_gd1;
  end if;

  insert into public.lop_giai_doan (lop_id, so_gd, tu_ngay, den_ngay) values
    (p_lop_id, 1, l.ngay_khai_giang, v_den1),
    (p_lop_id, 2, v_den1 + 1, l.ngay_ket_thuc)
  on conflict (lop_id, so_gd) do update set tu_ngay = excluded.tu_ngay, den_ngay = excluded.den_ngay
    where public.lop_giai_doan.trang_thai = 'mo';

  update public.hop_dong_giai_doan s set tu_ngay = l.ngay_khai_giang, den_ngay = v_den1
    from public.hop_dong_hoc_phi h, public.ghi_danh gd
   where s.hop_dong_id = h.id and h.ghi_danh_id = gd.id and gd.lop_id = p_lop_id and s.so_gd = 1;

  insert into public.hop_dong_giai_doan (hop_dong_id, so_gd, tu_ngay, den_ngay, trang_thai)
  select h.id, 2, v_den1 + 1, l.ngay_ket_thuc, 'du_kien'
    from public.hop_dong_hoc_phi h join public.ghi_danh gd on gd.id = h.ghi_danh_id
   where gd.lop_id = p_lop_id and h.deleted_at is null and h.trang_thai in ('nhap', 'cho_duyet', 'dang_hoat_dong')
  on conflict (hop_dong_id, so_gd) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.tao_giai_doan_lop(uuid, integer) from public, anon;
grant execute on function public.tao_giai_doan_lop(uuid, integer) to authenticated;

create or replace function public.dat_gia_giai_doan_lop(p_lop_id uuid, p_so_gd integer, p_gia bigint)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  if auth_role() is null or auth_role() not in ('master_admin', 'admin_ts', 'ke_toan') then
    raise exception 'Chỉ Master Admin, Admin Tuyển sinh hoặc Kế toán được đặt giá giai đoạn.';
  end if;
  if p_gia is null or p_gia < 0 or p_so_gd < 2 then raise exception 'Giá phải ≥ 0 và giai đoạn ≥ 2.'; end if;
  update public.hop_dong_giai_doan s set gia_du_kien = p_gia, updated_at = now()
    from public.hop_dong_hoc_phi h, public.ghi_danh gd
   where s.hop_dong_id = h.id and h.ghi_danh_id = gd.id and gd.lop_id = p_lop_id
     and s.so_gd = p_so_gd and s.trang_thai = 'du_kien';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.dat_gia_giai_doan_lop(uuid, integer, bigint) from public, anon;
grant execute on function public.dat_gia_giai_doan_lop(uuid, integer, bigint) to authenticated;

-- 9) Tự động kích hoạt giai đoạn đến hạn — gọi hằng ngày bằng service role (cron ngoài DB) ------------------------------
create or replace function public.kich_hoat_giai_doan_den_han()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  r record;
  v_ok integer := 0;
  v_loi jsonb := '[]'::jsonb;
begin
  for r in
    select s.id, s.hop_dong_id, s.so_gd
      from public.hop_dong_giai_doan s
      join public.hop_dong_giai_doan p on p.hop_dong_id = s.hop_dong_id and p.so_gd = s.so_gd - 1
     where s.trang_thai = 'du_kien' and s.so_gd >= 2
       and p.trang_thai in ('kich_hoat', 'hoan_thanh')
       and p.den_ngay < (now() at time zone 'Asia/Ho_Chi_Minh')::date
     order by s.hop_dong_id, s.so_gd
  loop
    begin
      perform public.kich_hoat_giai_doan_loi(r.id, 'tự động');
      v_ok := v_ok + 1;
    exception when others then
      v_loi := v_loi || jsonb_build_object('hop_dong_id', r.hop_dong_id, 'so_gd', r.so_gd, 'ly_do', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('da_kich_hoat', v_ok, 'khong_kich_hoat_duoc', v_loi);
end;
$$;
revoke all on function public.kich_hoat_giai_doan_den_han() from public, anon, authenticated;
grant execute on function public.kich_hoat_giai_doan_den_han() to service_role;

-- 10) Backfill: mọi hợp đồng hiện có = 1 giai đoạn (số tiền y nguyên) ------------------------------------------------------
insert into public.hop_dong_giai_doan
  (hop_dong_id, so_gd, tu_ngay, den_ngay, trang_thai, gia_niem_yet, loai_giam_gia, gia_tri_giam_gia,
   so_tien_giam, so_tien_mien_cong_no, doanh_thu_thuan, kich_hoat_luc)
select h.id, 1, l.ngay_khai_giang, l.ngay_ket_thuc,
       case when h.trang_thai = 'da_huy' then 'da_dong' when h.trang_thai = 'hoan_thanh' then 'hoan_thanh' else 'kich_hoat' end,
       h.gia_niem_yet, h.loai_giam_gia, h.gia_tri_giam_gia, h.so_tien_giam, h.so_tien_mien_cong_no, h.doanh_thu_thuan, h.kich_hoat_luc
  from public.hop_dong_hoc_phi h
  join public.ghi_danh gd on gd.id = h.ghi_danh_id
  join public.lop l on l.id = gd.lop_id
 where h.deleted_at is null
on conflict (hop_dong_id, so_gd) do nothing;

update public.ky_dong_hoc_phi set giai_doan_so = 1 where giai_doan_so is null;
