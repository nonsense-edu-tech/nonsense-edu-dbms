-- ADR-003 Phase 1: chi_nhanh, cap_hoc, chuong_trinh, hinh_thuc,
-- dang_cau, tep_dinh_kem, de -> UUIDv7 primary keys.
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
--
-- phong_hoc.chi_nhanh_id (staging-only table from migration 0017,
-- outside ADR-003's scope since it doesn't exist on production) was
-- approved for full conversion in this migration, but that turned out
-- to be unsafe: RLS policy p_write_phong_hoc_quan_ly_chi_nhanh compares
-- phong_hoc.chi_nhanh_id against user_chi_nhanh.chi_nhanh_id (still
-- bigint, Phase 2). Converting only one side to UUID breaks that
-- policy's join (uuid vs bigint). So phong_hoc gets the SAME treatment
-- as lop/user_chi_nhanh below: FK dropped now, column stays bigint,
-- to be reconnected together with user_chi_nhanh in a later phase
-- (they are coupled by this same RLS policy).
--
-- lop.chi_nhanh_id and user_chi_nhanh.chi_nhanh_id are NOT converted
-- here (lop = Phase 3, user_chi_nhanh = Phase 2 per ADR-003 Muc 5).
-- Their FK to chi_nhanh is dropped now (chi_nhanh.id is changing
-- type/identity) and will be re-established when their own phase
-- backfills a new UUID FK column, per the ADR's cha-truoc-con order.

begin;

-- ============================================================
-- chi_nhanh (Nhom B, co du lieu tren staging: 2 dong)
-- ============================================================
alter table public.chi_nhanh add column id_new uuid default public.uuidv7();
alter table public.chi_nhanh alter column id_new set not null;

-- drop FKs currently pointing at chi_nhanh.id (about to be renamed away).
-- lop / user_chi_nhanh / phong_hoc all keep their bigint chi_nhanh_id
-- column unconverted for now; FK re-established in a later phase.
alter table public.lop drop constraint fk_lop_chi_nhanh;
alter table public.user_chi_nhanh drop constraint user_chi_nhanh_chi_nhanh_id_fkey;
alter table public.phong_hoc drop constraint phong_hoc_chi_nhanh_id_fkey;

alter table public.chi_nhanh drop constraint chi_nhanh_pkey;
alter table public.chi_nhanh rename column id to id_old;
alter table public.chi_nhanh rename column id_new to id;
alter table public.chi_nhanh add primary key (id);
alter table public.chi_nhanh alter column id set default public.uuidv7();

-- ============================================================
-- cap_hoc (Nhom C, khoa tu nhien -> them UUID PK moi)
-- ============================================================
alter table public.cap_hoc add column id uuid default public.uuidv7();
alter table public.cap_hoc alter column id set not null;

alter table public.mon_hoc drop constraint mon_hoc_cap_hoc_ma_fkey;
alter table public.lop drop constraint fk_lop_cap_hoc;
alter table public.user_pham_vi drop constraint user_pham_vi_cap_hoc_ma_fkey;

alter table public.cap_hoc drop constraint cap_hoc_pkey;
alter table public.cap_hoc add constraint cap_hoc_ma_key unique (ma);
alter table public.cap_hoc add primary key (id);

alter table public.mon_hoc add constraint mon_hoc_cap_hoc_ma_fkey
  foreign key (cap_hoc_ma) references public.cap_hoc(ma) on delete restrict;
alter table public.lop add constraint fk_lop_cap_hoc
  foreign key (cap_hoc_ma) references public.cap_hoc(ma);
alter table public.user_pham_vi add constraint user_pham_vi_cap_hoc_ma_fkey
  foreign key (cap_hoc_ma) references public.cap_hoc(ma);

-- ============================================================
-- chuong_trinh (Nhom C)
-- ============================================================
alter table public.chuong_trinh add column id uuid default public.uuidv7();
alter table public.chuong_trinh alter column id set not null;

alter table public.goi_hoc_phi drop constraint goi_hoc_phi_chuong_trinh_ma_fkey;
alter table public.lop drop constraint fk_lop_chuong_trinh;
alter table public.chuong_trinh_mon_hoc drop constraint chuong_trinh_mon_hoc_chuong_trinh_ma_fkey;

alter table public.chuong_trinh drop constraint chuong_trinh_pkey;
alter table public.chuong_trinh add constraint chuong_trinh_ma_key unique (ma);
alter table public.chuong_trinh add primary key (id);

alter table public.goi_hoc_phi add constraint goi_hoc_phi_chuong_trinh_ma_fkey
  foreign key (chuong_trinh_ma) references public.chuong_trinh(ma);
alter table public.lop add constraint fk_lop_chuong_trinh
  foreign key (chuong_trinh_ma) references public.chuong_trinh(ma);
alter table public.chuong_trinh_mon_hoc add constraint chuong_trinh_mon_hoc_chuong_trinh_ma_fkey
  foreign key (chuong_trinh_ma) references public.chuong_trinh(ma);

-- ============================================================
-- hinh_thuc (Nhom C, khong co bang nao FK toi)
-- ============================================================
alter table public.hinh_thuc add column id uuid default public.uuidv7();
alter table public.hinh_thuc alter column id set not null;
alter table public.hinh_thuc drop constraint hinh_thuc_pkey;
alter table public.hinh_thuc add constraint hinh_thuc_ma_key unique (ma);
alter table public.hinh_thuc add primary key (id);

-- ============================================================
-- dang_cau (Nhom C, khong co bang nao FK toi)
-- ============================================================
alter table public.dang_cau add column id uuid default public.uuidv7();
alter table public.dang_cau alter column id set not null;
alter table public.dang_cau drop constraint dang_cau_pkey;
alter table public.dang_cau add constraint dang_cau_ma_key unique (ma);
alter table public.dang_cau add primary key (id);

-- ============================================================
-- tep_dinh_kem (Nhom B, co du lieu tren staging: 1 dong)
-- ============================================================
alter table public.tep_dinh_kem add column id_new uuid default public.uuidv7();
alter table public.tep_dinh_kem alter column id_new set not null;

alter table public.phieu_thu drop constraint phieu_thu_tep_dinh_kem_id_fkey;
alter table public.phieu_thu drop constraint phieu_thu_tep_dinh_kem_id_2_fkey;

alter table public.tep_dinh_kem drop constraint tep_dinh_kem_pkey;
alter table public.tep_dinh_kem rename column id to id_old;
alter table public.tep_dinh_kem rename column id_new to id;
alter table public.tep_dinh_kem add primary key (id);
alter table public.tep_dinh_kem alter column id set default public.uuidv7();

-- ============================================================
-- de (Nhom B, rong ca staging lan production - doi kieu truc tiep)
-- ============================================================
alter table public.de_cau_hoi drop constraint de_cau_hoi_de_id_fkey;

alter table public.de drop constraint de_pkey;
alter table public.de alter column id drop identity if exists;
alter table public.de alter column id type uuid using public.uuidv7();
alter table public.de alter column id set default public.uuidv7();
alter table public.de add primary key (id);

commit;
