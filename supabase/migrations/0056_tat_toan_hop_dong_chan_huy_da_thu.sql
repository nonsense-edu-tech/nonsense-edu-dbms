-- adr004-type: expand
-- 0056 — Tất toán hợp đồng học phí (miễn công nợ) + chốt chặn huỷ hợp đồng đã thu tiền + làm sạch view công nợ.
--
-- Bối cảnh (05/10/2026): học sinh nghỉ/bảo lưu/chuyển lớp nhưng hợp đồng vẫn "đang hoạt động" nên còn phải thu
-- treo mãi (Phạm Bình Minh đã thu 3tr còn 22tr...). Quy ước import cũ cắt doanh thu bằng so_tien_giam làm sai nhãn
-- "giảm giá" và chặn thu muộn. Thiết kế: claude/thiet-ke-tat-toan-hop-dong-hoc-sinh-nghi-05-10-2026.md.
--
-- Gồm:
--  1) Cột so_tien_mien_cong_no (default 0) + ràng buộc doanh_thu_thuan = gia_niem_yet - so_tien_giam - so_tien_mien_cong_no.
--  2) RPC tat_toan_hop_dong (master_admin / admin_ts / ke_toan): miễn phần còn phải thu, hợp đồng -> hoan_thanh,
--     doanh thu thuần = thực thu. Ghi nhật ký (hanh_dong = tat_toan_hop_dong, kèm lý do).
--  3) Trigger chặn chuyển da_huy khi hợp đồng đã có phiếu thu (phiếu thu bất biến; huỷ làm sai doanh thu/công nợ).
--  4) View: v_tai_chinh_hop_dong.con_phai_thu = 0 với hợp đồng da_huy; v_hop_dong_qua_han loại học sinh
--     không còn đang học (công nợ của họ nằm ở bảng riêng trang Thu tiền).
--  5) sua_hop_dong_master từ chối hợp đồng đã tất toán; nhật ký ghi thêm cột so_tien_mien_cong_no.
--
-- Expand/tương thích ngược: cột mới có default 0 (code cũ không biết vẫn insert/update được); ràng buộc mới
-- trùng nghĩa cũ khi mien = 0; hàm/trigger đổi chỉ nới thêm nhánh mới hoặc chặn thao tác vốn sai nghiệp vụ. Idempotent.

-- 1) Cột + ràng buộc -----------------------------------------------------------------------------------------
alter table public.hop_dong_hoc_phi
  add column if not exists so_tien_mien_cong_no bigint not null default 0;

alter table public.hop_dong_hoc_phi drop constraint if exists hop_dong_hoc_phi_so_tien_mien_cong_no_check;
alter table public.hop_dong_hoc_phi
  add constraint hop_dong_hoc_phi_so_tien_mien_cong_no_check check (so_tien_mien_cong_no >= 0);

alter table public.hop_dong_hoc_phi drop constraint if exists chk_hop_dong_doanh_thu;
alter table public.hop_dong_hoc_phi
  add constraint chk_hop_dong_doanh_thu
  check (doanh_thu_thuan = gia_niem_yet - so_tien_giam - so_tien_mien_cong_no);

comment on column public.hop_dong_hoc_phi.so_tien_mien_cong_no is
  'Phần còn phải thu được miễn khi tất toán hợp đồng (học sinh nghỉ/bảo lưu/chuyển lớp). Khác so_tien_giam (giảm giá lúc ký).';

-- 2) Trigger chặn sửa tài chính: cho phép nguồn tat_toan (RPC tat_toan_hop_dong) ----------------------------
create or replace function public.chan_sua_tai_chinh_hop_dong()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  -- Chỉ áp cho người dùng đăng nhập (có JWT); SQL Editor/service role không có auth.uid().
  if auth.uid() is not null
     and coalesce(current_setting('app.nguon', true), '') not in ('sua_master', 'tat_toan')
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

-- 3) Nhật ký hợp đồng: thêm cột miễn công nợ + hành động tat_toan_hop_dong -----------------------------------
create or replace function public.ghi_nhat_ky_hop_dong()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_cols   text[] := array['goi_hoc_phi_id','gia_niem_yet','loai_giam_gia','gia_tri_giam_gia','so_tien_giam',
                           'doanh_thu_thuan','so_tien_mien_cong_no','hinh_thuc_dong','trang_thai','ghi_chu','nguoi_duyet','kich_hoat_luc','deleted_at'];
  v_truoc  jsonb;
  v_sau    jsonb;
  v_hanh   text;
  v_nguoi  uuid;
  v_ly_do  text := nullif(btrim(coalesce(current_setting('app.ly_do', true), '')), '');
begin
  -- Chỉ gắn người thao tác khi uid có trong bảng users (tránh vi phạm FK làm hỏng thao tác chính).
  select u.id into v_nguoi from public.users u where u.id = auth.uid();

  if tg_op = 'INSERT' then
    select jsonb_object_agg(k, to_jsonb(new) -> k) into v_sau from unnest(v_cols) k;
    insert into public.nhat_ky (nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau, ly_do)
    values (v_nguoi, 'tao_hop_dong', 'hop_dong_hoc_phi', new.id, null, v_sau, v_ly_do);
    return new;
  end if;

  select jsonb_object_agg(k, to_jsonb(old) -> k), jsonb_object_agg(k, to_jsonb(new) -> k)
    into v_truoc, v_sau
    from unnest(v_cols) k
   where (to_jsonb(old) -> k) is distinct from (to_jsonb(new) -> k);

  if v_sau is null then
    return new; -- chỉ đổi updated_at hoặc không đổi cột nghiệp vụ nào
  end if;

  v_hanh := case
    when coalesce(current_setting('app.nguon', true), '') = 'tat_toan' then 'tat_toan_hop_dong'
    when coalesce(current_setting('app.yeu_cau_id', true), '') <> '' then 'sua_hop_dong_theo_yeu_cau'
    when coalesce(current_setting('app.nguon', true), '') = 'sua_master' then 'sua_hop_dong'
    when new.deleted_at is not null and old.deleted_at is null then 'xoa_mem_hop_dong'
    when new.trang_thai is distinct from old.trang_thai and new.trang_thai = 'da_huy' then 'huy_hop_dong'
    when new.trang_thai is distinct from old.trang_thai and new.trang_thai = 'dang_hoat_dong' then 'kich_hoat_hop_dong'
    else 'cap_nhat_hop_dong'
  end;

  insert into public.nhat_ky (nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau, ly_do)
  values (v_nguoi, v_hanh, 'hop_dong_hoc_phi', new.id, v_truoc, v_sau, v_ly_do);
  return new;
end;
$$;

-- 4) sửa hợp đồng (Master): từ chối hợp đồng đã tất toán ---------------------------------------------------------
create or replace function public.sua_hop_dong_master(
  p_id                uuid,
  p_gia_niem_yet      bigint,
  p_loai_giam_gia     text,
  p_gia_tri_giam_gia  bigint,
  p_hinh_thuc_dong    text,
  p_ghi_chu           text,
  p_ly_do             text
) returns jsonb
language plpgsql set search_path to 'public' as $$
declare
  r          public.hop_dong_hoc_phi%rowtype;
  v_gia_tri  bigint;
  v_giam     bigint;
  v_thuc_thu bigint;
  v_tong_ky  bigint;
  v_so_ky    integer;
  v_ghi_chu  text := nullif(btrim(coalesce(p_ghi_chu, '')), '');
begin
  if auth_role() is distinct from 'master_admin' then
    raise exception 'Chỉ Master Admin được sửa hợp đồng học phí.';
  end if;
  if p_ly_do is null or char_length(btrim(p_ly_do)) < 5 then
    raise exception 'Cần nhập lý do chỉnh sửa (tối thiểu 5 ký tự).';
  end if;

  select * into r from public.hop_dong_hoc_phi where id = p_id and deleted_at is null for update;
  if not found then
    raise exception 'Không tìm thấy hợp đồng.';
  end if;
  if r.trang_thai = 'da_huy' then
    raise exception 'Hợp đồng đã huỷ, không sửa được.';
  end if;
  if r.so_tien_mien_cong_no > 0 then
    raise exception 'Hợp đồng đã được tất toán (miễn công nợ), không sửa giá được.';
  end if;

  select o_gia_tri, o_so_tien_giam into v_gia_tri, v_giam
    from public.chuan_hoa_thong_so_hop_dong(p_gia_niem_yet, p_loai_giam_gia, p_gia_tri_giam_gia, p_hinh_thuc_dong);

  if r.gia_niem_yet = p_gia_niem_yet
     and r.loai_giam_gia = p_loai_giam_gia
     and r.gia_tri_giam_gia = v_gia_tri
     and r.hinh_thuc_dong = p_hinh_thuc_dong
     and r.ghi_chu is not distinct from v_ghi_chu then
    raise exception 'Không có thay đổi nào so với hiện tại.';
  end if;

  -- Cờ cho trigger nhật ký (chỉ sống trong giao dịch này).
  perform set_config('app.nguon', 'sua_master', true);
  perform set_config('app.ly_do', btrim(p_ly_do), true);

  update public.hop_dong_hoc_phi
     set gia_niem_yet     = p_gia_niem_yet,
         loai_giam_gia    = p_loai_giam_gia,
         gia_tri_giam_gia = v_gia_tri,
         so_tien_giam     = v_giam,
         doanh_thu_thuan  = p_gia_niem_yet - v_giam,
         hinh_thuc_dong   = p_hinh_thuc_dong,
         ghi_chu          = v_ghi_chu
   where id = p_id;

  select coalesce(sum(so_tien), 0) into v_thuc_thu from public.phieu_thu where hop_dong_id = p_id;
  select coalesce(sum(so_tien_du_kien), 0), count(*) into v_tong_ky, v_so_ky
    from public.ky_dong_hoc_phi where hop_dong_id = p_id;

  return jsonb_build_object(
    'doanh_thu_thuan_cu',  r.doanh_thu_thuan,
    'doanh_thu_thuan_moi', p_gia_niem_yet - v_giam,
    'thuc_thu',            v_thuc_thu,
    'so_ky',               v_so_ky,
    'tong_ky_du_kien',     v_tong_ky
  );
end;
$$;

revoke all on function public.sua_hop_dong_master(uuid, bigint, text, bigint, text, text, text) from public, anon;
grant execute on function public.sua_hop_dong_master(uuid, bigint, text, bigint, text, text, text) to authenticated;

-- 5) RPC tất toán ---------------------------------------------------------------------------------------------
create or replace function public.tat_toan_hop_dong(p_id uuid, p_ly_do text)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  r          public.hop_dong_hoc_phi%rowtype;
  v_thuc_thu bigint;
  v_con      bigint;
  v_ly_do    text := btrim(coalesce(p_ly_do, ''));
begin
  if auth_role() is null or auth_role() not in ('master_admin', 'admin_ts', 'ke_toan') then
    raise exception 'Chỉ Master Admin, Admin Tuyển sinh hoặc Kế toán được tất toán hợp đồng.';
  end if;
  if char_length(v_ly_do) < 5 then
    raise exception 'Cần nhập lý do tất toán (tối thiểu 5 ký tự).';
  end if;

  select * into r from public.hop_dong_hoc_phi where id = p_id and deleted_at is null for update;
  if not found then
    raise exception 'Không tìm thấy hợp đồng.';
  end if;
  if r.trang_thai not in ('dang_hoat_dong', 'hoan_thanh') then
    raise exception 'Chỉ tất toán được hợp đồng đang hoạt động hoặc đã hoàn thành (hiện: %). Hợp đồng nháp/chờ duyệt hãy huỷ.', r.trang_thai;
  end if;

  select coalesce(sum(case when la_phieu_dao then -so_tien else so_tien end), 0) into v_thuc_thu
    from public.phieu_thu where hop_dong_id = p_id;
  v_con := r.doanh_thu_thuan - v_thuc_thu;
  if v_con <= 0 then
    raise exception 'Hợp đồng không còn công nợ để miễn (còn phải thu = 0).';
  end if;

  perform set_config('app.nguon', 'tat_toan', true);
  perform set_config('app.ly_do', v_ly_do, true);

  update public.hop_dong_hoc_phi
     set so_tien_mien_cong_no = r.so_tien_mien_cong_no + v_con,
         doanh_thu_thuan      = r.doanh_thu_thuan - v_con,
         trang_thai           = 'hoan_thanh',
         ghi_chu              = concat_ws(' | ', nullif(r.ghi_chu, ''),
                                 'Tất toán ' || to_char((now() at time zone 'Asia/Ho_Chi_Minh')::date, 'DD/MM/YYYY')
                                 || ': miễn ' || v_con::text || ' đ còn phải thu — ' || v_ly_do)
   where id = p_id;

  return jsonb_build_object(
    'thuc_thu',            v_thuc_thu,
    'so_tien_mien',        v_con,
    'doanh_thu_thuan_cu',  r.doanh_thu_thuan,
    'doanh_thu_thuan_moi', r.doanh_thu_thuan - v_con
  );
end;
$$;

revoke all on function public.tat_toan_hop_dong(uuid, text) from public, anon;
grant execute on function public.tat_toan_hop_dong(uuid, text) to authenticated;

-- 6) Chặn huỷ hợp đồng đã có phiếu thu (mọi đường: UI, RPC, SQL) ---------------------------------------------
create or replace function public.chan_huy_hop_dong_da_thu()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.trang_thai = 'da_huy' and old.trang_thai is distinct from 'da_huy'
     and exists (select 1 from public.phieu_thu where hop_dong_id = new.id) then
    raise exception 'Hợp đồng đã có phiếu thu nên không thể huỷ. Hãy tất toán hợp đồng (miễn phần còn lại) thay vì huỷ.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hop_dong_chan_huy_da_thu on public.hop_dong_hoc_phi;
create trigger trg_hop_dong_chan_huy_da_thu
  before update on public.hop_dong_hoc_phi
  for each row execute function public.chan_huy_hop_dong_da_thu();

-- 7) View (giữ security_invoker như bản đang chạy) ------------------------------------------------------------
create or replace view public.v_tai_chinh_hop_dong with (security_invoker = true) as
 SELECT hd.id AS hop_dong_id,
    hd.ghi_danh_id,
    gd.lop_id,
    l.chuong_trinh_ma,
    hd.doanh_thu_thuan,
    tt.thuc_thu,
    CASE WHEN hd.trang_thai = 'da_huy' THEN 0::numeric
         ELSE hd.doanh_thu_thuan::numeric - tt.thuc_thu END AS con_phai_thu,
    hd.trang_thai,
    hd.kich_hoat_luc
   FROM hop_dong_hoc_phi hd
     JOIN ghi_danh gd ON gd.id = hd.ghi_danh_id
     JOIN lop l ON l.id = gd.lop_id
     JOIN v_thuc_thu_hop_dong tt ON tt.hop_dong_id = hd.id
  WHERE hd.deleted_at IS NULL;

create or replace view public.v_hop_dong_qua_han with (security_invoker = true) as
 SELECT hd.id AS hop_dong_id,
    hs.ho_ten,
    hs.ma_hoc_sinh,
    l.ten_lop,
    sum(GREATEST(ky.so_tien_du_kien::numeric - COALESCE(da_thu.da_thu_trong_ky, 0::numeric), 0::numeric)) AS so_tien_cham,
    max(CURRENT_DATE - ky.ngay_den_han) AS so_ngay_tre_nhat
   FROM hop_dong_hoc_phi hd
     JOIN ghi_danh gd ON gd.id = hd.ghi_danh_id
     JOIN hoc_sinh hs ON hs.id = gd.hoc_sinh_id
     JOIN lop l ON l.id = gd.lop_id
     JOIN ky_dong_hoc_phi ky ON ky.hop_dong_id = hd.id
     LEFT JOIN ( SELECT phieu_thu.ky_dong_id,
            sum(
                CASE
                    WHEN phieu_thu.la_phieu_dao THEN - phieu_thu.so_tien
                    ELSE phieu_thu.so_tien
                END) AS da_thu_trong_ky
           FROM phieu_thu
          WHERE phieu_thu.ky_dong_id IS NOT NULL
          GROUP BY phieu_thu.ky_dong_id) da_thu ON da_thu.ky_dong_id = ky.id
  WHERE hd.deleted_at IS NULL AND hd.trang_thai = 'dang_hoat_dong'::text
    AND gd.trang_thai = 'dang_hoc'::text
    AND ky.ngay_den_han < CURRENT_DATE AND COALESCE(da_thu.da_thu_trong_ky, 0::numeric) < ky.so_tien_du_kien::numeric
  GROUP BY hd.id, hs.ho_ten, hs.ma_hoc_sinh, l.ten_lop
  ORDER BY (max(CURRENT_DATE - ky.ngay_den_han)) DESC;
