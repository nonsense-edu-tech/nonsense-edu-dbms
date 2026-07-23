-- Khối 2: luồng chuyển lớp + quản lý trạng thái ghi danh.
-- Bổ sung giá trị 'da_chuyen_lop' vào ghi_danh.trang_thai (trước đây chỉ
-- có dang_hoc/da_nghi/bao_luu/hoan_thanh, không có giá trị riêng cho lý do
-- "chuyển lớp") — quyết định của user, thay vì tái dùng 'hoan_thanh'.
--
-- chuyen_lop(): đóng ghi_danh đang mở của học sinh (ngay_ket_thuc = hôm
-- nay, trang_thai = 'da_chuyen_lop'), tạo ghi_danh mới cho lớp đích, cập
-- nhật hoc_sinh.lop_hien_tai_id — viết thành hàm Postgres 1 transaction
-- nguyên tử (giống pattern tao_lop()/tao_hoc_sinh()), theo yêu cầu user,
-- để không dở dang nếu lỗi giữa chừng. KHÔNG đổi lop_nhap_hoc_id/
-- ma_hoc_sinh (bất biến, đã có trigger forbid_hoc_sinh_id_change chặn).
-- SECURITY INVOKER (mặc định) — chạy theo RLS của người gọi, nên
-- quan_ly_chi_nhanh chỉ chuyển được học sinh trong phạm vi chi nhánh của
-- họ (cả lớp cũ lẫn lớp đích đều phải qua RLS INSERT/UPDATE của họ).
--
-- cap_nhat_trang_thai_ghi_danh(): đổi trạng thái ghi danh hiện tại, độc
-- lập với chuyển lớp (vd đánh dấu nghỉ/bảo lưu/hoàn thành mà không đổi
-- lớp). Nếu đổi sang trạng thái khác dang_hoc thì tự đóng ngay_ket_thuc;
-- nếu đổi ngược lại dang_hoc thì tự mở lại (ngay_ket_thuc = null).

begin;

alter table public.ghi_danh drop constraint ghi_danh_trang_thai_check;
alter table public.ghi_danh add constraint ghi_danh_trang_thai_check
  check (trang_thai = any (array['dang_hoc', 'da_nghi', 'bao_luu', 'hoan_thanh', 'da_chuyen_lop']));

create or replace function public.chuyen_lop(
  p_hoc_sinh_id uuid,
  p_lop_moi_id uuid
)
returns hoc_sinh
language plpgsql
as $function$
declare
    v_hs           hoc_sinh;
    v_lop_moi      lop;
    v_ghi_danh_cu  ghi_danh;
begin
    select * into v_hs from hoc_sinh where id = p_hoc_sinh_id and deleted_at is null;
    if not found then
        raise exception 'Không tìm thấy học sinh với id=% (hoặc đã bị xoá)', p_hoc_sinh_id;
    end if;

    select * into v_lop_moi from lop where id = p_lop_moi_id and deleted_at is null;
    if not found then
        raise exception 'Không tìm thấy lớp đích với id=% (hoặc đã bị xoá)', p_lop_moi_id;
    end if;

    perform pg_advisory_xact_lock(hashtext('chuyen_lop_' || p_hoc_sinh_id::text));

    select * into v_ghi_danh_cu
    from ghi_danh
    where hoc_sinh_id = p_hoc_sinh_id and ngay_ket_thuc is null and deleted_at is null
    order by ngay_bat_dau desc
    limit 1;

    if not found then
        raise exception 'Học sinh % không có ghi danh đang mở để chuyển lớp', v_hs.ma_hoc_sinh;
    end if;

    if v_ghi_danh_cu.lop_id = p_lop_moi_id then
        raise exception 'Học sinh % đã ở lớp này rồi', v_hs.ma_hoc_sinh;
    end if;

    update ghi_danh
    set ngay_ket_thuc = current_date, trang_thai = 'da_chuyen_lop'
    where id = v_ghi_danh_cu.id;

    insert into ghi_danh (hoc_sinh_id, lop_id, ngay_bat_dau, trang_thai)
    values (p_hoc_sinh_id, p_lop_moi_id, current_date, 'dang_hoc');

    update hoc_sinh
    set lop_hien_tai_id = p_lop_moi_id
    where id = p_hoc_sinh_id
    returning * into v_hs;

    return v_hs;
end;
$function$;

create or replace function public.cap_nhat_trang_thai_ghi_danh(
  p_ghi_danh_id uuid,
  p_trang_thai_moi text
)
returns ghi_danh
language plpgsql
as $function$
declare
    v_gd ghi_danh;
begin
    if p_trang_thai_moi not in ('dang_hoc', 'da_nghi', 'bao_luu', 'hoan_thanh', 'da_chuyen_lop') then
        raise exception 'Trạng thái ghi danh không hợp lệ: %', p_trang_thai_moi;
    end if;

    select * into v_gd from ghi_danh where id = p_ghi_danh_id and deleted_at is null;
    if not found then
        raise exception 'Không tìm thấy ghi danh với id=% (hoặc đã bị xoá)', p_ghi_danh_id;
    end if;

    update ghi_danh
    set trang_thai = p_trang_thai_moi,
        ngay_ket_thuc = case
          when p_trang_thai_moi = 'dang_hoc' then null
          when ngay_ket_thuc is null then current_date
          else ngay_ket_thuc
        end
    where id = p_ghi_danh_id
    returning * into v_gd;

    return v_gd;
end;
$function$;

commit;
