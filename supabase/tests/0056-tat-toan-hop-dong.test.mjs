import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0056 (tất toán hợp đồng, chặn huỷ khi đã thu, view công nợ) trên PGlite — KHÔNG đụng DB thật.
// Chạy: npm run test:tat-toan-hop-dong
const dir = path.dirname(fileURLToPath(import.meta.url));
const mig54 = fs.readFileSync(path.join(dir, "../migrations/0054_master_sua_hop_dong_va_nhat_ky.sql"), "utf8");
const mig56 = fs.readFileSync(path.join(dir, "../migrations/0056_tat_toan_hop_dong_chan_huy_da_thu.sql"), "utf8");

const db = new PGlite();
await db.exec(`
create schema auth;
create role authenticated; create role anon;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
create table public.users(id uuid primary key, vai_tro text, ho_ten text, trang_thai text default 'active');
create function public.auth_role() returns text language sql stable security definer as $$
  select vai_tro from public.users where id = auth.uid() and trang_thai = 'active' $$;
create table public.nhat_ky(id uuid primary key default gen_random_uuid(), nguoi_dung_id uuid references public.users(id),
  hanh_dong text not null, doi_tuong text not null, doi_tuong_id uuid, truoc jsonb, sau jsonb, created_at timestamptz not null default now());
create table public.hop_dong_hoc_phi(
  id uuid primary key default gen_random_uuid(), ghi_danh_id uuid not null, goi_hoc_phi_id uuid,
  gia_niem_yet bigint not null, loai_giam_gia text not null default 'khong', gia_tri_giam_gia bigint not null default 0,
  so_tien_giam bigint not null default 0, doanh_thu_thuan bigint not null,
  hinh_thuc_dong text not null, trang_thai text not null default 'nhap', ghi_chu text,
  nguoi_duyet uuid, kich_hoat_luc timestamptz, deleted_at timestamptz, updated_at timestamptz not null default now(),
  constraint chk_hop_dong_doanh_thu check (doanh_thu_thuan = gia_niem_yet - so_tien_giam),
  constraint chk_hop_dong_giam check (so_tien_giam <= gia_niem_yet));
create table public.lop(id uuid primary key default gen_random_uuid(), chuong_trinh_ma text, ten_lop text);
create table public.hoc_sinh(id uuid primary key default gen_random_uuid(), ho_ten text, ma_hoc_sinh text);
create table public.ghi_danh(id uuid primary key default gen_random_uuid(), hoc_sinh_id uuid, lop_id uuid, trang_thai text not null default 'dang_hoc');
create table public.ky_dong_hoc_phi(id uuid primary key default gen_random_uuid(), hop_dong_id uuid, so_tien_du_kien bigint, ngay_den_han date);
create table public.phieu_thu(id uuid primary key default gen_random_uuid(), hop_dong_id uuid, ky_dong_id uuid, so_tien bigint, la_phieu_dao boolean not null default false);
create view public.v_thuc_thu_hop_dong as
  select hd.id as hop_dong_id, coalesce(sum(case when pt.la_phieu_dao then -pt.so_tien else pt.so_tien end),0) as thuc_thu
  from public.hop_dong_hoc_phi hd left join public.phieu_thu pt on pt.hop_dong_id = hd.id group by hd.id;
-- bản trigger chặn sửa tài chính đang chạy trên production (0055)
create function public.chan_sua_tai_chinh_hop_dong() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.nguon', true), '') <> 'sua_master' and old.trang_thai <> 'nhap'
     and (new.doanh_thu_thuan is distinct from old.doanh_thu_thuan or new.so_tien_giam is distinct from old.so_tien_giam) then
    raise exception 'Thay đổi giá, giảm giá hoặc hình thức đóng của hợp đồng phải được đề xuất và Master Admin phê duyệt.';
  end if; return new; end; $$;
create trigger trg_hop_dong_chan_sua_tai_chinh before update on public.hop_dong_hoc_phi for each row execute function public.chan_sua_tai_chinh_hop_dong();
`);
await db.exec(mig54);
// view bản cũ để chứng minh 0056 thay được
await db.exec(`create view public.v_tai_chinh_hop_dong as select hd.id as hop_dong_id, hd.ghi_danh_id, gd.lop_id, l.chuong_trinh_ma, hd.doanh_thu_thuan, tt.thuc_thu,
  hd.doanh_thu_thuan::numeric - tt.thuc_thu as con_phai_thu, hd.trang_thai, hd.kich_hoat_luc
  from public.hop_dong_hoc_phi hd join public.ghi_danh gd on gd.id=hd.ghi_danh_id join public.lop l on l.id=gd.lop_id
  join public.v_thuc_thu_hop_dong tt on tt.hop_dong_id=hd.id where hd.deleted_at is null;
create view public.v_hop_dong_qua_han as
  select hd.id as hop_dong_id, hs.ho_ten, hs.ma_hoc_sinh, l.ten_lop,
    sum(greatest(ky.so_tien_du_kien::numeric - coalesce(dt.da_thu_trong_ky, 0::numeric), 0::numeric)) as so_tien_cham,
    max(current_date - ky.ngay_den_han) as so_ngay_tre_nhat
  from public.hop_dong_hoc_phi hd join public.ghi_danh gd on gd.id=hd.ghi_danh_id join public.hoc_sinh hs on hs.id=gd.hoc_sinh_id
  join public.lop l on l.id=gd.lop_id join public.ky_dong_hoc_phi ky on ky.hop_dong_id=hd.id
  left join (select ky_dong_id, sum(case when la_phieu_dao then -so_tien else so_tien end) as da_thu_trong_ky from public.phieu_thu where ky_dong_id is not null group by ky_dong_id) dt on dt.ky_dong_id=ky.id
  where hd.deleted_at is null and hd.trang_thai='dang_hoat_dong' and ky.ngay_den_han < current_date and coalesce(dt.da_thu_trong_ky,0) < ky.so_tien_du_kien::numeric
  group by hd.id, hs.ho_ten, hs.ma_hoc_sinh, l.ten_lop;`);
await db.exec(mig56);
await db.exec(mig56); // idempotent

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error("FAIL:", msg); } else console.log("ok:", msg); };
const loi = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return String(e.message); } };
const q = async (sql) => (await db.query(sql)).rows;
const as = (uid) => `select set_config('app.uid', '${uid}', false);`;

const U = (n) => `00000000-0000-0000-0000-0000000000${n}`;
const MASTER = U("a1"), KETOAN = U("a2"), ADMINTS = U("a3"), THUNGAN = U("a4");
await db.exec(`insert into public.users(id, vai_tro) values ('${MASTER}','master_admin'),('${KETOAN}','ke_toan'),('${ADMINTS}','admin_ts'),('${THUNGAN}','thu_ngan');
insert into public.lop(id, chuong_trinh_ma, ten_lop) values ('${U("c1")}','001','Lop A');
insert into public.hoc_sinh(id, ho_ten, ma_hoc_sinh) values ('${U("d1")}','Minh','101'),('${U("d2")}','Phuoc','102');
insert into public.ghi_danh(id, hoc_sinh_id, lop_id, trang_thai) values ('${U("e1")}','${U("d1")}','${U("c1")}','da_nghi'),('${U("e2")}','${U("d2")}','${U("c1")}','dang_hoc');`);

const HD = U("b1"), HD2 = U("b2");
await db.exec(`${as(MASTER)}
insert into public.hop_dong_hoc_phi(id, ghi_danh_id, gia_niem_yet, so_tien_giam, doanh_thu_thuan, hinh_thuc_dong, trang_thai)
  values ('${HD}', '${U("e1")}', 25000000, 0, 25000000, 'hang_thang', 'dang_hoat_dong'),
         ('${HD2}', '${U("e2")}', 10000000, 0, 10000000, 'hang_thang', 'dang_hoat_dong');
insert into public.phieu_thu(hop_dong_id, so_tien) values ('${HD}', 3000000);
insert into public.ky_dong_hoc_phi(hop_dong_id, so_tien_du_kien, ngay_den_han) values ('${HD}', 5000000, current_date - 10), ('${HD2}', 5000000, current_date - 10);`);

// --- ràng buộc / mặc định
let hd = (await q(`select * from public.hop_dong_hoc_phi where id='${HD}'`))[0];
ok(String(hd.so_tien_mien_cong_no) === "0", "cột mới mặc định 0 (code cũ vẫn chạy)");
ok((await loi(`update public.hop_dong_hoc_phi set so_tien_mien_cong_no = 100 where id='${HD}'`))?.includes("phê duyệt"), "sửa tay cột miễn công nợ ngoài RPC bị trigger chặn");
await db.exec(as("")); // như SQL Editor (không có JWT) để thử riêng ràng buộc CHECK
ok((await loi(`update public.hop_dong_hoc_phi set so_tien_mien_cong_no = 100 where id='${HD}'`))?.includes("chk_hop_dong_doanh_thu"), "ràng buộc: đổi mien mà không đổi doanh thu bị chặn");
await db.exec(as(MASTER));

// --- chặn huỷ khi đã có phiếu thu (đường trực tiếp, kể cả master)
let e = await loi(`update public.hop_dong_hoc_phi set trang_thai='da_huy' where id='${HD}'`);
ok(e && e.includes("không thể huỷ"), "TRIGGER chặn huỷ hợp đồng đã có phiếu thu");
ok(await loi(`update public.hop_dong_hoc_phi set trang_thai='da_huy' where id='${HD2}'`) === null, "hợp đồng chưa có phiếu thu vẫn huỷ được");

// --- quyền tất toán
for (const [ten, uid] of [["thu_ngan", THUNGAN], ["người lạ", U("ff")]]) {
  await db.exec(as(uid));
  e = await loi(`select public.tat_toan_hop_dong('${HD}', 'Học sinh nghỉ học')`);
  ok(e && e.includes("Chỉ Master Admin"), `${ten} KHÔNG tất toán được`);
}
await db.exec(as(MASTER));
e = await loi(`select public.tat_toan_hop_dong('${HD}', '  ')`);
ok(e && e.includes("lý do"), "thiếu lý do bị từ chối");
e = await loi(`select public.tat_toan_hop_dong('${HD2}', 'Hợp đồng đã huỷ ở trên')`);
ok(e && e.includes("hoạt động hoặc đã hoàn thành"), "hợp đồng đã huỷ không tất toán được");

// --- admin_ts tất toán Minh (đã thu 3tr, còn 22tr) — người KHÔNG phải master, trigger chặn sửa tài chính phải cho qua
await db.exec(as(ADMINTS));
const res = (await q(`select public.tat_toan_hop_dong('${HD}', 'Học sinh nghỉ học, miễn phần còn lại') r`))[0].r;
ok(res.so_tien_mien === 22000000 && res.thuc_thu === 3000000, "trả về miễn 22tr, thực thu 3tr");
ok(res.doanh_thu_thuan_cu === 25000000 && res.doanh_thu_thuan_moi === 3000000, "doanh thu thuần 25tr -> 3tr (= thực thu)");
hd = (await q(`select * from public.hop_dong_hoc_phi where id='${HD}'`))[0];
ok(hd.trang_thai === "hoan_thanh" && String(hd.so_tien_mien_cong_no) === "22000000" && String(hd.doanh_thu_thuan) === "3000000", "hợp đồng hoan_thanh, mien=22tr, doanh thu=3tr");
ok(String(hd.so_tien_giam) === "0" && hd.loai_giam_gia === "khong", "so_tien_giam/loai_giam_gia KHÔNG bị nhiễm (giảm giá vẫn đúng nghĩa)");
ok(hd.ghi_chu.includes("Tất toán") && hd.ghi_chu.includes("miễn 22000000"), "ghi chú hợp đồng ghi dấu tất toán");
let log = await q(`select * from public.nhat_ky where doi_tuong_id='${HD}' and hanh_dong='tat_toan_hop_dong'`);
ok(log.length === 1 && log[0].nguoi_dung_id === ADMINTS && log[0].ly_do.includes("miễn phần còn lại"), "nhật ký tat_toan_hop_dong: đúng người + lý do");
ok(String(log[0].sau.so_tien_mien_cong_no) === "22000000", "nhật ký diff có so_tien_mien_cong_no");
let v = (await q(`select con_phai_thu from public.v_tai_chinh_hop_dong where hop_dong_id='${HD}'`))[0];
ok(String(v.con_phai_thu) === "0", "sau tất toán còn phải thu = 0");

// --- tất toán lại / không còn nợ
e = await loi(`select public.tat_toan_hop_dong('${HD}', 'Tất toán lần hai')`);
ok(e && e.includes("không còn công nợ"), "tất toán lần hai bị từ chối");

// --- sửa giá (master) bị chặn với hợp đồng đã tất toán
await db.exec(as(MASTER));
e = await loi(`select public.sua_hop_dong_master('${HD}', 30000000, 'khong', 0, 'hang_thang', null, 'Thử sửa giá sau tất toán')`);
ok(e && e.includes("đã được tất toán"), "Master không sửa giá hợp đồng đã tất toán (tránh vỡ ràng buộc)");

// --- thu muộn sau tất toán vẫn cho thu dư? (view báo âm → thu dư, đúng nghiệp vụ "Thu dư")
// --- view công nợ: hợp đồng da_huy => con_phai_thu 0
v = (await q(`select con_phai_thu from public.v_tai_chinh_hop_dong where hop_dong_id='${HD2}'`))[0];
ok(String(v.con_phai_thu) === "0", "hợp đồng da_huy: con_phai_thu = 0 (không treo 10tr)");

// --- quá hạn: học sinh đã nghỉ bị loại, học sinh đang học giữ nguyên
await db.exec(`update public.hop_dong_hoc_phi set trang_thai='dang_hoat_dong' where id='${HD2}'`);
const qh = await q(`select hop_dong_id from public.v_hop_dong_qua_han`);
ok(qh.length === 1 && qh[0].hop_dong_id === HD2, "quá hạn: chỉ còn học sinh đang học");
await db.exec(`update public.ghi_danh set trang_thai='da_nghi' where id='${U("e2")}'`);
ok((await q(`select 1 from public.v_hop_dong_qua_han`)).length === 0, "học sinh vừa nghỉ không còn bị báo quá hạn");

process.exit(fail ? 1 : 0);
