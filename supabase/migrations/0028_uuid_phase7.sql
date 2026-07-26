-- ADR-003 Phase 7: lua_chon, de_cau_hoi, ky_dong_hoc_phi -> UUIDv7 PK.
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
-- Ca 3 bang deu rong tren staging - doi kieu truc tiep, khong can EBCV
-- day du. cau_hoi/de deu la uuid thuan tu Phase 1/6 (khong co id_old
-- de map), nen cot FK tro toi chung cung doi kieu truc tiep.
--
-- v_hop_dong_qua_han phai viet lai lan nua: join toi ky_dong_hoc_phi
-- gio dung ky.hop_dong_id = hd.id (song, thay vi hd.id_old cua
-- Phase 6, vi ky_dong_hoc_phi da bat kip uuid); nhung nhanh gop
-- phieu_thu (Phase 8, con bigint) phai doi tu da_thu.ky_dong_id =
-- ky.id sang ky.id_old.

begin;

-- ============================================================
-- lua_chon (Nhom B, rong)
-- ============================================================
alter table public.lua_chon drop constraint lua_chon_pkey;
alter table public.lua_chon alter column id drop identity if exists;
alter table public.lua_chon alter column id type uuid using public.uuidv7();
alter table public.lua_chon alter column id set default public.uuidv7();
alter table public.lua_chon add primary key (id);

alter table public.lua_chon drop constraint lua_chon_cau_hoi_id_thu_tu_key;
alter table public.lua_chon alter column cau_hoi_id type uuid using public.uuidv7();
alter table public.lua_chon add constraint lua_chon_cau_hoi_id_fkey
  foreign key (cau_hoi_id) references public.cau_hoi(id) on delete cascade;
alter table public.lua_chon add constraint lua_chon_cau_hoi_id_thu_tu_key
  unique (cau_hoi_id, thu_tu);

-- ============================================================
-- de_cau_hoi (Nhom B, rong)
-- ============================================================
alter table public.de_cau_hoi drop constraint de_cau_hoi_pkey;
alter table public.de_cau_hoi alter column id drop identity if exists;
alter table public.de_cau_hoi alter column id type uuid using public.uuidv7();
alter table public.de_cau_hoi alter column id set default public.uuidv7();
alter table public.de_cau_hoi add primary key (id);

alter table public.de_cau_hoi drop constraint de_cau_hoi_de_id_cau_hoi_id_key;
alter table public.de_cau_hoi drop constraint de_cau_hoi_de_id_thu_tu_key;

alter table public.de_cau_hoi alter column de_id type uuid using public.uuidv7();
alter table public.de_cau_hoi add constraint de_cau_hoi_de_id_fkey
  foreign key (de_id) references public.de(id) on delete cascade;

alter table public.de_cau_hoi alter column cau_hoi_id type uuid using public.uuidv7();
alter table public.de_cau_hoi add constraint de_cau_hoi_cau_hoi_id_fkey
  foreign key (cau_hoi_id) references public.cau_hoi(id) on delete restrict;

alter table public.de_cau_hoi add constraint de_cau_hoi_de_id_cau_hoi_id_key
  unique (de_id, cau_hoi_id);
alter table public.de_cau_hoi add constraint de_cau_hoi_de_id_thu_tu_key
  unique (de_id, thu_tu);

-- ============================================================
-- ky_dong_hoc_phi (Nhom B, rong tren staging)
-- Du rong nhung phai dung kieu "doi ten" (id -> id_old, khong doi
-- kieu truc tiep) vi v_hop_dong_qua_han can bac cau ky.id_old sang
-- phieu_thu.ky_dong_id (Phase 8, con bigint) trong cau JOIN cua no.
-- phieu_thu la Phase 8 -> drop FK toi ky_dong_hoc_phi.id, noi lai sau
-- ============================================================
alter table public.phieu_thu drop constraint phieu_thu_ky_dong_id_fkey;

drop view public.v_hop_dong_qua_han;

alter table public.ky_dong_hoc_phi drop constraint ky_dong_hoc_phi_hop_dong_id_so_ky_key;

alter table public.ky_dong_hoc_phi add column id_new uuid default public.uuidv7();
alter table public.ky_dong_hoc_phi alter column id_new set not null;
alter table public.ky_dong_hoc_phi drop constraint ky_dong_hoc_phi_pkey;
alter table public.ky_dong_hoc_phi rename column id to id_old;
alter table public.ky_dong_hoc_phi rename column id_new to id;
alter table public.ky_dong_hoc_phi add primary key (id);
alter table public.ky_dong_hoc_phi alter column id set default public.uuidv7();

alter table public.ky_dong_hoc_phi alter column hop_dong_id type uuid using public.uuidv7();
alter table public.ky_dong_hoc_phi add constraint ky_dong_hoc_phi_hop_dong_id_fkey
  foreign key (hop_dong_id) references public.hop_dong_hoc_phi(id) on delete cascade;

alter table public.ky_dong_hoc_phi add constraint ky_dong_hoc_phi_hop_dong_id_so_ky_key
  unique (hop_dong_id, so_ky);

create view public.v_hop_dong_qua_han as
 select hd.id as hop_dong_id,
    hs.ho_ten,
    hs.ma_hoc_sinh,
    l.ten_lop,
    sum(greatest((ky.so_tien_du_kien::numeric - coalesce(da_thu.da_thu_trong_ky, 0::numeric)), 0::numeric)) as so_tien_cham,
    max(current_date - ky.ngay_den_han) as so_ngay_tre_nhat
   from public.hop_dong_hoc_phi hd
     join public.ghi_danh gd on gd.id = hd.ghi_danh_id
     join public.hoc_sinh hs on hs.id = gd.hoc_sinh_id
     join public.lop l on l.id = gd.lop_id
     join public.ky_dong_hoc_phi ky on ky.hop_dong_id = hd.id
     left join ( select phieu_thu.ky_dong_id,
            sum(
                case
                    when phieu_thu.la_phieu_dao then (-phieu_thu.so_tien)
                    else phieu_thu.so_tien
                end) as da_thu_trong_ky
           from public.phieu_thu
          where phieu_thu.ky_dong_id is not null
          group by phieu_thu.ky_dong_id) da_thu on da_thu.ky_dong_id = ky.id_old
  where hd.deleted_at is null and hd.trang_thai = 'dang_hoat_dong' and ky.ngay_den_han < current_date
    and coalesce(da_thu.da_thu_trong_ky, 0::numeric) < ky.so_tien_du_kien::numeric
  group by hd.id, hs.ho_ten, hs.ma_hoc_sinh, l.ten_lop
  order by (max(current_date - ky.ngay_den_han)) desc;

alter view public.v_hop_dong_qua_han set (security_invoker = true);

commit;
