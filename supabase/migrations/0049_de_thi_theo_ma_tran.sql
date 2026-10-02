-- adr004-type: expand
-- =============================================================================
-- ĐỀ THI THEO MA TRẬN ĐỀ
--
-- Migration EXPAND (ADR-004/005): chỉ THÊM bảng, cột (nullable/có default), hàm,
-- trigger, policy mới. Không đổi tên/kiểu/xoá thứ đang chạy.
--
-- Luồng: giáo viên soạn ma trận (ma_tran_de + ma_tran_dong) → sinh_de() chọn
-- câu hỏi/cụm ngữ liệu bằng xáo trộn có seed → xem trước, khoá/đổi cụm → chot_de()
-- chụp nội dung (de_cau_hoi_ban_chup) và phát hành → tao_ma_de() sinh nhiều mã đề
-- (hoán vị thứ tự cụm / đáp án, lưu bố cục để xuất lại y hệt).
--
-- Quy ước:
--   * "Chốt đề" = de.trang_thai 'nhap' → 'da_phat_hanh' (khớp trigger
--     chan_sua_cau_hoi_da_phat_hanh ở 0038).
--   * Các RPC là SECURITY INVOKER → RLS của người gọi vẫn áp dụng (gv chỉ thấy
--     câu hỏi thuộc phạm vi môn). Không dùng FOR ALL cho policy ghi (tránh OR
--     chồng với policy đọc).
--   * Mọi hàm đặt search_path = public, thu hồi execute của anon.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ma trận đề
-- ---------------------------------------------------------------------------
create table if not exists public.ma_tran_de (
    id            uuid primary key default public.uuidv7(),
    ten           text not null check (length(btrim(ten)) > 0),
    mo_ta         text,
    cap_hoc_ma    smallint not null,
    mon_hoc_ma    smallint not null,
    nguoi_tao     uuid not null references auth.users(id),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    deleted_at    timestamptz
);

create index if not exists idx_ma_tran_de_nguoi_tao on public.ma_tran_de (nguoi_tao) where deleted_at is null;

create table if not exists public.ma_tran_dong (
    id               uuid primary key default public.uuidv7(),
    ma_tran_id       uuid not null references public.ma_tran_de(id) on delete cascade,
    thu_tu           integer not null check (thu_tu >= 1),
    nhan             text,                         -- tên phần, vd "Phần I — Đọc hiểu"
    -- null = câu độc lập (không thuộc ngữ liệu); có giá trị = chọn theo CỤM ngữ liệu
    loai_ngu_lieu    text check (loai_ngu_lieu in ('doc_core', 'so_lieu', 'logic', 'khac')),
    so_luong         integer not null check (so_luong between 1 and 200),  -- số câu, hoặc số cụm nếu có ngữ liệu
    cau_moi_cum      smallint check (cau_moi_cum between 1 and 50),        -- null = lấy trọn cụm
    dang_cau_ma      smallint,
    hoc_phan_ma      smallint,
    bai_hoc_ma       smallint,
    chu_de_ma        smallint,
    tien_trinh       text,
    nang_luc_id      uuid references public.nang_luc(id),
    do_kho_tu        smallint not null default 1 check (do_kho_tu between 1 and 5),
    do_kho_den       smallint not null default 5 check (do_kho_den between 1 and 5),
    cho_phep_noi_do_kho boolean not null default false,  -- thiếu câu thì nới ±1 mức khó
    diem_moi_cau     numeric(5,2) check (diem_moi_cau >= 0),
    created_at       timestamptz not null default now(),
    constraint chk_ma_tran_dong_do_kho check (do_kho_tu <= do_kho_den),
    constraint uq_ma_tran_dong_thu_tu unique (ma_tran_id, thu_tu) deferrable initially deferred
);

create index if not exists idx_ma_tran_dong_ma_tran on public.ma_tran_dong (ma_tran_id);

-- ---------------------------------------------------------------------------
-- 2. Mở rộng de / de_cau_hoi
-- ---------------------------------------------------------------------------
alter table public.de add column if not exists ma_tran_id     uuid references public.ma_tran_de(id);
alter table public.de add column if not exists cap_hoc_ma     smallint;
alter table public.de add column if not exists mon_hoc_ma     smallint;
alter table public.de add column if not exists seed           text;
alter table public.de add column if not exists chong_lap_n    smallint not null default 3 check (chong_lap_n between 0 and 20);
alter table public.de add column if not exists xao_cum        boolean not null default true;
alter table public.de add column if not exists xao_dap_an     boolean not null default true;
alter table public.de add column if not exists thoi_gian_phut smallint check (thoi_gian_phut > 0);
alter table public.de add column if not exists bao_cao_sinh   jsonb;
alter table public.de add column if not exists nguoi_chot     uuid references auth.users(id);
alter table public.de add column if not exists ngay_chot      timestamptz;

create index if not exists idx_de_ma_tran on public.de (ma_tran_id);
create index if not exists idx_de_chot on public.de (mon_hoc_ma, cap_hoc_ma, ngay_chot desc) where trang_thai = 'da_phat_hanh';

alter table public.de_cau_hoi add column if not exists dong_id      uuid references public.ma_tran_dong(id) on delete cascade;
alter table public.de_cau_hoi add column if not exists cum_id       uuid references public.ngu_lieu(id);
alter table public.de_cau_hoi add column if not exists khoa         boolean not null default false;
alter table public.de_cau_hoi add column if not exists stt_don_vi   integer;

create index if not exists idx_de_cau_hoi_dong on public.de_cau_hoi (dong_id);

-- ---------------------------------------------------------------------------
-- 3. Ảnh chụp nội dung lúc chốt + mã đề
-- ---------------------------------------------------------------------------
create table if not exists public.de_cau_hoi_ban_chup (
    de_cau_hoi_id uuid primary key references public.de_cau_hoi(id) on delete cascade,
    de_id         uuid not null references public.de(id) on delete cascade,
    cau_hoi_id    uuid not null references public.cau_hoi(id),
    ma_cau_hoi    char(17) not null,
    dang_cau      smallint,
    noi_dung      text not null,
    dap_an_text   text,
    loi_giai      text,
    lua_chon      jsonb not null default '[]'::jsonb,   -- [{id,thu_tu,noi_dung,la_dap_an}]
    hinh_anh      jsonb not null default '[]'::jsonb,
    ngu_lieu      jsonb,                                -- {id,loai,tieu_de,noi_dung}
    created_at    timestamptz not null default now()
);

create index if not exists idx_ban_chup_de on public.de_cau_hoi_ban_chup (de_id);

create table if not exists public.de_ma_de (
    id          uuid primary key default public.uuidv7(),
    de_id       uuid not null references public.de(id) on delete cascade,
    ma          text not null check (ma ~ '^[0-9]{3}$'),
    thu_tu      smallint not null check (thu_tu >= 1),
    bo_cuc      jsonb not null,    -- [{de_cau_hoi_id, thu_tu, lua_chon:[id...]}]
    created_at  timestamptz not null default now(),
    constraint uq_de_ma_de unique (de_id, ma)
);

grant select, insert, update, delete on public.ma_tran_de, public.ma_tran_dong to authenticated;
grant select, insert, delete on public.de_cau_hoi_ban_chup, public.de_ma_de to authenticated;
grant insert, update on public.de to authenticated;
grant insert, update, delete on public.de_cau_hoi to authenticated;

alter table public.ma_tran_de enable row level security;
alter table public.ma_tran_dong enable row level security;
alter table public.de_cau_hoi_ban_chup enable row level security;
alter table public.de_ma_de enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Hàm quyền (invoker — chịu RLS của bảng nguồn)
-- ---------------------------------------------------------------------------
create or replace function public.ma_tran_duoc_sua(p_id uuid)
returns boolean language sql stable set search_path = public as $$
    select exists (
        select 1 from public.ma_tran_de m
        where m.id = p_id and m.deleted_at is null
          and (auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
               or (auth_role() = 'gv' and m.nguoi_tao = auth.uid()))
    );
$$;

create or replace function public.de_duoc_sua(p_id uuid)
returns boolean language sql stable set search_path = public as $$
    select exists (
        select 1 from public.de d
        where d.id = p_id and d.deleted_at is null and d.trang_thai = 'nhap'
          and (auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
               or (auth_role() = 'gv' and d.nguoi_tao = auth.uid()))
    );
$$;

create or replace function public.de_da_chot_duoc_sua(p_id uuid)
returns boolean language sql stable set search_path = public as $$
    select exists (
        select 1 from public.de d
        where d.id = p_id and d.deleted_at is null and d.trang_thai = 'da_phat_hanh'
          and (auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
               or (auth_role() = 'gv' and d.nguoi_tao = auth.uid()))
    );
$$;

create or replace function public.de_duoc_xem_noi_dung(p_id uuid)
returns boolean language sql stable set search_path = public as $$
    select exists (
        select 1 from public.de d
        where d.id = p_id and d.deleted_at is null
          and (auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
               or (auth_role() = 'gv' and d.mon_hoc_ma is not null
                   and public.co_quyen_mon(d.mon_hoc_ma, d.cap_hoc_ma)))
    );
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS (tách INSERT / UPDATE / DELETE, không dùng FOR ALL)
-- ---------------------------------------------------------------------------
drop policy if exists p_read on public.ma_tran_de;
create policy p_read on public.ma_tran_de for select to authenticated
    using (
        deleted_at is null and (
            auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
            or (auth_role() = 'gv' and nguoi_tao = auth.uid())
        )
    );

drop policy if exists p_insert on public.ma_tran_de;
create policy p_insert on public.ma_tran_de for insert to authenticated
    with check (
        nguoi_tao = auth.uid() and (
            auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
            or (auth_role() = 'gv' and public.co_quyen_mon(mon_hoc_ma, cap_hoc_ma))
        )
    );

-- Không có deleted_at IS NULL trong USING (bài học 0032: xoá mềm).
drop policy if exists p_update on public.ma_tran_de;
create policy p_update on public.ma_tran_de for update to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm') or (auth_role() = 'gv' and nguoi_tao = auth.uid()))
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm') or (auth_role() = 'gv' and nguoi_tao = auth.uid()));

drop policy if exists p_read on public.ma_tran_dong;
create policy p_read on public.ma_tran_dong for select to authenticated
    using (public.ma_tran_duoc_sua(ma_tran_id));

drop policy if exists p_insert on public.ma_tran_dong;
create policy p_insert on public.ma_tran_dong for insert to authenticated
    with check (public.ma_tran_duoc_sua(ma_tran_id));

drop policy if exists p_update on public.ma_tran_dong;
create policy p_update on public.ma_tran_dong for update to authenticated
    using (public.ma_tran_duoc_sua(ma_tran_id))
    with check (public.ma_tran_duoc_sua(ma_tran_id));

drop policy if exists p_delete on public.ma_tran_dong;
create policy p_delete on public.ma_tran_dong for delete to authenticated
    using (public.ma_tran_duoc_sua(ma_tran_id));

-- de: policy đọc đã có (0038). Thêm ghi.
drop policy if exists p_insert on public.de;
create policy p_insert on public.de for insert to authenticated
    with check (
        nguoi_tao = auth.uid() and mon_hoc_ma is not null and cap_hoc_ma is not null and (
            auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
            or (auth_role() = 'gv' and public.co_quyen_mon(mon_hoc_ma, cap_hoc_ma))
        )
    );

drop policy if exists p_update on public.de;
create policy p_update on public.de for update to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm') or (auth_role() = 'gv' and nguoi_tao = auth.uid()))
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm') or (auth_role() = 'gv' and nguoi_tao = auth.uid()));

-- de_cau_hoi: policy đọc đã có (0038). Thêm ghi — chỉ khi đề còn nháp và là của mình.
drop policy if exists p_insert on public.de_cau_hoi;
create policy p_insert on public.de_cau_hoi for insert to authenticated
    with check (
        public.de_duoc_sua(de_id)
        and exists (select 1 from public.cau_hoi c where c.id = cau_hoi_id)   -- RLS cau_hoi: chỉ câu trong phạm vi
    );

drop policy if exists p_update on public.de_cau_hoi;
create policy p_update on public.de_cau_hoi for update to authenticated
    using (public.de_duoc_sua(de_id))
    with check (public.de_duoc_sua(de_id));

drop policy if exists p_delete on public.de_cau_hoi;
create policy p_delete on public.de_cau_hoi for delete to authenticated
    using (public.de_duoc_sua(de_id));

-- Ảnh chụp & mã đề: đọc theo phạm vi môn; ghi chỉ chủ đề/quản lý.
drop policy if exists p_read on public.de_cau_hoi_ban_chup;
create policy p_read on public.de_cau_hoi_ban_chup for select to authenticated
    using (public.de_duoc_xem_noi_dung(de_id));

drop policy if exists p_insert on public.de_cau_hoi_ban_chup;
create policy p_insert on public.de_cau_hoi_ban_chup for insert to authenticated
    with check (public.de_duoc_sua(de_id));

drop policy if exists p_read on public.de_ma_de;
create policy p_read on public.de_ma_de for select to authenticated
    using (public.de_duoc_xem_noi_dung(de_id));

drop policy if exists p_insert on public.de_ma_de;
create policy p_insert on public.de_ma_de for insert to authenticated
    with check (public.de_da_chot_duoc_sua(de_id));

drop policy if exists p_delete on public.de_ma_de;
create policy p_delete on public.de_ma_de for delete to authenticated
    using (public.de_da_chot_duoc_sua(de_id));

-- ---------------------------------------------------------------------------
-- 6. Trigger bảo vệ bất biến sau khi chốt
-- ---------------------------------------------------------------------------
create or replace function public.trg_ma_tran_updated()
returns trigger language plpgsql set search_path = public as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_ma_tran_de_updated on public.ma_tran_de;
create trigger trg_ma_tran_de_updated before update on public.ma_tran_de
    for each row execute function public.trg_ma_tran_updated();

-- de đã chốt: chỉ cho sửa ten/mo_ta. Chuyển nhap→da_phat_hanh chỉ qua chot_de().
create or replace function public.bao_ve_de_da_chot()
returns trigger language plpgsql set search_path = public as $$
begin
    if old.trang_thai = 'da_phat_hanh' then
        if (to_jsonb(new) - 'ten' - 'mo_ta' - 'updated_at') is distinct from (to_jsonb(old) - 'ten' - 'mo_ta' - 'updated_at') then
            raise exception 'Đề đã chốt — chỉ được sửa tên và mô tả';
        end if;
    elsif new.trang_thai = 'da_phat_hanh' and coalesce(current_setting('app.dang_chot', true), '') <> '1' then
        raise exception 'Chỉ chốt đề qua chức năng "Chốt đề" (chot_de)';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_bao_ve_de_da_chot on public.de;
create trigger trg_bao_ve_de_da_chot before update on public.de
    for each row execute function public.bao_ve_de_da_chot();

create or replace function public.bao_ve_de_cau_hoi_da_chot()
returns trigger language plpgsql set search_path = public as $$
declare
    v_de uuid := coalesce(new.de_id, old.de_id);
begin
    if exists (select 1 from public.de d where d.id = v_de and d.trang_thai = 'da_phat_hanh') then
        raise exception 'Đề đã chốt — không sửa danh sách câu hỏi';
    end if;
    return coalesce(new, old);
end;
$$;

drop trigger if exists trg_bao_ve_de_cau_hoi_da_chot on public.de_cau_hoi;
create trigger trg_bao_ve_de_cau_hoi_da_chot before insert or update or delete on public.de_cau_hoi
    for each row execute function public.bao_ve_de_cau_hoi_da_chot();

create or replace function public.bao_ve_ban_chup()
returns trigger language plpgsql set search_path = public as $$
begin
    if coalesce(current_setting('app.dang_chot', true), '') <> '1' then
        raise exception 'Ảnh chụp câu hỏi chỉ được tạo khi chốt đề';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_bao_ve_ban_chup on public.de_cau_hoi_ban_chup;
create trigger trg_bao_ve_ban_chup before insert on public.de_cau_hoi_ban_chup
    for each row execute function public.bao_ve_ban_chup();

-- Ma trận đang được đề đã chốt dùng: không sửa/xoá dòng.
create or replace function public.chan_sua_ma_tran_da_dung()
returns trigger language plpgsql set search_path = public as $$
declare
    v_mt uuid := coalesce(new.ma_tran_id, old.ma_tran_id);
begin
    if exists (select 1 from public.de d where d.ma_tran_id = v_mt and d.trang_thai = 'da_phat_hanh') then
        raise exception 'Ma trận đã dùng cho đề đã chốt — hãy nhân bản ma trận để sửa';
    end if;
    return coalesce(new, old);
end;
$$;

drop trigger if exists trg_chan_sua_ma_tran_dong on public.ma_tran_dong;
create trigger trg_chan_sua_ma_tran_dong before insert or update or delete on public.ma_tran_dong
    for each row execute function public.chan_sua_ma_tran_da_dung();

-- ---------------------------------------------------------------------------
-- 7. Lõi chọn: pool_dong — ứng viên (câu lẻ hoặc cụm ngữ liệu) cho 1 dòng ma trận
-- ---------------------------------------------------------------------------
create or replace function public.pool_dong(p_dong_id uuid, p_noi boolean default false)
returns table(don_vi_id uuid, la_cum boolean, tieu_de text, cau_ids uuid[], do_kho_tb numeric)
language plpgsql stable set search_path = public as $$
declare
    d  public.ma_tran_dong;
    t  public.ma_tran_de;
    lo smallint;
    hi smallint;
begin
    select * into d from public.ma_tran_dong where id = p_dong_id;
    if not found then return; end if;
    select * into t from public.ma_tran_de where id = d.ma_tran_id;
    if not found then return; end if;

    lo := greatest(d.do_kho_tu - case when p_noi then 1 else 0 end, 1);
    hi := least(d.do_kho_den + case when p_noi then 1 else 0 end, 5);

    if d.loai_ngu_lieu is null then
        return query
        select c.id, false, null::text, array[c.id], c.do_kho::numeric
        from public.cau_hoi c
        where c.deleted_at is null and c.trang_thai = 'da_duyet'
          and c.cap_hoc = t.cap_hoc_ma and c.mon_hoc = t.mon_hoc_ma
          and c.ngu_lieu_id is null
          and (d.dang_cau_ma is null or c.dang_cau = d.dang_cau_ma)
          and (d.hoc_phan_ma is null or c.hoc_phan = d.hoc_phan_ma)
          and (d.bai_hoc_ma  is null or c.bai_hoc  = d.bai_hoc_ma)
          and (d.chu_de_ma   is null or c.chu_de   = d.chu_de_ma)
          and (d.tien_trinh  is null or c.tien_trinh = d.tien_trinh)
          and (d.nang_luc_id is null or exists (
                select 1 from public.cau_hoi_nang_luc nl where nl.cau_hoi_id = c.id and nl.nang_luc_id = d.nang_luc_id))
          and c.do_kho between lo and hi;
    else
        return query
        select n.id, true, n.tieu_de, array_agg(c.id order by c.ma_cau_hoi), avg(c.do_kho)::numeric
        from public.ngu_lieu n
        join public.cau_hoi c on c.ngu_lieu_id = n.id
        where n.deleted_at is null and n.loai = d.loai_ngu_lieu
          and c.deleted_at is null and c.trang_thai = 'da_duyet'
          and c.cap_hoc = t.cap_hoc_ma and c.mon_hoc = t.mon_hoc_ma
          and (d.dang_cau_ma is null or c.dang_cau = d.dang_cau_ma)
          and (d.hoc_phan_ma is null or c.hoc_phan = d.hoc_phan_ma)
          and (d.bai_hoc_ma  is null or c.bai_hoc  = d.bai_hoc_ma)
          and (d.chu_de_ma   is null or c.chu_de   = d.chu_de_ma)
          and (d.tien_trinh  is null or c.tien_trinh = d.tien_trinh)
          and (d.nang_luc_id is null or exists (
                select 1 from public.cau_hoi_nang_luc nl where nl.cau_hoi_id = c.id and nl.nang_luc_id = d.nang_luc_id))
          and c.do_kho between lo and hi
        group by n.id, n.tieu_de
        having count(*) >= coalesce(d.cau_moi_cum, 1);
    end if;
end;
$$;

-- Độ phủ ngân hàng cho cả ma trận (bước 1): mỗi dòng cần bao nhiêu, có bao nhiêu.
create or replace function public.do_phu_ma_tran(p_ma_tran_id uuid)
returns table(dong_id uuid, can integer, co_dung integer, co_noi integer)
language sql stable set search_path = public as $$
    select r.id, r.so_luong,
           (select count(*)::int from public.pool_dong(r.id, false)),
           (select count(*)::int from public.pool_dong(r.id, true))
    from public.ma_tran_dong r
    where r.ma_tran_id = p_ma_tran_id
      and public.ma_tran_duoc_sua(p_ma_tran_id)
    order by r.thu_tu;
$$;

-- Mức đầy đủ của đề: số đơn vị (câu lẻ / cụm) đang có so với yêu cầu.
create or replace function public.tinh_do_day_de(p_de_id uuid)
returns table(dong_id uuid, can integer, dat integer)
language sql stable set search_path = public as $$
    select r.id, r.so_luong,
           (select count(distinct coalesce(x.cum_id, x.cau_hoi_id))::int
              from public.de_cau_hoi x where x.de_id = d.id and x.dong_id = r.id)
    from public.de d
    join public.ma_tran_dong r on r.ma_tran_id = d.ma_tran_id
    where d.id = p_de_id
    order by r.thu_tu;
$$;

-- Đánh số lại thứ tự câu (uq_de_thu_tu không deferrable → đảo dấu rồi gán).
create or replace function public.danh_so_lai_de(p_de_id uuid)
returns void language plpgsql set search_path = public as $$
begin
    update public.de_cau_hoi set thu_tu = -thu_tu where de_id = p_de_id;

    update public.de_cau_hoi x set thu_tu = s.rn
    from (
        select dch.id,
               row_number() over (order by r.thu_tu, dch.stt_don_vi, c.ma_cau_hoi) as rn
        from public.de_cau_hoi dch
        join public.ma_tran_dong r on r.id = dch.dong_id
        join public.cau_hoi c on c.id = dch.cau_hoi_id
        where dch.de_id = p_de_id
    ) s
    where x.id = s.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. sinh_de: chọn/xáo lại toàn bộ (giữ phần đã khoá)
-- ---------------------------------------------------------------------------
create or replace function public.sinh_de(p_de_id uuid, p_seed text default null)
returns jsonb
language plpgsql set search_path = public as $$
declare
    d        public.de;
    r        public.ma_tran_dong;
    v_seed   text;
    v_lap    uuid[];
    v_bao    jsonb := '[]'::jsonb;
    v_can    integer;
    v_khoa   integer;
    v_noi    integer;
    v_laps   integer;
    v_pass   integer;
    v_tt     integer;
    v_chon   record;
    v_q      uuid;
begin
    if not public.de_duoc_sua(p_de_id) then
        raise exception 'Không có quyền sửa đề này hoặc đề đã chốt';
    end if;

    select * into d from public.de where id = p_de_id for update;
    if d.ma_tran_id is null then
        raise exception 'Đề chưa gắn ma trận';
    end if;
    if not exists (select 1 from public.ma_tran_dong where ma_tran_id = d.ma_tran_id) then
        raise exception 'Ma trận chưa có dòng nào';
    end if;

    v_seed := coalesce(nullif(btrim(p_seed), ''), d.seed, md5(random()::text || clock_timestamp()::text));
    update public.de set seed = v_seed where id = p_de_id;

    -- Câu dùng trong N đề đã chốt gần nhất cùng cấp/môn (ưu tiên tránh, thiếu mới dùng lại).
    select coalesce(array_agg(distinct dch.cau_hoi_id), '{}'::uuid[]) into v_lap
    from public.de_cau_hoi dch
    where dch.de_id in (
        select x.id from public.de x
        where x.trang_thai = 'da_phat_hanh' and x.deleted_at is null
          and x.cap_hoc_ma = d.cap_hoc_ma and x.mon_hoc_ma = d.mon_hoc_ma and x.id <> d.id
        order by x.ngay_chot desc nulls last
        limit d.chong_lap_n
    );

    -- Xoá mọi đơn vị chưa khoá (cụm có ít nhất 1 câu khoá được giữ nguyên cả cụm).
    delete from public.de_cau_hoi x
    where x.de_id = d.id
      and not exists (
          select 1 from public.de_cau_hoi y
          where y.de_id = x.de_id and y.khoa
            and y.dong_id is not distinct from x.dong_id
            and ((x.cum_id is not null and y.cum_id = x.cum_id) or y.id = x.id)
      );

    select coalesce(max(abs(thu_tu)), 0) + 1000 into v_tt from public.de_cau_hoi where de_id = d.id;

    for r in select * from public.ma_tran_dong where ma_tran_id = d.ma_tran_id order by thu_tu loop
        select count(distinct coalesce(x.cum_id, x.cau_hoi_id))::int into v_khoa
        from public.de_cau_hoi x where x.de_id = d.id and x.dong_id = r.id;

        v_can := r.so_luong - v_khoa;
        v_noi := 0;
        v_laps := 0;

        for v_pass in 0 .. (case when r.cho_phep_noi_do_kho then 1 else 0 end) loop
            exit when v_can <= 0;

            for v_chon in
                select p.don_vi_id, p.la_cum, p.cau_ids, (p.cau_ids && v_lap) as lap
                from public.pool_dong(r.id, v_pass = 1) p
                where not exists (
                        select 1 from public.de_cau_hoi z
                        where z.de_id = d.id and z.cau_hoi_id = any (p.cau_ids))
                  and (not p.la_cum or not exists (
                        select 1 from public.de_cau_hoi z where z.de_id = d.id and z.cum_id = p.don_vi_id))
                order by (p.cau_ids && v_lap), md5(v_seed || p.don_vi_id::text)
                limit v_can
            loop
                for v_q in
                    select q from unnest(v_chon.cau_ids) q
                    order by md5(v_seed || q::text)
                    limit coalesce(r.cau_moi_cum, 1000)
                loop
                    v_tt := v_tt + 1;
                    insert into public.de_cau_hoi (de_id, cau_hoi_id, thu_tu, diem, dong_id, cum_id)
                    values (d.id, v_q, v_tt, r.diem_moi_cau, r.id,
                            case when v_chon.la_cum then v_chon.don_vi_id end);
                end loop;
                v_can := v_can - 1;
                if v_pass = 1 then v_noi := v_noi + 1; end if;
                if v_chon.lap then v_laps := v_laps + 1; end if;
            end loop;
        end loop;

        v_bao := v_bao || jsonb_build_object(
            'dong_id', r.id, 'can', r.so_luong, 'dat', r.so_luong - greatest(v_can, 0),
            'thieu', greatest(v_can, 0), 'khoa', v_khoa, 'noi_do_kho', v_noi, 'lap_gan_day', v_laps);
    end loop;

    -- Vị trí đơn vị trong từng phần (xáo cụm theo seed hoặc theo thứ tự tạo).
    with u as (
        select distinct dch.dong_id, coalesce(dch.cum_id, dch.cau_hoi_id) as unit
        from public.de_cau_hoi dch where dch.de_id = d.id
    ), rk as (
        select u.dong_id, u.unit,
               row_number() over (partition by u.dong_id
                                  order by case when d.xao_cum then md5(v_seed || u.unit::text) else u.unit::text end) as rn
        from u
    )
    update public.de_cau_hoi x set stt_don_vi = rk.rn
    from rk
    where x.de_id = d.id and x.dong_id = rk.dong_id and coalesce(x.cum_id, x.cau_hoi_id) = rk.unit;

    perform public.danh_so_lai_de(d.id);

    update public.de set bao_cao_sinh = v_bao where id = d.id;
    return jsonb_build_object('seed', v_seed, 'dong', v_bao);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Khoá / mở khoá một đơn vị; gợi ý & đổi cụm
-- ---------------------------------------------------------------------------
create or replace function public.khoa_don_vi(p_de_id uuid, p_dong_id uuid, p_don_vi_id uuid, p_khoa boolean)
returns void language plpgsql set search_path = public as $$
begin
    if not public.de_duoc_sua(p_de_id) then
        raise exception 'Không có quyền sửa đề này hoặc đề đã chốt';
    end if;
    update public.de_cau_hoi
    set khoa = p_khoa
    where de_id = p_de_id and dong_id = p_dong_id
      and coalesce(cum_id, cau_hoi_id) = p_don_vi_id;
end;
$$;

create or replace function public.goi_y_cum(p_de_id uuid, p_dong_id uuid)
returns table(don_vi_id uuid, la_cum boolean, tieu_de text, so_cau integer, do_kho_tb numeric, lap_gan_day boolean)
language plpgsql stable set search_path = public as $$
declare
    d      public.de;
    r      public.ma_tran_dong;
    v_lap  uuid[];
begin
    select * into d from public.de where id = p_de_id;
    if not found then return; end if;
    select * into r from public.ma_tran_dong where id = p_dong_id and ma_tran_id = d.ma_tran_id;
    if not found then return; end if;

    select coalesce(array_agg(distinct dch.cau_hoi_id), '{}'::uuid[]) into v_lap
    from public.de_cau_hoi dch
    where dch.de_id in (
        select x.id from public.de x
        where x.trang_thai = 'da_phat_hanh' and x.deleted_at is null
          and x.cap_hoc_ma = d.cap_hoc_ma and x.mon_hoc_ma = d.mon_hoc_ma and x.id <> d.id
        order by x.ngay_chot desc nulls last limit d.chong_lap_n);

    return query
    select p.don_vi_id, p.la_cum, p.tieu_de,
           least(cardinality(p.cau_ids), coalesce(r.cau_moi_cum, 1000))::int,
           round(p.do_kho_tb, 1),
           (p.cau_ids && v_lap)
    from public.pool_dong(p_dong_id, r.cho_phep_noi_do_kho) p
    where not exists (select 1 from public.de_cau_hoi z where z.de_id = d.id and z.cau_hoi_id = any (p.cau_ids))
      and (not p.la_cum or not exists (select 1 from public.de_cau_hoi z where z.de_id = d.id and z.cum_id = p.don_vi_id))
    order by (p.cau_ids && v_lap), md5(coalesce(d.seed, '') || p.don_vi_id::text)
    limit 30;
end;
$$;

create or replace function public.doi_cum(p_de_id uuid, p_dong_id uuid, p_don_vi_cu uuid, p_don_vi_moi uuid)
returns void language plpgsql set search_path = public as $$
declare
    d      public.de;
    r      public.ma_tran_dong;
    v_stt  integer;
    v_tt   integer;
    v_p    record;
    v_q    uuid;
begin
    if not public.de_duoc_sua(p_de_id) then
        raise exception 'Không có quyền sửa đề này hoặc đề đã chốt';
    end if;
    select * into d from public.de where id = p_de_id for update;
    select * into r from public.ma_tran_dong where id = p_dong_id and ma_tran_id = d.ma_tran_id;
    if not found then raise exception 'Dòng ma trận không thuộc đề'; end if;

    select min(stt_don_vi) into v_stt from public.de_cau_hoi
    where de_id = d.id and dong_id = r.id and coalesce(cum_id, cau_hoi_id) = p_don_vi_cu;
    if v_stt is null then raise exception 'Không tìm thấy đơn vị cần đổi'; end if;
    if exists (select 1 from public.de_cau_hoi where de_id = d.id and dong_id = r.id
               and coalesce(cum_id, cau_hoi_id) = p_don_vi_cu and khoa) then
        raise exception 'Đơn vị đang khoá — mở khoá trước khi đổi';
    end if;

    -- Đơn vị mới phải nằm trong pool hợp lệ và chưa có trong đề.
    select p.* into v_p from public.goi_y_cum(p_de_id, p_dong_id) p where p.don_vi_id = p_don_vi_moi;
    if not found then
        raise exception 'Đơn vị mới không hợp lệ cho dòng này hoặc đã có trong đề';
    end if;

    delete from public.de_cau_hoi
    where de_id = d.id and dong_id = r.id and coalesce(cum_id, cau_hoi_id) = p_don_vi_cu;

    select coalesce(max(abs(thu_tu)), 0) + 1000 into v_tt from public.de_cau_hoi where de_id = d.id;

    for v_q in
        select q from unnest((select p.cau_ids from public.pool_dong(r.id, r.cho_phep_noi_do_kho) p
                              where p.don_vi_id = p_don_vi_moi)) q
        order by md5(coalesce(d.seed, '') || q::text)
        limit coalesce(r.cau_moi_cum, 1000)
    loop
        v_tt := v_tt + 1;
        insert into public.de_cau_hoi (de_id, cau_hoi_id, thu_tu, diem, dong_id, cum_id, stt_don_vi)
        values (d.id, v_q, v_tt, r.diem_moi_cau, r.id, case when v_p.la_cum then p_don_vi_moi end, v_stt);
    end loop;

    perform public.danh_so_lai_de(d.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Chốt đề + mã đề
-- ---------------------------------------------------------------------------
create or replace function public.tao_ma_de(p_de_id uuid, p_so_ma integer)
returns integer language plpgsql set search_path = public as $$
declare
    d       public.de;
    v_i     integer;
    v_s     text;
    v_hv    boolean;
    v_bo    jsonb;
begin
    if p_so_ma is null or p_so_ma < 1 or p_so_ma > 8 then
        raise exception 'Số mã đề phải từ 1 đến 8';
    end if;
    if not public.de_da_chot_duoc_sua(p_de_id) then
        raise exception 'Chỉ tạo mã đề cho đề đã chốt của chính bạn';
    end if;
    select * into d from public.de where id = p_de_id;

    delete from public.de_ma_de where de_id = p_de_id;

    for v_i in 1 .. p_so_ma loop
        v_s := md5(coalesce(d.seed, '') || '#' || v_i::text);
        v_hv := d.xao_dap_an and v_i > 1;

        select coalesce(jsonb_agg(jsonb_build_object('de_cau_hoi_id', x.id, 'thu_tu', x.rn, 'lua_chon', x.lc) order by x.rn), '[]'::jsonb)
        into v_bo
        from (
            select q.id, q.lc,
                   row_number() over (order by q.dong_tt, q.k, q.thu_tu) as rn
            from (
                select dch.id, r.thu_tu as dong_tt, dch.thu_tu,
                       case when v_i = 1 or not d.xao_cum
                            then lpad(dch.stt_don_vi::text, 6, '0')
                            else md5(v_s || coalesce(dch.cum_id, dch.cau_hoi_id)::text) end as k,
                       (select coalesce(jsonb_agg(e -> 'id' order by
                                  case when v_hv and b.dang_cau in (1, 2)
                                       then md5(v_s || b.cau_hoi_id::text || (e ->> 'id'))
                                       else lpad(e ->> 'thu_tu', 3, '0') end), '[]'::jsonb)
                        from jsonb_array_elements(b.lua_chon) e) as lc
                from public.de_cau_hoi dch
                join public.ma_tran_dong r on r.id = dch.dong_id
                join public.de_cau_hoi_ban_chup b on b.de_cau_hoi_id = dch.id
                where dch.de_id = p_de_id
            ) q
        ) x;

        insert into public.de_ma_de (de_id, ma, thu_tu, bo_cuc)
        values (p_de_id, (100 + v_i)::text, v_i, v_bo);
    end loop;

    return p_so_ma;
end;
$$;

create or replace function public.chot_de(p_de_id uuid, p_so_ma integer default 1)
returns jsonb language plpgsql set search_path = public as $$
declare
    d       public.de;
    v_thieu integer;
    v_n     integer;
    v_pre   text;
    v_ma    text;
begin
    if not public.de_duoc_sua(p_de_id) then
        raise exception 'Không có quyền chốt đề này hoặc đề đã chốt';
    end if;
    select * into d from public.de where id = p_de_id for update;

    select count(*)::int into v_thieu from public.tinh_do_day_de(p_de_id) where dat < can;
    if v_thieu > 0 then
        raise exception 'Đề còn thiếu câu ở % phần — xử lý thiếu trước khi chốt', v_thieu;
    end if;
    if not exists (select 1 from public.de_cau_hoi where de_id = p_de_id) then
        raise exception 'Đề chưa có câu hỏi nào';
    end if;

    perform set_config('app.dang_chot', '1', true);

    insert into public.de_cau_hoi_ban_chup
        (de_cau_hoi_id, de_id, cau_hoi_id, ma_cau_hoi, dang_cau, noi_dung, dap_an_text, loi_giai, lua_chon, hinh_anh, ngu_lieu)
    select dch.id, dch.de_id, c.id, c.ma_cau_hoi, c.dang_cau, c.noi_dung, c.dap_an_text, c.loi_giai,
           (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'thu_tu', l.thu_tu,
                       'noi_dung', l.noi_dung, 'la_dap_an', l.la_dap_an) order by l.thu_tu), '[]'::jsonb)
              from public.lua_chon l where l.cau_hoi_id = c.id),
           (select coalesce(jsonb_agg(jsonb_build_object('vi_tri', h.vi_tri, 'thu_tu_lua_chon', h.thu_tu_lua_chon,
                       'thu_tu', h.thu_tu, 'duong_dan', h.duong_dan, 'alt_text', h.alt_text) order by h.vi_tri, h.thu_tu), '[]'::jsonb)
              from public.cau_hoi_hinh_anh h where h.cau_hoi_id = c.id),
           (select jsonb_build_object('id', n.id, 'loai', n.loai, 'tieu_de', n.tieu_de, 'noi_dung', n.noi_dung)
              from public.ngu_lieu n where n.id = c.ngu_lieu_id)
    from public.de_cau_hoi dch
    join public.cau_hoi c on c.id = dch.cau_hoi_id
    where dch.de_id = p_de_id;

    -- Mã đề tạm "DTyymm-nnn" — chờ chốt quy ước ID tài liệu (14 hay 19 số).
    perform pg_advisory_xact_lock(hashtext('de.ma_de'));
    v_pre := 'DT' || to_char(now(), 'YYMM') || '-';
    select count(*)::int + 1 into v_n from public.de where ma_de like v_pre || '%';
    v_ma := v_pre || lpad(v_n::text, 3, '0');

    update public.de
    set trang_thai = 'da_phat_hanh', nguoi_chot = auth.uid(), ngay_chot = now(),
        ma_de = coalesce(ma_de, v_ma)
    where id = p_de_id;

    perform public.tao_ma_de(p_de_id, coalesce(p_so_ma, 1));

    return jsonb_build_object('ma_de', (select ma_de from public.de where id = p_de_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- 10b. Lưu ma trận nguyên khối (1 giao dịch) + nhân bản
-- ---------------------------------------------------------------------------
create or replace function public.luu_ma_tran(
    p_id uuid, p_ten text, p_mo_ta text, p_cap smallint, p_mon smallint, p_dong jsonb
) returns uuid
language plpgsql set search_path = public as $$
declare
    v_id uuid := p_id;
begin
    if p_ten is null or length(btrim(p_ten)) = 0 then
        raise exception 'Tên ma trận không được để trống';
    end if;
    if p_dong is null or jsonb_typeof(p_dong) <> 'array' or jsonb_array_length(p_dong) = 0 then
        raise exception 'Ma trận cần ít nhất 1 dòng';
    end if;

    if v_id is null then
        insert into public.ma_tran_de (ten, mo_ta, cap_hoc_ma, mon_hoc_ma, nguoi_tao)
        values (btrim(p_ten), nullif(btrim(coalesce(p_mo_ta, '')), ''), p_cap, p_mon, auth.uid())
        returning id into v_id;
    else
        if not public.ma_tran_duoc_sua(v_id) then
            raise exception 'Không có quyền sửa ma trận này';
        end if;
        if exists (select 1 from public.de d where d.ma_tran_id = v_id and d.deleted_at is null
                   and (d.cap_hoc_ma is distinct from p_cap or d.mon_hoc_ma is distinct from p_mon)) then
            raise exception 'Ma trận đã có đề — không đổi cấp học/môn, hãy nhân bản ma trận';
        end if;
        update public.ma_tran_de
        set ten = btrim(p_ten), mo_ta = nullif(btrim(coalesce(p_mo_ta, '')), ''), cap_hoc_ma = p_cap, mon_hoc_ma = p_mon
        where id = v_id;
    end if;

    delete from public.ma_tran_dong
    where ma_tran_id = v_id
      and id not in (select x.id from jsonb_to_recordset(p_dong) as x(id uuid) where x.id is not null);

    insert into public.ma_tran_dong (id, ma_tran_id, thu_tu, nhan, loai_ngu_lieu, so_luong, cau_moi_cum,
        dang_cau_ma, hoc_phan_ma, bai_hoc_ma, chu_de_ma, tien_trinh, do_kho_tu, do_kho_den, cho_phep_noi_do_kho, diem_moi_cau)
    select coalesce(x.id, public.uuidv7()), v_id, x.thu_tu, nullif(btrim(coalesce(x.nhan, '')), ''), x.loai_ngu_lieu,
           x.so_luong, x.cau_moi_cum, x.dang_cau_ma, x.hoc_phan_ma, x.bai_hoc_ma, x.chu_de_ma, x.tien_trinh,
           coalesce(x.do_kho_tu, 1), coalesce(x.do_kho_den, 5), coalesce(x.cho_phep_noi_do_kho, false), x.diem_moi_cau
    from jsonb_to_recordset(p_dong) as x(
        id uuid, thu_tu integer, nhan text, loai_ngu_lieu text, so_luong integer, cau_moi_cum smallint,
        dang_cau_ma smallint, hoc_phan_ma smallint, bai_hoc_ma smallint, chu_de_ma smallint, tien_trinh text,
        do_kho_tu smallint, do_kho_den smallint, cho_phep_noi_do_kho boolean, diem_moi_cau numeric)
    on conflict (id) do update set
        thu_tu = excluded.thu_tu, nhan = excluded.nhan, loai_ngu_lieu = excluded.loai_ngu_lieu,
        so_luong = excluded.so_luong, cau_moi_cum = excluded.cau_moi_cum, dang_cau_ma = excluded.dang_cau_ma,
        hoc_phan_ma = excluded.hoc_phan_ma, bai_hoc_ma = excluded.bai_hoc_ma, chu_de_ma = excluded.chu_de_ma,
        tien_trinh = excluded.tien_trinh, do_kho_tu = excluded.do_kho_tu, do_kho_den = excluded.do_kho_den,
        cho_phep_noi_do_kho = excluded.cho_phep_noi_do_kho, diem_moi_cau = excluded.diem_moi_cau
    where public.ma_tran_dong.ma_tran_id = v_id;

    return v_id;
end;
$$;

create or replace function public.nhan_ban_ma_tran(p_id uuid)
returns uuid
language plpgsql set search_path = public as $$
declare
    m public.ma_tran_de;
    v_id uuid;
begin
    select * into m from public.ma_tran_de where id = p_id;   -- RLS: chỉ ma trận thấy được
    if not found then raise exception 'Không tìm thấy ma trận'; end if;
    insert into public.ma_tran_de (ten, mo_ta, cap_hoc_ma, mon_hoc_ma, nguoi_tao)
    values (m.ten || ' (bản sao)', m.mo_ta, m.cap_hoc_ma, m.mon_hoc_ma, auth.uid())
    returning id into v_id;
    insert into public.ma_tran_dong (ma_tran_id, thu_tu, nhan, loai_ngu_lieu, so_luong, cau_moi_cum, dang_cau_ma,
        hoc_phan_ma, bai_hoc_ma, chu_de_ma, tien_trinh, nang_luc_id, do_kho_tu, do_kho_den, cho_phep_noi_do_kho, diem_moi_cau)
    select v_id, thu_tu, nhan, loai_ngu_lieu, so_luong, cau_moi_cum, dang_cau_ma, hoc_phan_ma, bai_hoc_ma, chu_de_ma,
           tien_trinh, nang_luc_id, do_kho_tu, do_kho_den, cho_phep_noi_do_kho, diem_moi_cau
    from public.ma_tran_dong where ma_tran_id = p_id;
    return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Quyền thực thi
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
    foreach f in array array[
        'ma_tran_duoc_sua(uuid)', 'de_duoc_sua(uuid)', 'de_da_chot_duoc_sua(uuid)', 'de_duoc_xem_noi_dung(uuid)',
        'pool_dong(uuid, boolean)', 'do_phu_ma_tran(uuid)', 'tinh_do_day_de(uuid)', 'danh_so_lai_de(uuid)',
        'sinh_de(uuid, text)', 'khoa_don_vi(uuid, uuid, uuid, boolean)', 'goi_y_cum(uuid, uuid)',
        'doi_cum(uuid, uuid, uuid, uuid)', 'tao_ma_de(uuid, integer)', 'chot_de(uuid, integer)',
        'luu_ma_tran(uuid, text, text, smallint, smallint, jsonb)', 'nhan_ban_ma_tran(uuid)'
    ] loop
        execute format('revoke all on function public.%s from public, anon', f);
        execute format('grant execute on function public.%s to authenticated', f);
    end loop;
end $$;
