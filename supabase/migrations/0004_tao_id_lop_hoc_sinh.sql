-- =============================================================================
-- NONSENSE EDU — HÀM TỰ SINH ID LỚP HỌC (9 số) + HỌC SINH (12 số)
-- Đích: Supabase / PostgreSQL 15+
--
-- BỐI CẢNH QUAN TRỌNG: các bảng cap_hoc, chuong_trinh, mon_hoc, hinh_thuc,
-- dang_cau, hoc_phan, bai_hoc, users, user_pham_vi, user_bai_hoc, lop, hoc_sinh,
-- ghi_danh, ngu_lieu, cau_hoi, lua_chon, de, de_cau_hoi ĐÃ được tạo trực tiếp
-- trên Supabase qua một phiên làm việc khác với Claude (không đi qua migration
-- file trong repo này). Migration này KHÔNG tạo lại các bảng đó — chỉ thêm phần
-- còn thiếu để tính năng "tạo ID học sinh" chạy được: hàm tự sinh ID + trigger
-- bất biến ID + vài index. RLS của lop/hoc_sinh/ghi_danh đã đúng từ trước
-- (master_admin, admin_ts được ghi; các vai trò khác chỉ đọc) — không đổi gì.
--
-- Dọn dẹp: gỡ 6 policy dư thừa một lần chạy nháp trước đó lỡ tạo thêm trên
-- cap_hoc/chuong_trinh/users (vô hại nhưng thừa — auth_role() không bao giờ
-- trả về 'admin', hệ thống thật dùng master_admin/admin_ts/admin_ht/truong_bm/gv).
-- =============================================================================

drop policy if exists p_read_cap_hoc       on cap_hoc;
drop policy if exists p_write_cap_hoc      on cap_hoc;
drop policy if exists p_read_chuong_trinh  on chuong_trinh;
drop policy if exists p_write_chuong_trinh on chuong_trinh;
drop policy if exists p_read_own_user      on users;
drop policy if exists p_admin_write_users  on users;

-- -----------------------------------------------------------------------------
-- Chặn sửa ID và lớp nhập học đầu tiên sau khi đã tạo (bất biến vĩnh viễn).
-- -----------------------------------------------------------------------------
create or replace function forbid_hoc_sinh_id_change()
returns trigger language plpgsql as $$
begin
    if new.ma_hoc_sinh is distinct from old.ma_hoc_sinh then
        raise exception 'Không được đổi ID học sinh — cố định vĩnh viễn theo lớp nhập học đầu tiên';
    end if;
    if new.lop_nhap_hoc_id is distinct from old.lop_nhap_hoc_id then
        raise exception 'Không được đổi lớp nhập học đầu tiên — chuyển lớp thì tạo bản ghi ghi_danh mới';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_hoc_sinh_immutable_id on hoc_sinh;
create trigger trg_hoc_sinh_immutable_id before update on hoc_sinh
    for each row execute function forbid_hoc_sinh_id_change();

create index if not exists idx_lop_to_hop         on lop (cap_hoc_ma, chuong_trinh_ma, nam_hoc);
create index if not exists idx_hoc_sinh_lop_nhap  on hoc_sinh (lop_nhap_hoc_id);
create index if not exists idx_hoc_sinh_lop_hien  on hoc_sinh (lop_hien_tai_id);
create index if not exists idx_ghi_danh_hoc_sinh  on ghi_danh (hoc_sinh_id);
create index if not exists idx_ghi_danh_lop       on ghi_danh (lop_id);

-- -----------------------------------------------------------------------------
-- HÀM TẠO LỚP — tự sinh số lớp kế tiếp trong tổ hợp (cấp học, chương trình, năm học).
-- Chỉ tính lớp chưa xoá mềm (deleted_at is null) khi tìm số kế tiếp.
-- -----------------------------------------------------------------------------
create or replace function tao_lop(
    p_cap_hoc      smallint,
    p_chuong_trinh text,
    p_nam_hoc      smallint,
    p_ten_lop      text default null,
    p_chi_nhanh_id bigint default null
)
returns lop
language plpgsql
security invoker
as $$
declare
    v_next_so_lop smallint;
    v_ma_lop      char(9);
    v_lop         lop;
begin
    if p_cap_hoc not between 1 and 9 then
        raise exception 'Cấp học phải từ 1-9';
    end if;
    if p_chuong_trinh !~ '^[0-9]{3}$' then
        raise exception 'Chương trình phải là chuỗi 3 chữ số';
    end if;
    if p_nam_hoc not between 0 and 99 then
        raise exception 'Năm học phải từ 00-99';
    end if;

    perform pg_advisory_xact_lock(hashtext('lop_' || p_cap_hoc::text || p_chuong_trinh || lpad(p_nam_hoc::text, 2, '0')));

    select coalesce(max(so_lop), 0) + 1 into v_next_so_lop
    from lop
    where cap_hoc_ma = p_cap_hoc and chuong_trinh_ma = p_chuong_trinh and nam_hoc = p_nam_hoc
      and deleted_at is null;

    if v_next_so_lop > 999 then
        raise exception 'Đã đạt tối đa 999 lớp cho tổ hợp cấp học/chương trình/năm học này';
    end if;

    v_ma_lop := p_cap_hoc::text || p_chuong_trinh || lpad(p_nam_hoc::text, 2, '0') || lpad(v_next_so_lop::text, 3, '0');

    insert into lop (ma_lop, cap_hoc_ma, chuong_trinh_ma, nam_hoc, so_lop, ten_lop, chi_nhanh_id, nguoi_tao)
    values (v_ma_lop, p_cap_hoc, p_chuong_trinh, p_nam_hoc, v_next_so_lop, p_ten_lop, p_chi_nhanh_id, auth.uid())
    returning * into v_lop;

    return v_lop;
end;
$$;

comment on function tao_lop is 'Tạo lớp mới, tự sinh ID 9 số (số lớp kế tiếp trong tổ hợp cấp học+chương trình+năm học, chỉ tính lớp chưa xoá mềm).';

-- -----------------------------------------------------------------------------
-- HÀM TẠO HỌC SINH — tự sinh STT kế tiếp trong lớp nhập học, đồng thời tạo
-- bản ghi ghi_danh (nhập học) đầu tiên cho học sinh.
-- -----------------------------------------------------------------------------
create or replace function tao_hoc_sinh(
    p_lop_id         bigint,
    p_ho_ten         text,
    p_sdt_phu_huynh  text default null,
    p_anh_chan_dung  text default null
)
returns hoc_sinh
language plpgsql
security invoker
as $$
declare
    v_lop           lop;
    v_next_stt      smallint;
    v_ma_hoc_sinh   char(12);
    v_hs            hoc_sinh;
begin
    select * into v_lop from lop where id = p_lop_id and deleted_at is null;
    if not found then
        raise exception 'Không tìm thấy lớp với id=% (hoặc lớp đã bị xoá)', p_lop_id;
    end if;

    if coalesce(btrim(p_ho_ten), '') = '' then
        raise exception 'Họ tên không được để trống';
    end if;

    perform pg_advisory_xact_lock(hashtext('hoc_sinh_' || v_lop.id::text));

    select coalesce(max(stt), 0) + 1 into v_next_stt
    from hoc_sinh
    where lop_nhap_hoc_id = v_lop.id and deleted_at is null;

    if v_next_stt > 999 then
        raise exception 'Lớp % đã đạt tối đa 999 học sinh', v_lop.ma_lop;
    end if;

    v_ma_hoc_sinh := v_lop.ma_lop || lpad(v_next_stt::text, 3, '0');

    insert into hoc_sinh (ma_hoc_sinh, stt, lop_nhap_hoc_id, lop_hien_tai_id, ho_ten, sdt_phu_huynh, anh_chan_dung, nguoi_tao)
    values (v_ma_hoc_sinh, v_next_stt, v_lop.id, v_lop.id, btrim(p_ho_ten), p_sdt_phu_huynh, p_anh_chan_dung, auth.uid())
    returning * into v_hs;

    insert into ghi_danh (hoc_sinh_id, lop_id, ngay_bat_dau, trang_thai)
    values (v_hs.id, v_lop.id, current_date, 'dang_hoc');

    return v_hs;
end;
$$;

comment on function tao_hoc_sinh is 'Tạo học sinh mới trong lớp p_lop_id, tự sinh ID 12 số (STT kế tiếp trong lớp, chỉ tính học sinh chưa xoá mềm), đồng thời tạo bản ghi ghi_danh đầu tiên.';

grant execute on function tao_lop(smallint, text, smallint, text, bigint) to authenticated;
grant execute on function tao_hoc_sinh(bigint, text, text, text) to authenticated;

-- =============================================================================
-- HẾT
-- =============================================================================
