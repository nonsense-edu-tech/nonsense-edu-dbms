-- 0050: Ngữ liệu dùng chung — nhóm câu hỏi con (1 ngữ liệu : N câu hỏi).
-- Loại migration: EXPAND (ADR-004). Code cũ không biết các cột mới vẫn chạy bình thường:
--   * cột mới đều nullable / có default;
--   * câu hỏi cũ (ngu_lieu_id IS NULL) không bị ràng buộc gì thêm.
-- Quyết định đã chốt (03/10/2026, Nguyen):
--   1. Một ngữ liệu = MỘT vị trí (môn / học phần / bài học / chủ đề).
--   2. Câu con KHÔNG tồn tại độc lập: đã thuộc ngữ liệu thì không tách ra, không đổi ngữ liệu.
--      (Câu hỏi không gắn ngữ liệu — ngu_lieu_id IS NULL — vẫn bình thường.)
--   3. Mã hiển thị ngữ liệu = số hiệu ngắn tự tăng NL-0001… — NHÃN, không phải mã nghiệp vụ,
--      không dùng làm khóa. Nhãn "môn học" lấy bằng join mon_hoc khi hiển thị (không lưu thêm).
-- Bảng ngu_lieu / cau_hoi hiện RỖNG trên production (kiểm tra 03/10/2026) nên không cần backfill.
-- RLS: ngu_lieu đã có p_read / p_write_* — KHÔNG sửa (ADR-002: chỉ thêm, không sửa policy).

-- ---------------------------------------------------------------------------
-- 1) ngu_lieu: số hiệu hiển thị + chủ đề
-- ---------------------------------------------------------------------------
create sequence if not exists public.ngu_lieu_so_hieu_seq;

alter table public.ngu_lieu
    add column if not exists so_hieu text,
    add column if not exists chu_de_id uuid references public.chu_de (id);

alter table public.ngu_lieu
    alter column so_hieu set default ('NL-' || lpad(nextval('public.ngu_lieu_so_hieu_seq')::text, 4, '0'));

-- Điền số hiệu cho dòng (nếu có) tạo trước migration này.
update public.ngu_lieu
   set so_hieu = 'NL-' || lpad(nextval('public.ngu_lieu_so_hieu_seq')::text, 4, '0')
 where so_hieu is null;

alter table public.ngu_lieu alter column so_hieu set not null;
alter table public.ngu_lieu add constraint ngu_lieu_so_hieu_key unique (so_hieu);
alter table public.ngu_lieu add constraint ngu_lieu_so_hieu_check check (so_hieu ~ '^NL-[0-9]{4,}$');

comment on column public.ngu_lieu.so_hieu is
    'Nhãn hiển thị ngắn (NL-0001…), tự tăng. KHÔNG phải mã nghiệp vụ, không dùng làm khóa/FK.';
comment on column public.ngu_lieu.chu_de_id is
    'Chủ đề của ngữ liệu (cùng môn). NULL = "Chung" (mã 00 khi cấp mã câu hỏi, ADR-006).';

create index if not exists idx_ngu_lieu_mon_hoc on public.ngu_lieu (mon_hoc_id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 2) cau_hoi: thứ tự trong ngữ liệu + FK không còn SET NULL
-- ---------------------------------------------------------------------------
alter table public.cau_hoi
    add column if not exists thu_tu_trong_ngu_lieu smallint;

-- Có ngữ liệu <=> có thứ tự trong ngữ liệu.
alter table public.cau_hoi
    add constraint cau_hoi_thu_tu_ngu_lieu_check
    check ((ngu_lieu_id is null) = (thu_tu_trong_ngu_lieu is null) and (thu_tu_trong_ngu_lieu is null or thu_tu_trong_ngu_lieu >= 1));

-- Thứ tự không trùng trong cùng một ngữ liệu (câu đã xóa mềm không chiếm chỗ).
create unique index if not exists uq_cau_hoi_thu_tu_ngu_lieu
    on public.cau_hoi (ngu_lieu_id, thu_tu_trong_ngu_lieu)
    where ngu_lieu_id is not null and deleted_at is null;

-- Câu con không tồn tại độc lập → bỏ ON DELETE SET NULL (sẽ vi phạm check ở trên).
alter table public.cau_hoi drop constraint if exists cau_hoi_ngu_lieu_id_fkey;
alter table public.cau_hoi
    add constraint cau_hoi_ngu_lieu_id_fkey foreign key (ngu_lieu_id) references public.ngu_lieu (id) on delete restrict;

comment on column public.cau_hoi.thu_tu_trong_ngu_lieu is
    'Thứ tự hiển thị trong ngữ liệu (1..n). STT trong mã 17 số KHÔNG dùng làm thứ tự. NULL khi câu đứng một mình.';

-- ---------------------------------------------------------------------------
-- 3) Vị trí của ngữ liệu quy ra các mã số dùng trong mã câu hỏi (NULL → 0 = "Chung")
-- ---------------------------------------------------------------------------
create or replace function public.vi_tri_ngu_lieu(p_id uuid)
returns table (cap_hoc smallint, mon_hoc smallint, hoc_phan smallint, bai_hoc smallint, chu_de smallint)
language sql stable security definer set search_path = public
as $$
    select m.cap_hoc_ma,
           m.ma,
           coalesce(hp.ma, 0)::smallint,
           coalesce(bh.ma, 0)::smallint,
           coalesce(cd.ma, 0)::smallint
      from public.ngu_lieu nl
      join public.mon_hoc m        on m.id  = nl.mon_hoc_id
      left join public.hoc_phan hp on hp.id = nl.hoc_phan_id
      left join public.bai_hoc  bh on bh.id = nl.bai_hoc_id
      left join public.chu_de   cd on cd.id = nl.chu_de_id
     where nl.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- 4) Trigger ngu_lieu: vị trí hợp lệ + khóa vị trí khi đã có câu con
-- ---------------------------------------------------------------------------
create or replace function public.kiem_tra_ngu_lieu()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
    if new.hoc_phan_id is not null and not exists (
        select 1 from public.hoc_phan where id = new.hoc_phan_id and mon_hoc_id = new.mon_hoc_id
    ) then
        raise exception 'Học phần không thuộc môn học của ngữ liệu';
    end if;

    if new.bai_hoc_id is not null then
        if new.hoc_phan_id is null then
            raise exception 'Chọn bài học thì phải chọn học phần chứa nó';
        end if;
        if not exists (select 1 from public.bai_hoc where id = new.bai_hoc_id and hoc_phan_id = new.hoc_phan_id) then
            raise exception 'Bài học không thuộc học phần đã chọn';
        end if;
    end if;

    if new.chu_de_id is not null and not exists (
        select 1 from public.chu_de where id = new.chu_de_id and mon_hoc_id = new.mon_hoc_id
    ) then
        raise exception 'Chủ đề không thuộc môn học của ngữ liệu';
    end if;

    -- Mã câu hỏi bất biến (ADR-006) → vị trí ngữ liệu không đổi được khi đã có câu con.
    if tg_op = 'UPDATE' and (
        new.mon_hoc_id  is distinct from old.mon_hoc_id  or
        new.hoc_phan_id is distinct from old.hoc_phan_id or
        new.bai_hoc_id  is distinct from old.bai_hoc_id  or
        new.chu_de_id   is distinct from old.chu_de_id
    ) and exists (select 1 from public.cau_hoi where ngu_lieu_id = old.id and deleted_at is null) then
        raise exception 'Ngữ liệu đã có câu hỏi con — không đổi vị trí (môn/học phần/bài học/chủ đề). Tạo ngữ liệu mới nếu cần.';
    end if;

    return new;
end;
$$;

create trigger trg_kiem_tra_ngu_lieu
    before insert or update on public.ngu_lieu
    for each row execute function public.kiem_tra_ngu_lieu();

-- ---------------------------------------------------------------------------
-- 5) Trigger cau_hoi: câu con khớp vị trí ngữ liệu; không tách / đổi ngữ liệu
-- ---------------------------------------------------------------------------
create or replace function public.kiem_tra_cau_hoi_ngu_lieu()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
    v record;
begin
    if tg_op = 'UPDATE' and old.ngu_lieu_id is not null and new.ngu_lieu_id is distinct from old.ngu_lieu_id then
        raise exception 'Câu hỏi con không được tách khỏi / chuyển sang ngữ liệu khác (câu %)', old.ma_cau_hoi;
    end if;
    if tg_op = 'UPDATE' and old.ngu_lieu_id is null and new.ngu_lieu_id is not null then
        raise exception 'Không gắn thêm ngữ liệu cho câu hỏi đã tạo — tạo câu mới trong ngữ liệu (câu %)', old.ma_cau_hoi;
    end if;

    if new.ngu_lieu_id is not null and tg_op = 'INSERT' then
        select * into v from public.vi_tri_ngu_lieu(new.ngu_lieu_id);
        if not found then
            raise exception 'Ngữ liệu không tồn tại';
        end if;
        -- cap_hoc/mon_hoc/hoc_phan/bai_hoc/chu_de là cột sinh sẵn từ ma_cau_hoi → so với mã đã cấp.
        if substr(new.ma_cau_hoi, 1, 1)::smallint  <> v.cap_hoc
           or substr(new.ma_cau_hoi, 5, 2)::smallint  <> v.mon_hoc
           or substr(new.ma_cau_hoi, 7, 2)::smallint  <> v.hoc_phan
           or substr(new.ma_cau_hoi, 9, 2)::smallint  <> v.bai_hoc
           or substr(new.ma_cau_hoi, 11, 2)::smallint <> v.chu_de then
            raise exception 'Câu hỏi con phải cùng môn/học phần/bài học/chủ đề với ngữ liệu (câu %)', new.ma_cau_hoi;
        end if;
    end if;

    return new;
end;
$$;

create trigger trg_kiem_tra_cau_hoi_ngu_lieu
    before insert or update on public.cau_hoi
    for each row execute function public.kiem_tra_cau_hoi_ngu_lieu();

-- ---------------------------------------------------------------------------
-- 6) Thứ tự kế tiếp trong ngữ liệu (app gọi khi thêm câu con)
-- ---------------------------------------------------------------------------
create or replace function public.thu_tu_ke_tiep_ngu_lieu(p_ngu_lieu_id uuid)
returns smallint language sql stable security definer set search_path = public
as $$
    select (coalesce(max(thu_tu_trong_ngu_lieu), 0) + 1)::smallint
      from public.cau_hoi
     where ngu_lieu_id = p_ngu_lieu_id and deleted_at is null;
$$;
