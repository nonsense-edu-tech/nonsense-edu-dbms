-- adr004-type: expand
-- 0054 — Công cụ sửa hợp đồng học phí cho Master Admin + nhật ký thay đổi hợp đồng.
--
-- Bối cảnh (05/10/2026): sau import Master sheet cần chỉnh giá/giảm giá/hình thức đóng của một số hợp đồng
-- đang hoạt động (vd 101026001002: sheet 23,5tr nhưng hợp đồng 25tr). Hiện chỉ có Kích hoạt/Huỷ, không có sửa,
-- và không có vết ai đổi gì.
--
-- Gồm:
--  1) nhat_ky.ly_do (nullable) + chỉ mục tra cứu theo đối tượng.
--  2) nhat_ky chỉ-thêm (append-only): chặn UPDATE/DELETE bằng trigger.
--  3) Trigger ghi nhật ký TỰ ĐỘNG trên hop_dong_hoc_phi (INSERT/UPDATE) — bắt mọi đường thay đổi, kể cả
--     SQL Editor hay RPC khác, không phụ thuộc code ứng dụng nhớ ghi log. Chỉ log các cột nghiệp vụ thật sự đổi
--     (bỏ qua updated_at), lưu cặp truoc/sau dạng diff.
--  4) RPC sua_hop_dong_master: chỉ master_admin; bắt buộc có lý do; tự tính lại so_tien_giam/doanh_thu_thuan
--     (cùng công thức tinhDoanhThuThuan ở frontend); không sửa hợp đồng đã huỷ/xoá mềm; từ chối nếu không có gì đổi.
--
-- Expand thuần: thêm cột nullable/hàm/trigger mới, không đổi hay xoá gì code cũ đang dùng. Trigger log là AFTER,
-- không chặn thao tác cũ. Idempotent.

-- 1) Cột lý do + chỉ mục --------------------------------------------------------------------------------------
alter table public.nhat_ky add column if not exists ly_do text;
create index if not exists idx_nhat_ky_doi_tuong_tg
  on public.nhat_ky (doi_tuong, doi_tuong_id, created_at desc);

-- 2) nhat_ky chỉ-thêm -----------------------------------------------------------------------------------------
create or replace function public.chan_sua_xoa_nhat_ky()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  raise exception 'Nhật ký chỉ được thêm mới, không được sửa hoặc xoá.';
end;
$$;

drop trigger if exists trg_nhat_ky_append_only on public.nhat_ky;
create trigger trg_nhat_ky_append_only
  before update or delete on public.nhat_ky
  for each row execute function public.chan_sua_xoa_nhat_ky();

-- 3) Trigger ghi nhật ký hợp đồng ---------------------------------------------------------------------------
create or replace function public.ghi_nhat_ky_hop_dong()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_cols   text[] := array['goi_hoc_phi_id','gia_niem_yet','loai_giam_gia','gia_tri_giam_gia','so_tien_giam',
                           'doanh_thu_thuan','hinh_thuc_dong','trang_thai','ghi_chu','nguoi_duyet','kich_hoat_luc','deleted_at'];
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

drop trigger if exists trg_hop_dong_ghi_nhat_ky on public.hop_dong_hoc_phi;
create trigger trg_hop_dong_ghi_nhat_ky
  after insert or update on public.hop_dong_hoc_phi
  for each row execute function public.ghi_nhat_ky_hop_dong();

-- 3b) Hàm kiểm tra + chuẩn hoá thông số hợp đồng, dùng chung cho sửa trực tiếp (0054) và đề xuất sửa (0055) -----
create or replace function public.chuan_hoa_thong_so_hop_dong(
  p_gia_niem_yet     bigint,
  p_loai_giam_gia    text,
  p_gia_tri_giam_gia bigint,
  p_hinh_thuc_dong   text,
  out o_gia_tri      bigint,
  out o_so_tien_giam bigint
) language plpgsql immutable set search_path to 'public' as $$
begin
  if p_gia_niem_yet is null or p_gia_niem_yet < 0 then
    raise exception 'Giá niêm yết phải là số ≥ 0.';
  end if;
  if p_loai_giam_gia is null or p_loai_giam_gia not in ('khong', 'phan_tram', 'co_dinh') then
    raise exception 'Loại giảm giá không hợp lệ.';
  end if;
  if p_hinh_thuc_dong is null or p_hinh_thuc_dong not in ('mot_lan', 'hang_thang', 'hang_quy', 'tra_gop') then
    raise exception 'Hình thức đóng không hợp lệ.';
  end if;
  o_gia_tri := case when p_loai_giam_gia = 'khong' then 0 else coalesce(p_gia_tri_giam_gia, 0) end;
  if o_gia_tri < 0 then
    raise exception 'Giá trị giảm giá phải là số ≥ 0.';
  end if;
  if p_loai_giam_gia = 'phan_tram' and o_gia_tri > 100 then
    raise exception 'Giảm theo %% không được vượt quá 100.';
  end if;
  o_so_tien_giam := case p_loai_giam_gia
                      when 'phan_tram' then round(p_gia_niem_yet::numeric * o_gia_tri / 100)::bigint
                      when 'co_dinh'   then o_gia_tri
                      else 0
                    end;
  o_so_tien_giam := greatest(0, least(o_so_tien_giam, p_gia_niem_yet));
end;
$$;

-- 4) RPC sửa hợp đồng (chỉ master_admin) ---------------------------------------------------------------------
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
