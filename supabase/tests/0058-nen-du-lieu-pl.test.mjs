import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0058 (nền dữ liệu P&L theo lớp) trên PGlite với schema giả lập — KHÔNG đụng DB thật.
// Chạy: npm run test:nen-du-lieu-pl
const dir = path.dirname(fileURLToPath(import.meta.url));
const mig = fs.readFileSync(path.join(dir, "../migrations/0058_nen_du_lieu_pl_theo_lop.sql"), "utf8");

const db = new PGlite({ extensions: { btree_gist } });
await db.exec(`
create schema extensions;
create schema auth;
create role authenticated; create role anon;
grant usage on schema public, auth to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated, anon;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
create function public.uuidv7() returns uuid language sql as $$ select gen_random_uuid() $$;
create table public.users(id uuid primary key, vai_tro text);
create function public.auth_role() returns text language sql stable security definer as $$ select vai_tro from public.users where id = auth.uid() $$;
create table public.user_chi_nhanh(user_id uuid, chi_nhanh_id uuid);
create table public.lop(id uuid primary key default gen_random_uuid(), ma_lop text, ten_lop text, chuong_trinh_ma char(3), chi_nhanh_id uuid);
create table public.ghi_danh(id uuid primary key default gen_random_uuid(), lop_id uuid);
create table public.buoi_hoc(id uuid primary key default gen_random_uuid(), lop_id uuid not null references public.lop(id), mon_hoc_ma smallint not null,
  gv_id uuid, phong_hoc_id uuid, ngay date not null, gio_bat_dau time, gio_ket_thuc time, thu_lao_gv bigint, chi_phi_phong bigint,
  trang_thai text not null default 'du_kien', deleted_at timestamptz, unique (lop_id, mon_hoc_ma, ngay));
grant all on public.buoi_hoc, public.users, public.lop, public.user_chi_nhanh to authenticated;
create view public.buoi_hoc_chi_phi as select id, lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, thu_lao_gv, chi_phi_phong, trang_thai, deleted_at from public.buoi_hoc where public.auth_role() = any (array['master_admin','ke_toan']);
create view public.buoi_hoc_lich as select id, lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, deleted_at from public.buoi_hoc;
insert into public.users values ('00000000-0000-0000-0000-000000000001','ke_toan'),('00000000-0000-0000-0000-000000000002','gv'),('00000000-0000-0000-0000-000000000003','master_admin');
insert into public.lop(ma_lop,ten_lop,chuong_trinh_ma) values
 ('101026001','V-ACT _ B24-01','010'),('101026005','V-ACT _ A-02 _ 26.27','010'),('202126001','Nội B','021'),('202226001','Ngoại D','022');
insert into public.lop(ma_lop,ten_lop,chuong_trinh_ma) values ('999999999','Lớp khác','030');
`);
await db.exec(mig);

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error("FAIL:", m); } else console.log("ok:", m); };
const lop = async (ma) => (await db.query(`select * from public.lop where ma_lop='${ma}'`)).rows[0];

let r = await lop("101026001"); ok(r.so_buoi_tuan === 4 && r.hinh_thuc_mac_dinh === "offline", "V-ACT B: 4 buổi/tuần, offline");
r = await lop("101026005"); ok(r.so_buoi_tuan === 4 && r.hinh_thuc_mac_dinh === "online", "V-ACT A-02: online");
r = await lop("202126001"); ok(r.so_buoi_tuan === 2 && r.hinh_thuc_mac_dinh === "omo", "Nội trú: 2 buổi/tuần, OMO");
r = await lop("202226001"); ok(r.so_buoi_tuan === 2 && r.hinh_thuc_mac_dinh === "omo", "Ngoại: 2 buổi/tuần, OMO");
r = await lop("999999999"); ok(r.so_buoi_tuan === null && r.hinh_thuc_mac_dinh === null, "chương trình khác: không bị đụng");

const lopId = (await lop("101026001")).id;
const ins = (gio) => db.exec(`insert into public.buoi_hoc(lop_id, mon_hoc_ma, ngay, gio_bat_dau, loai_buoi) values ('${lopId}',1,'2026-10-07',${gio},'${gio === "null" ? "chinh_khoa" : "tang_cuong"}')`);
await ins("'08:00'"); await ins("'18:00'");
ok(true, "2 buổi cùng lớp/môn/ngày khác giờ: được phép");
let dup = false; try { await ins("'08:00'"); } catch { dup = true; }
ok(dup, "trùng (lớp, môn, ngày, giờ): bị chặn");
await ins("null"); dup = false; try { await ins("null"); } catch { dup = true; }
ok(dup, "trùng khi giờ NULL: vẫn bị chặn (NULLS NOT DISTINCT)");

// Đơn giá: không chồng thời gian
const u = "00000000-0000-0000-0000-000000000002";
const dg = (tu, den) => db.exec(`insert into public.don_gia_giang_day(user_id,vai_tro,hinh_thuc_hoc,cach_tinh,don_gia,hieu_luc_tu,hieu_luc_den) values ('${u}','gv_chinh','offline','theo_buoi',500000,'${tu}',${den ? `'${den}'` : "null"})`);
await dg("2026-06-01", "2026-12-31");
let ov = false; try { await dg("2026-12-01", null); } catch { ov = true; }
ok(ov, "đơn giá chồng khoảng hiệu lực: bị chặn");
await dg("2027-01-01", null); ok(true, "đơn giá nối tiếp: được phép");

// Ẩn chi phí
const priv = async (t, c) => (await db.query(`select has_column_privilege('authenticated','public.${t}','${c}','SELECT') as p`)).rows[0].p;
ok(!(await priv("buoi_hoc_nhan_su", "thu_lao")), "authenticated KHÔNG đọc trực tiếp thu_lao");
ok(await priv("buoi_hoc_nhan_su", "vai_tro"), "authenticated đọc được cột không phải chi phí");
ok(await priv("buoi_hoc", "loai_buoi"), "cột mới của buoi_hoc được GRANT");

const bh = (await db.query(`select id from public.buoi_hoc limit 1`)).rows[0].id;
await db.exec(`insert into public.buoi_hoc_nhan_su(buoi_hoc_id,user_id,vai_tro,thu_lao) values ('${bh}','${u}','gv_chinh',400000)`);
const as = async (uid, sql) => { await db.exec(`set app.uid='${uid}'; set role authenticated;`); try { return (await db.query(sql)).rows; } finally { await db.exec(`reset role;`); } };
ok((await as("00000000-0000-0000-0000-000000000001", "select thu_lao from public.buoi_hoc_nhan_su_chi_phi")).length === 1, "kế toán thấy thù lao qua view chi phí");
ok((await as(u, "select thu_lao from public.buoi_hoc_nhan_su_chi_phi")).length === 0, "GV không thấy thù lao qua view chi phí");
ok((await as("00000000-0000-0000-0000-000000000001", "select * from public.don_gia_giang_day")).length === 2, "kế toán đọc được đơn giá");
ok((await as(u, "select * from public.don_gia_giang_day")).length === 0, "GV không đọc được đơn giá");

if (fail) { console.error(`\n${fail} test FAIL`); process.exit(1); }
console.log("\nTất cả test đạt.");
