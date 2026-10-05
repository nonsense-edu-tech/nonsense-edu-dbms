import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0054 (sửa hợp đồng cho master_admin + nhật ký tự động) trên PGlite với schema giả lập
// — KHÔNG đụng DB thật. Chạy: npm run test:hop-dong-nhat-ky
const dir = path.dirname(fileURLToPath(import.meta.url));
const mig = fs.readFileSync(path.join(dir, "../migrations/0054_master_sua_hop_dong_va_nhat_ky.sql"), "utf8");

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
create table public.phieu_thu(id uuid primary key default gen_random_uuid(), hop_dong_id uuid, so_tien bigint);
create table public.ky_dong_hoc_phi(id uuid primary key default gen_random_uuid(), hop_dong_id uuid, so_tien_du_kien bigint);
`);
await db.exec(mig);
await db.exec(mig); // idempotent

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error("FAIL:", msg); } else console.log("ok:", msg); };
const loi = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return String(e.message); } };
const q = async (sql) => (await db.query(sql)).rows;
const as = (uid) => `select set_config('app.uid', '${uid}', false);`;

const MASTER = "00000000-0000-0000-0000-0000000000a1";
const KETOAN = "00000000-0000-0000-0000-0000000000a2";
const HD = "00000000-0000-0000-0000-0000000000b1";
await db.exec(`
insert into public.users(id, vai_tro, ho_ten) values ('${MASTER}','master_admin','Master'),('${KETOAN}','ke_toan','Ke toan');
${as(MASTER)}
insert into public.hop_dong_hoc_phi(id, ghi_danh_id, gia_niem_yet, so_tien_giam, doanh_thu_thuan, hinh_thuc_dong, trang_thai)
  values ('${HD}', gen_random_uuid(), 25000000, 0, 25000000, 'hang_thang', 'dang_hoat_dong');
insert into public.phieu_thu(hop_dong_id, so_tien) values ('${HD}', 8500000);
insert into public.ky_dong_hoc_phi(hop_dong_id, so_tien_du_kien) select '${HD}', 2500000 from generate_series(1,10);
`);

// --- nhật ký INSERT
let log = await q(`select * from public.nhat_ky where doi_tuong_id='${HD}'`);
ok(log.length === 1 && log[0].hanh_dong === "tao_hop_dong" && log[0].nguoi_dung_id === MASTER, "INSERT hợp đồng được ghi nhật ký tao_hop_dong, gắn đúng người");

// --- quyền
await db.exec(as(KETOAN));
let e = await loi(`select public.sua_hop_dong_master('${HD}', 23500000, 'khong', 0, 'hang_thang', null, 'Theo thỏa thuận')`);
ok(e && e.includes("Chỉ Master Admin"), "ke_toan KHÔNG sửa được qua RPC");
await db.exec(as("00000000-0000-0000-0000-0000000000ff"));
e = await loi(`select public.sua_hop_dong_master('${HD}', 23500000, 'khong', 0, 'hang_thang', null, 'Theo thỏa thuận')`);
ok(e && e.includes("Chỉ Master Admin"), "người không có trong users KHÔNG sửa được");

// --- master
await db.exec(as(MASTER));
e = await loi(`select public.sua_hop_dong_master('${HD}', 23500000, 'khong', 0, 'hang_thang', null, '  ')`);
ok(e && e.includes("lý do"), "thiếu lý do bị từ chối");
e = await loi(`select public.sua_hop_dong_master('${HD}', 25000000, 'khong', 0, 'hang_thang', null, 'Không đổi gì cả')`);
ok(e && e.includes("Không có thay đổi"), "không đổi gì bị từ chối (không sinh log rác)");
e = await loi(`select public.sua_hop_dong_master('${HD}', 25000000, 'phan_tram', 101, 'hang_thang', null, 'Giảm quá tay')`);
ok(e && e.includes("100"), "phần trăm > 100 bị từ chối");
e = await loi(`select public.sua_hop_dong_master('${HD}', -1, 'khong', 0, 'hang_thang', null, 'Giá âm')`);
ok(e && e.includes("≥ 0"), "giá âm bị từ chối");
e = await loi(`select public.sua_hop_dong_master('${HD}', 25000000, 'khong', 0, 'moi_thang', null, 'Hình thức sai')`);
ok(e && e.includes("Hình thức"), "hình thức đóng sai bị từ chối");
log = await q(`select * from public.nhat_ky where doi_tuong_id='${HD}'`);
ok(log.length === 1, "các lần bị từ chối KHÔNG sinh thêm nhật ký");

// ca thật: 25tr -> giữ niêm yết 25tr, giảm cố định 1,5tr
let res = (await q(`select public.sua_hop_dong_master('${HD}', 25000000, 'co_dinh', 1500000, 'hang_thang', 'Thỏa thuận riêng', 'Sheet ghi 23,5tr, phụ huynh được giảm 1,5tr') r`))[0].r;
ok(res.doanh_thu_thuan_cu === 25000000 && res.doanh_thu_thuan_moi === 23500000, "trả về doanh thu cũ/mới đúng");
ok(res.thuc_thu === 8500000 && res.so_ky === 10 && res.tong_ky_du_kien === 25000000, "trả về thực thu + tổng kỳ để UI cảnh báo lệch");
let hd = (await q(`select * from public.hop_dong_hoc_phi where id='${HD}'`))[0];
ok(hd.so_tien_giam === 1500000 || String(hd.so_tien_giam) === "1500000", "so_tien_giam tính lại đúng");
ok(String(hd.doanh_thu_thuan) === "23500000" && hd.ghi_chu === "Thỏa thuận riêng", "doanh_thu_thuan + ghi_chu đã cập nhật");

log = await q(`select * from public.nhat_ky where doi_tuong_id='${HD}' order by created_at, id`);
const sua = log.filter((l) => l.hanh_dong === "sua_hop_dong");
ok(sua.length === 1, "đúng 1 dòng nhật ký sua_hop_dong");
const l0 = sua[0];
ok(l0.ly_do === "Sheet ghi 23,5tr, phụ huynh được giảm 1,5tr", "nhật ký lưu lý do");
ok(l0.nguoi_dung_id === MASTER, "nhật ký lưu đúng người sửa");
ok(String(l0.truoc.doanh_thu_thuan) === "25000000" && String(l0.sau.doanh_thu_thuan) === "23500000", "diff truoc/sau doanh_thu_thuan đúng");
ok(!("hinh_thuc_dong" in l0.truoc) && !("trang_thai" in l0.truoc), "diff chỉ chứa cột thật sự đổi");

// phần trăm làm tròn
res = (await q(`select public.sua_hop_dong_master('${HD}', 19900000, 'phan_tram', 10, 'mot_lan', null, 'Đổi sang đóng một lần 10%') r`))[0].r;
ok(res.doanh_thu_thuan_moi === 17910000, "giảm 10% của 19,9tr = 17,91tr");

// --- đường khác (không qua RPC) cũng bị ghi log
await db.exec(as(MASTER));
await db.exec(`update public.hop_dong_hoc_phi set trang_thai='da_huy' where id='${HD}'`);
log = await q(`select hanh_dong, ly_do from public.nhat_ky where doi_tuong_id='${HD}' order by created_at desc, id desc limit 1`);
ok(log[0].hanh_dong === "huy_hop_dong" && log[0].ly_do === null, "UPDATE trực tiếp (huỷ) vẫn được ghi log, không dính lý do cũ");
e = await loi(`select public.sua_hop_dong_master('${HD}', 1, 'khong', 0, 'mot_lan', null, 'Sửa hợp đồng đã huỷ')`);
ok(e && e.includes("đã huỷ"), "hợp đồng đã huỷ không sửa được");

// updated_at đơn thuần không sinh log
const HD2 = "00000000-0000-0000-0000-0000000000b2";
await db.exec(`insert into public.hop_dong_hoc_phi(id, ghi_danh_id, gia_niem_yet, doanh_thu_thuan, hinh_thuc_dong) values ('${HD2}', gen_random_uuid(), 100, 100, 'mot_lan')`);
await db.exec(`update public.hop_dong_hoc_phi set updated_at = now() where id='${HD2}'`);
log = await q(`select count(*)::int n from public.nhat_ky where doi_tuong_id='${HD2}'`);
ok(log[0].n === 1, "chỉ đổi updated_at không sinh log (chỉ còn dòng tao_hop_dong)");

// --- nhật ký chỉ-thêm
e = await loi(`update public.nhat_ky set hanh_dong='x'`);
ok(e && e.includes("chỉ được thêm"), "UPDATE nhat_ky bị chặn");
e = await loi(`delete from public.nhat_ky`);
ok(e && e.includes("chỉ được thêm"), "DELETE nhat_ky bị chặn");

// --- anon không gọi được RPC
const priv = await q(`select has_function_privilege('anon', 'public.sua_hop_dong_master(uuid,bigint,text,bigint,text,text,text)', 'execute') a,
  has_function_privilege('authenticated', 'public.sua_hop_dong_master(uuid,bigint,text,bigint,text,text,text)', 'execute') u`);
ok(priv[0].a === false && priv[0].u === true, "anon không có quyền execute RPC, authenticated có");

process.exit(fail ? 1 : 0);
