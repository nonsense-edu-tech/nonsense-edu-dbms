-- adr004-type: expand
-- 0051: Đề thi × ngữ liệu — câu con luôn đi liền theo đúng thứ tự soạn; GV bỏ bớt câu con trong đề nháp.
--   * danh_so_lai_de: trong 1 cụm, câu con xếp theo thu_tu_trong_ngu_lieu (0050) thay vì theo mã câu hỏi
--     (trước đó đổi thứ tự ↑/↓ ở ngữ liệu không có tác dụng trong đề). Câu lẻ không đổi hành vi.
--     Các mã đề khác (tao_ma_de) đọc thu_tu đã đánh số này nên cũng giữ thứ tự câu con.
--   * bo_cau_con_khoi_de: bỏ 1 câu con khỏi cụm trong đề NHÁP (cụm phải còn ≥ 1 câu; muốn bỏ cả cụm
--     thì dùng "Đổi cụm"). Chạy quyền người gọi → RLS/de_duoc_sua áp dụng; đề đã chốt bị trigger chặn.
-- Expand thuần: chỉ create or replace hàm + thêm hàm mới; code cũ vẫn chạy.

create or replace function public.danh_so_lai_de(p_de_id uuid)
returns void language plpgsql set search_path = public as $$
begin
    update public.de_cau_hoi set thu_tu = -thu_tu where de_id = p_de_id;

    update public.de_cau_hoi x set thu_tu = s.rn
    from (
        select dch.id,
               row_number() over (
                   order by r.thu_tu, dch.stt_don_vi,
                            coalesce(c.thu_tu_trong_ngu_lieu, 0), c.ma_cau_hoi
               ) as rn
        from public.de_cau_hoi dch
        join public.ma_tran_dong r on r.id = dch.dong_id
        join public.cau_hoi c on c.id = dch.cau_hoi_id
        where dch.de_id = p_de_id
    ) s
    where x.id = s.id;
end;
$$;

create or replace function public.bo_cau_con_khoi_de(p_de_id uuid, p_de_cau_hoi_id uuid)
returns void language plpgsql set search_path = public as $$
declare
    v_cum  uuid;
    v_dong uuid;
    v_con  integer;
begin
    if not public.de_duoc_sua(p_de_id) then
        raise exception 'Không có quyền sửa đề này hoặc đề đã chốt';
    end if;

    select cum_id, dong_id into v_cum, v_dong
    from public.de_cau_hoi where id = p_de_cau_hoi_id and de_id = p_de_id;
    if not found then raise exception 'Không tìm thấy câu trong đề'; end if;
    if v_cum is null then
        raise exception 'Đây là câu lẻ, không thuộc cụm ngữ liệu — dùng "Đổi câu" để thay';
    end if;

    select count(*)::int into v_con from public.de_cau_hoi
    where de_id = p_de_id and cum_id = v_cum and dong_id is not distinct from v_dong;
    if v_con <= 1 then
        raise exception 'Cụm chỉ còn 1 câu — không thể bỏ thêm (dùng "Đổi cụm" để thay cả cụm)';
    end if;

    delete from public.de_cau_hoi where id = p_de_cau_hoi_id;
    perform public.danh_so_lai_de(p_de_id);
end;
$$;

revoke all on function public.bo_cau_con_khoi_de(uuid, uuid) from public;
grant execute on function public.bo_cau_con_khoi_de(uuid, uuid) to authenticated;
