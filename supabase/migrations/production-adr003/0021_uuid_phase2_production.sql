-- ADR-003 Phase 2 (PRODUCTION variant): mon_hoc, user_chi_nhanh,
-- goi_hoc_phi -> UUIDv7 PK.
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
--
-- Khac voi ban staging (0021_uuid_phase2.sql):
--   1. production KHONG co chuong_trinh_mon_hoc - bo cau lenh dung
--      toi bang do.
--   2. Ten constraint composite tren user_pham_vi/hoc_phan tren
--      PRODUCTION la ten tuy chinh khac staging (da doi chieu truc
--      tiep qua pg_constraint that, khong doan):
--        user_pham_vi_cap_hoc_ma_mon_hoc_ma_fkey (staging) -> fk_upv_mon_hoc (production)
--        hoc_phan_cap_hoc_ma_mon_hoc_ma_fkey (staging) -> fk_hocphan_mon (production)
--      Giu nguyen ten cu (fk_upv_mon_hoc/fk_hocphan_mon) khi tao lai,
--      khong doi sang ten auto-generate, de khong lam thay doi quy
--      uoc dat ten da co san tren production.
--
-- user_chi_nhanh.chi_nhanh_id KHONG doi o day (ly do: RLS coupling
-- voi lop.chi_nhanh_id, xem ghi chu trong 0022_uuid_phase3_production.sql).

begin;

-- ============================================================
-- mon_hoc (Nhom C, khoa tu nhien kep -> them UUID PK moi)
-- ============================================================
alter table public.mon_hoc add column id uuid default public.uuidv7();
alter table public.mon_hoc alter column id set not null;

alter table public.user_pham_vi drop constraint fk_upv_mon_hoc;
alter table public.hoc_phan drop constraint fk_hocphan_mon;

alter table public.mon_hoc drop constraint mon_hoc_pkey;
alter table public.mon_hoc add constraint mon_hoc_ma_cap_hoc_ma_key unique (ma, cap_hoc_ma);
alter table public.mon_hoc add primary key (id);

alter table public.user_pham_vi add constraint fk_upv_mon_hoc
  foreign key (cap_hoc_ma, mon_hoc_ma) references public.mon_hoc(cap_hoc_ma, ma) on delete restrict;
alter table public.hoc_phan add constraint fk_hocphan_mon
  foreign key (cap_hoc_ma, mon_hoc_ma) references public.mon_hoc(cap_hoc_ma, ma) on delete restrict;

-- ============================================================
-- user_chi_nhanh (Nhom B)
-- Chi doi PK rieng (id); chi_nhanh_id GIU NGUYEN bigint.
-- ============================================================
alter table public.user_chi_nhanh add column id_new uuid default public.uuidv7();
alter table public.user_chi_nhanh alter column id_new set not null;
alter table public.user_chi_nhanh drop constraint user_chi_nhanh_pkey;
alter table public.user_chi_nhanh rename column id to id_old;
alter table public.user_chi_nhanh rename column id_new to id;
alter table public.user_chi_nhanh add primary key (id);
alter table public.user_chi_nhanh alter column id set default public.uuidv7();

-- ============================================================
-- goi_hoc_phi (Nhom B)
-- hop_dong_hoc_phi la Phase 6 -> drop FK, noi ket noi lai sau.
-- ============================================================
alter table public.goi_hoc_phi add column id_new uuid default public.uuidv7();
alter table public.goi_hoc_phi alter column id_new set not null;

alter table public.hop_dong_hoc_phi drop constraint hop_dong_hoc_phi_goi_hoc_phi_id_fkey;

alter table public.goi_hoc_phi drop constraint goi_hoc_phi_pkey;
alter table public.goi_hoc_phi rename column id to id_old;
alter table public.goi_hoc_phi rename column id_new to id;
alter table public.goi_hoc_phi add primary key (id);
alter table public.goi_hoc_phi alter column id set default public.uuidv7();

commit;
