-- adr004-type: expand
-- 0048: Rút gọn phân loại câu hỏi (ADR-006) — Expand.
--
-- Câu hỏi thuộc MÔN HỌC (+ học phần / bài học / chủ đề nếu có). Chương trình giảng
-- dạy chỉ GOM CÁC MÔN (bảng chuong_trinh_mon_hoc) và kéo câu hỏi theo môn, nên
-- chương trình không còn là thuộc tính của câu hỏi.
--
-- Mã câu hỏi vẫn 17 số (không đổi cột sinh sẵn, không đổi định dạng), chỉ thêm quy ước:
--   * Chương trình (3 số) = 000 cho câu hỏi mới ("không gắn chương trình cụ thể").
--     Hàm vốn không kiểm tra chương trình nên không cần sửa logic phần này.
--   * Học phần / Bài học / Chủ đề (mỗi phần 2 số) = 00 nghĩa là "Chung / chưa phân loại".
--     Khác 00 thì kiểm tra như cũ (đúng môn / đúng học phần). Bài học khác 00 bắt buộc
--     kèm học phần khác 00.
--
-- Backward-compatible (ADR-004 luật 3): CREATE OR REPLACE giữ nguyên chữ ký; code cũ luôn
-- truyền giá trị khác 0 nên hành vi không đổi. Chưa có câu hỏi nào trong CSDL.

create or replace function public.cap_ma_cau_hoi(
    p_cap_hoc smallint,
    p_chuong_trinh smallint,
    p_mon_hoc smallint,
    p_hoc_phan smallint,
    p_bai_hoc smallint,
    p_chu_de smallint,
    p_dang_cau smallint
) returns character
    language plpgsql
    security definer
    set search_path to 'public'
as $function$
declare
    v_tien_to   char(13);
    v_mon_id    uuid;
    v_stt       integer;
    v_ma        char(17);
begin
    select id into v_mon_id from public.mon_hoc
     where ma = p_mon_hoc and cap_hoc_ma = p_cap_hoc and deleted_at is null;
    if v_mon_id is null then
        raise exception 'Môn học % không tồn tại ở cấp học %', p_mon_hoc, p_cap_hoc;
    end if;

    if p_hoc_phan < 0 or p_bai_hoc < 0 or p_chu_de < 0 or p_chuong_trinh < 0 then
        raise exception 'Mã học phần/bài học/chủ đề/chương trình không được âm';
    end if;

    -- 00 = "Chung" (không phân loại ở cấp này) → bỏ qua kiểm tra tồn tại.
    if p_hoc_phan <> 0 and not exists (
        select 1 from public.hoc_phan where ma = p_hoc_phan and mon_hoc_id = v_mon_id and deleted_at is null
    ) then
        raise exception 'Học phần % không thuộc môn %', p_hoc_phan, p_mon_hoc;
    end if;

    if p_bai_hoc <> 0 then
        if p_hoc_phan = 0 then
            raise exception 'Chọn bài học thì phải chọn học phần chứa nó';
        end if;
        if not exists (
            select 1 from public.bai_hoc bh
            join public.hoc_phan hp on hp.id = bh.hoc_phan_id
            where bh.ma = p_bai_hoc and hp.ma = p_hoc_phan and hp.mon_hoc_id = v_mon_id and bh.deleted_at is null
        ) then
            raise exception 'Bài học % không thuộc học phần %/môn %', p_bai_hoc, p_hoc_phan, p_mon_hoc;
        end if;
    end if;

    if p_chu_de <> 0 and not exists (
        select 1 from public.chu_de where ma = p_chu_de and mon_hoc_id = v_mon_id and deleted_at is null
    ) then
        raise exception 'Chủ đề % không thuộc môn %', p_chu_de, p_mon_hoc;
    end if;

    if not exists (select 1 from public.dang_cau where ma = p_dang_cau and deleted_at is null) then
        raise exception 'Dạng câu % không tồn tại', p_dang_cau;
    end if;

    v_tien_to :=
        lpad(p_cap_hoc::text, 1, '0') ||
        lpad(p_chuong_trinh::text, 3, '0') ||
        lpad(p_mon_hoc::text, 2, '0') ||
        lpad(p_hoc_phan::text, 2, '0') ||
        lpad(p_bai_hoc::text, 2, '0') ||
        lpad(p_chu_de::text, 2, '0') ||
        lpad(p_dang_cau::text, 1, '0');

    insert into public.cau_hoi_bo_dem (tien_to, stt_ke_tiep)
    values (v_tien_to, 2)
    on conflict (tien_to) do update
        set stt_ke_tiep = public.cau_hoi_bo_dem.stt_ke_tiep + 1
    returning stt_ke_tiep - 1 into v_stt;

    if v_stt > 9999 then
        raise exception 'Đã vượt quá 9999 câu cho tổ hợp %', v_tien_to;
    end if;

    v_ma := v_tien_to || lpad(v_stt::text, 4, '0');
    return v_ma;
end;
$function$;
