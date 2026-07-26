-- ADR-003 Phase 5: user_bai_hoc, ngu_lieu, ghi_danh -> UUIDv7 PK.
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
--
-- OQ-12 (da chot, xem ADR-003 Muc 9): ngu_lieu.mon_hoc_id la FK THAT
-- (NOT NULL REFERENCES mon_hoc(id)), khac han cap_hoc_ma/mon_hoc_ma cu
-- (giu nguyen, khong co rang buoc FK, chi la cot thuong).
--
-- Phat hien khi ra soat RLS/view truoc khi doi:
--   1. bai_hoc.p_write dang loi ngay tu bay gio (tu Phase 4): so sanh
--      user_bai_hoc.bai_hoc_id (bigint) voi bai_hoc.id (da uuid).
--      Xac nhan bang test truc tiep (loi 42883 bigint = uuid). Sua
--      luon trong dot nay vi user_bai_hoc duoc chuyen doi o day.
--   2. v_tai_chinh_hop_dong, v_hop_dong_qua_han (view) join qua
--      ghi_danh.id/lop_id/hoc_sinh_id -> phai DROP truoc khi doi cot,
--      CREATE lai sau (Postgres chan ALTER/DROP COLUMN khi view con
--      phu thuoc, khac voi RENAME - rename thi tu dong bam theo).
--   3. ghi_danh.p_write_ghi_danh_quan_ly_chi_nhanh (tham chieu lop_id)
--      va hop_dong_hoc_phi.p_read/write_hop_dong_quan_ly_chi_nhanh
--      (tham chieu ghi_danh.id qua gd.id_old kieu Phase3, va lop_id
--      qua l.id_old) phai drop+tao lai, doi tu id_old -> id vi
--      ghi_danh nay da bat kip uuid.
--   4. cau_hoi.ngu_lieu_id_fkey (ON DELETE SET NULL) tro vao ngu_lieu.id
--      - Phase 6 chua toi, phai drop truoc khi doi kieu ngu_lieu.id,
--      noi lai o Phase 6.

begin;

-- ============================================================
-- user_bai_hoc (Nhom B, rong) + sua loi song bai_hoc.p_write
-- ============================================================
drop policy p_write on public.bai_hoc;

alter table public.user_bai_hoc drop constraint user_bai_hoc_pkey;
alter table public.user_bai_hoc alter column id drop identity if exists;
alter table public.user_bai_hoc alter column id type uuid using public.uuidv7();
alter table public.user_bai_hoc alter column id set default public.uuidv7();
alter table public.user_bai_hoc add primary key (id);

alter table public.user_bai_hoc drop constraint user_bai_hoc_user_id_bai_hoc_id_key;
alter table public.user_bai_hoc alter column bai_hoc_id type uuid using public.uuidv7();
alter table public.user_bai_hoc add constraint user_bai_hoc_bai_hoc_id_fkey
  foreign key (bai_hoc_id) references public.bai_hoc(id) on delete cascade;
alter table public.user_bai_hoc add constraint user_bai_hoc_user_id_bai_hoc_id_key
  unique (user_id, bai_hoc_id);

create policy p_write on public.bai_hoc for all
  using (
    deleted_at is null
    and (
      auth_role() = any (array['master_admin','admin_ht','truong_bm'])
      or (auth_role() = 'gv' and exists (
        select 1 from public.user_bai_hoc
        where user_bai_hoc.user_id = auth.uid() and user_bai_hoc.bai_hoc_id = bai_hoc.id
      ))
    )
  )
  with check (
    auth_role() = any (array['master_admin','admin_ht','truong_bm'])
    or (auth_role() = 'gv' and exists (
      select 1 from public.user_bai_hoc
      where user_bai_hoc.user_id = auth.uid() and user_bai_hoc.bai_hoc_id = bai_hoc.id
    ))
  );

-- ============================================================
-- ngu_lieu (Nhom B, rong) + OQ-12: them mon_hoc_id la FK that
-- ============================================================
alter table public.cau_hoi drop constraint cau_hoi_ngu_lieu_id_fkey;

alter table public.ngu_lieu drop constraint ngu_lieu_pkey;
alter table public.ngu_lieu alter column id drop identity if exists;
alter table public.ngu_lieu alter column id type uuid using public.uuidv7();
alter table public.ngu_lieu alter column id set default public.uuidv7();
alter table public.ngu_lieu add primary key (id);

alter table public.ngu_lieu alter column hoc_phan_id type uuid using public.uuidv7();
alter table public.ngu_lieu add constraint ngu_lieu_hoc_phan_id_fkey
  foreign key (hoc_phan_id) references public.hoc_phan(id);

alter table public.ngu_lieu alter column bai_hoc_id type uuid using public.uuidv7();
alter table public.ngu_lieu add constraint ngu_lieu_bai_hoc_id_fkey
  foreign key (bai_hoc_id) references public.bai_hoc(id);

-- OQ-12: mon_hoc_id la FK THAT (NOT NULL), cap_hoc_ma/mon_hoc_ma cu
-- giu nguyen khong dung, khong FK (nhu truoc gio)
alter table public.ngu_lieu add column mon_hoc_id uuid;
update public.ngu_lieu set mon_hoc_id = (
  select id from public.mon_hoc
  where mon_hoc.cap_hoc_ma = ngu_lieu.cap_hoc_ma and mon_hoc.ma = ngu_lieu.mon_hoc_ma
);
alter table public.ngu_lieu alter column mon_hoc_id set not null;
alter table public.ngu_lieu add constraint ngu_lieu_mon_hoc_id_fkey
  foreign key (mon_hoc_id) references public.mon_hoc(id);

-- ============================================================
-- ghi_danh (Nhom B, co du lieu tren staging: 69 dong)
-- ============================================================
drop view public.v_tai_chinh_hop_dong;
drop view public.v_hop_dong_qua_han;

alter table public.ghi_danh add column id_new uuid default public.uuidv7();
alter table public.ghi_danh alter column id_new set not null;

alter table public.ghi_danh add column hoc_sinh_id_new uuid;
update public.ghi_danh set hoc_sinh_id_new = (
  select id from public.hoc_sinh where hoc_sinh.id_old = ghi_danh.hoc_sinh_id
);
alter table public.ghi_danh alter column hoc_sinh_id_new set not null;

alter table public.ghi_danh add column lop_id_new uuid;
update public.ghi_danh set lop_id_new = (
  select id from public.lop where lop.id_old = ghi_danh.lop_id
);
alter table public.ghi_danh alter column lop_id_new set not null;

drop policy p_write_ghi_danh_quan_ly_chi_nhanh on public.ghi_danh;
drop policy p_read_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi;
drop policy p_write_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi;

alter table public.ghi_danh drop constraint ghi_danh_hoc_sinh_id_lop_id_key;
alter table public.hop_dong_hoc_phi drop constraint hop_dong_hoc_phi_ghi_danh_id_fkey;

alter table public.ghi_danh drop constraint ghi_danh_pkey;
alter table public.ghi_danh rename column id to id_old;
alter table public.ghi_danh rename column id_new to id;
alter table public.ghi_danh add primary key (id);
alter table public.ghi_danh alter column id set default public.uuidv7();

alter table public.ghi_danh drop column hoc_sinh_id;
alter table public.ghi_danh rename column hoc_sinh_id_new to hoc_sinh_id;
alter table public.ghi_danh add constraint ghi_danh_hoc_sinh_id_fkey
  foreign key (hoc_sinh_id) references public.hoc_sinh(id) on delete cascade;

alter table public.ghi_danh drop column lop_id;
alter table public.ghi_danh rename column lop_id_new to lop_id;
alter table public.ghi_danh add constraint ghi_danh_lop_id_fkey
  foreign key (lop_id) references public.lop(id) on delete restrict;

alter table public.ghi_danh add constraint ghi_danh_hoc_sinh_id_lop_id_key
  unique (hoc_sinh_id, lop_id);

-- tao lai policy/view, dung gd.id_old (hop_dong_hoc_phi.ghi_danh_id
-- van con bigint, Phase 6) va gd.lop_id/l.id (deu da la uuid song)
create policy p_write_ghi_danh_quan_ly_chi_nhanh on public.ghi_danh for all
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and lop_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  )
  with check (
    auth_role() = 'quan_ly_chi_nhanh'
    and lop_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

create policy p_read_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi for select
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and ghi_danh_id in (
      select gd.id_old from public.ghi_danh gd
      join public.lop l on l.id = gd.lop_id
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

create policy p_write_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi for all
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and ghi_danh_id in (
      select gd.id_old from public.ghi_danh gd
      join public.lop l on l.id = gd.lop_id
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  )
  with check (
    auth_role() = 'quan_ly_chi_nhanh'
    and ghi_danh_id in (
      select gd.id_old from public.ghi_danh gd
      join public.lop l on l.id = gd.lop_id
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

create view public.v_tai_chinh_hop_dong as
 select hd.id as hop_dong_id,
    hd.ghi_danh_id,
    gd.lop_id,
    l.chuong_trinh_ma,
    hd.doanh_thu_thuan,
    tt.thuc_thu,
    (hd.doanh_thu_thuan::numeric - tt.thuc_thu) as con_phai_thu,
    hd.trang_thai,
    hd.kich_hoat_luc
   from ((public.hop_dong_hoc_phi hd
     join public.ghi_danh gd on (gd.id_old = hd.ghi_danh_id))
     join public.lop l on (l.id = gd.lop_id))
     join public.v_thuc_thu_hop_dong tt on (tt.hop_dong_id = hd.id)
  where hd.deleted_at is null;

create view public.v_hop_dong_qua_han as
 select hd.id as hop_dong_id,
    hs.ho_ten,
    hs.ma_hoc_sinh,
    l.ten_lop,
    sum(greatest((ky.so_tien_du_kien::numeric - coalesce(da_thu.da_thu_trong_ky, 0::numeric)), 0::numeric)) as so_tien_cham,
    max(current_date - ky.ngay_den_han) as so_ngay_tre_nhat
   from (((((public.hop_dong_hoc_phi hd
     join public.ghi_danh gd on (gd.id_old = hd.ghi_danh_id))
     join public.hoc_sinh hs on (hs.id = gd.hoc_sinh_id))
     join public.lop l on (l.id = gd.lop_id))
     join public.ky_dong_hoc_phi ky on (ky.hop_dong_id = hd.id))
     left join ( select phieu_thu.ky_dong_id,
            sum(
                case
                    when phieu_thu.la_phieu_dao then (- phieu_thu.so_tien)
                    else phieu_thu.so_tien
                end) as da_thu_trong_ky
           from public.phieu_thu
          where phieu_thu.ky_dong_id is not null
          group by phieu_thu.ky_dong_id) da_thu on (da_thu.ky_dong_id = ky.id))
  where (hd.deleted_at is null and hd.trang_thai = 'dang_hoat_dong' and ky.ngay_den_han < current_date
         and coalesce(da_thu.da_thu_trong_ky, 0::numeric) < ky.so_tien_du_kien::numeric)
  group by hd.id, hs.ho_ten, hs.ma_hoc_sinh, l.ten_lop
  order by (max(current_date - ky.ngay_den_han)) desc;

-- migration 0012 co tinh bat security_invoker=true cho 2 view nay (de
-- chay theo RLS cua nguoi goi, khong phai chu so huu) - CREATE VIEW
-- moi khong ke thua thiet lap nay, phai bat lai tuong minh. Thieu buoc
-- nay se bi Supabase Advisor bao ERROR security_definer_view (da xac
-- nhan thuc te khi test Phase 5).
alter view public.v_tai_chinh_hop_dong set (security_invoker = true);
alter view public.v_hop_dong_qua_han set (security_invoker = true);

commit;
