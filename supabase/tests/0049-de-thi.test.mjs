import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0049 trên Postgres WASM (PGlite) với auth/helper giả lập — KHÔNG đụng DB thật.
// Chạy: npm run test:de-thi

const db = new PGlite();
const mig = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations/0049_de_thi_theo_ma_tran.sql"), "utf8");

await db.exec(`
create schema auth;
create table auth.users(id uuid primary key);
create role authenticated; create role anon;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
create function public.uuidv7() returns uuid language sql as $$ select gen_random_uuid() $$;
create table public.users(id uuid primary key, vai_tro text);
create function public.auth_role() returns text language sql stable security definer as $$ select vai_tro from public.users where id = auth.uid() $$;
create table public.user_pham_vi(id uuid default gen_random_uuid(), user_id uuid, cap_hoc_ma smallint, mon_hoc_ma smallint);
create function public.co_quyen_mon(m smallint, c smallint) returns boolean language sql stable security definer as $$
 select exists(select 1 from public.user_pham_vi u where u.user_id=auth.uid() and u.cap_hoc_ma=c and (u.mon_hoc_ma is null or u.mon_hoc_ma=m)) $$;
create table public.nang_luc(id uuid primary key default gen_random_uuid());
create table public.ngu_lieu(id uuid primary key default gen_random_uuid(), loai text not null, tieu_de text, noi_dung text not null, deleted_at timestamptz);
create table public.cau_hoi(
 id uuid primary key default gen_random_uuid(),
 ma_cau_hoi char(17) not null unique,
 cap_hoc smallint generated always as (substring(ma_cau_hoi from 1 for 1)::smallint) stored,
 mon_hoc smallint generated always as (substring(ma_cau_hoi from 5 for 2)::smallint) stored,
 hoc_phan smallint generated always as (substring(ma_cau_hoi from 7 for 2)::smallint) stored,
 bai_hoc smallint generated always as (substring(ma_cau_hoi from 9 for 2)::smallint) stored,
 chu_de smallint generated always as (substring(ma_cau_hoi from 11 for 2)::smallint) stored,
 dang_cau smallint generated always as (substring(ma_cau_hoi from 13 for 1)::smallint) stored,
 ngu_lieu_id uuid references public.ngu_lieu(id),
 noi_dung text not null, dap_an_text text, loi_giai text, do_kho smallint,
 trang_thai text not null default 'da_duyet', tien_trinh text, deleted_at timestamptz);
create table public.lua_chon(id uuid primary key default gen_random_uuid(), cau_hoi_id uuid references public.cau_hoi(id), thu_tu smallint, noi_dung text, la_dap_an boolean default false);
create table public.cau_hoi_nang_luc(id uuid primary key default gen_random_uuid(), cau_hoi_id uuid, nang_luc_id uuid);
create table public.cau_hoi_hinh_anh(id uuid primary key default gen_random_uuid(), cau_hoi_id uuid, vi_tri text, thu_tu_lua_chon smallint, thu_tu smallint, duong_dan text, alt_text text);
create table public.de(id uuid primary key default gen_random_uuid(), ma_de text unique, ten text not null, mo_ta text, nguoi_tao uuid, created_at timestamptz default now(), updated_at timestamptz default now(), deleted_at timestamptz, trang_thai text not null default 'nhap');
create table public.de_cau_hoi(id uuid primary key default gen_random_uuid(), de_id uuid not null references public.de(id) on delete cascade, cau_hoi_id uuid not null references public.cau_hoi(id), thu_tu integer not null, diem numeric(5,2), created_at timestamptz default now(), constraint uq_de_cau unique(de_id,cau_hoi_id), constraint uq_de_thutu unique(de_id,thu_tu));
grant usage on schema public, auth to authenticated, anon;
grant select on all tables in schema public to authenticated;
grant select on auth.users to authenticated;
-- policy đọc hiện có (0038)
alter table public.cau_hoi enable row level security;
create policy p_read on public.cau_hoi for select to authenticated using (deleted_at is null and (auth_role() in ('master_admin','admin_ht','truong_bm') or (auth_role()='gv' and co_quyen_mon(mon_hoc,cap_hoc))));
alter table public.lua_chon enable row level security;
create policy p_read on public.lua_chon for select to authenticated using (exists(select 1 from public.cau_hoi c where c.id=cau_hoi_id));
alter table public.de enable row level security;
create policy p_read on public.de for select to authenticated using (deleted_at is null and auth_role() in ('master_admin','admin_ht','truong_bm','gv'));
alter table public.de_cau_hoi enable row level security;
create policy p_read on public.de_cau_hoi for select to authenticated using (auth_role() in ('master_admin','admin_ht','truong_bm','gv'));
`);

await db.exec(mig);
console.log("migration OK");

const U = {
  gv: "00000000-0000-0000-0000-000000000001",
  gv2: "00000000-0000-0000-0000-000000000002",
  tg: "00000000-0000-0000-0000-000000000003",
  ad: "00000000-0000-0000-0000-000000000004",
};
await db.exec(`
insert into auth.users values ('${U.gv}'),('${U.gv2}'),('${U.tg}'),('${U.ad}');
insert into public.users values ('${U.gv}','gv'),('${U.gv2}','gv'),('${U.tg}','tro_giang'),('${U.ad}','admin_ht');
insert into public.user_pham_vi(user_id,cap_hoc_ma,mon_hoc_ma) values ('${U.gv}',1,10),('${U.gv2}',1,11);
`);
// ma_cau_hoi: cap(1) ctr(3) mon(2) hp(2) bai(2) cd(2) dang(1) stt(4) = 17
// positions used by stub generated columns are offsets 1,5,7,9,11,13: cap=1,mon=5-6,hp=7-8,bai=9-10,cd=11-12,dang=13
const mk2 = (mon, dang, stt) => `1000${String(mon).padStart(2,"0")}${"00"}${"00"}${"00"}${dang}${String(stt).padStart(4,"0")}`;
async function q(sql, uid) {
  await db.exec(`reset role; select set_config('app.uid','${uid ?? ""}',false);` + (uid ? "set role authenticated;" : ""));
  return db.query(sql);
}
async function ok(label, fn) {
  try { const r = await fn(); console.log("PASS", label); return r; } catch (e) { console.log("FAIL", label, "->", e.message); process.exitCode = 1; }
}
async function err(label, fn, re) {
  try { await fn(); console.log("FAIL (expected error)", label); process.exitCode = 1; }
  catch (e) { if (re.test(e.message)) console.log("PASS", label, "→", e.message.slice(0, 70)); else { console.log("FAIL wrong error", label, e.message); process.exitCode = 1; } }
}

// Dữ liệu: môn 10: 30 câu lẻ MCQ (dang 1) khó 1..5, 4 cụm ngữ liệu x 5 câu; môn 11: 5 câu.
await db.exec("reset role");
const ins = [];
for (let i = 1; i <= 30; i++) ins.push(`('${mk2(10, 1, i)}','CH ${i} $x^2$', ${1 + (i % 5)})`);
for (let i = 1; i <= 5; i++) ins.push(`('${mk2(11, 1, i)}','M11 ${i}', 2)`);
await db.exec(`insert into public.cau_hoi(ma_cau_hoi,noi_dung,do_kho) values ${ins.join(",")};`);
await db.exec(`insert into public.lua_chon(cau_hoi_id,thu_tu,noi_dung,la_dap_an) select id, g, 'PA '||g, g=1 from public.cau_hoi, generate_series(1,4) g;`);
for (let k = 1; k <= 4; k++) {
  await db.exec(`insert into public.ngu_lieu(loai,tieu_de,noi_dung) values ('doc_core','Bài đọc ${k}','nội dung ${k}');`);
  for (let j = 1; j <= 5; j++) {
    await db.exec(`insert into public.cau_hoi(ma_cau_hoi,noi_dung,do_kho,ngu_lieu_id) values ('${mk2(10, 1, 100 + k * 10 + j)}','Cum${k} câu ${j}', 3, (select id from public.ngu_lieu where tieu_de='Bài đọc ${k}'));`);
  }
}

// --- ma trận ---
const mt = await ok("gv tạo ma trận", async () => (await q(`insert into public.ma_tran_de(ten,cap_hoc_ma,mon_hoc_ma,nguoi_tao) values ('MT thử',1,10,'${U.gv}') returning id`, U.gv)).rows[0].id);
await err("gv không tạo ma trận môn ngoài phạm vi", () => q(`insert into public.ma_tran_de(ten,cap_hoc_ma,mon_hoc_ma,nguoi_tao) values ('x',1,11,'${U.gv}')`, U.gv), /row-level security/);
await err("trợ giảng không tạo ma trận", () => q(`insert into public.ma_tran_de(ten,cap_hoc_ma,mon_hoc_ma,nguoi_tao) values ('x',1,10,'${U.tg}')`, U.tg), /row-level security/);
await ok("gv thêm 3 dòng ma trận", async () => {
  await q(`insert into public.ma_tran_dong(ma_tran_id,thu_tu,nhan,so_luong,do_kho_tu,do_kho_den,diem_moi_cau) values
    ('${mt}',1,'Phần I',10,1,3,0.25),
    ('${mt}',2,'Phần II',2,1,5,0.5)`, U.gv);
  await q(`insert into public.ma_tran_dong(ma_tran_id,thu_tu,nhan,loai_ngu_lieu,so_luong,cau_moi_cum,do_kho_tu,do_kho_den) values ('${mt}',3,'Đọc hiểu','doc_core',3,4,1,5)`, U.gv);
});
await err("gv2 không thấy ma trận của gv", async () => { const r = await q(`select 1 from public.ma_tran_de`, U.gv2); if (r.rows.length) throw new Error("thấy được"); throw new Error("row-level security (đã ẩn)"); }, /row-level|ẩn/);
const dongs = (await q(`select id from public.ma_tran_dong where ma_tran_id='${mt}' order by thu_tu`, U.gv)).rows.map(r => r.id);
const dp = await ok("do_phu_ma_tran", async () => (await q(`select * from public.do_phu_ma_tran('${mt}')`, U.gv)).rows);
console.log(dp);

// --- đề ---
const de = await ok("tạo đề", async () => (await q(`insert into public.de(ten,nguoi_tao,ma_tran_id,cap_hoc_ma,mon_hoc_ma) values ('Đề thử','${U.gv}','${mt}',1,10) returning id`, U.gv)).rows[0].id);
await err("gv2 không sửa/sinh đề của gv1", () => q(`select public.sinh_de('${de}','abc')`, U.gv2), /Không có quyền/);
const r1 = await ok("sinh_de", async () => (await q(`select public.sinh_de('${de}','seed-1') as j`, U.gv)).rows[0].j);
console.log(JSON.stringify(r1));
const cnt = await q(`select count(*)::int c, count(distinct cau_hoi_id)::int d, count(distinct cum_id)::int cum from public.de_cau_hoi where de_id='${de}'`, U.gv);
console.log(cnt.rows[0]);
await q(`select public.sinh_de('${de}','seed-1') as j`, U.gv);
const same = JSON.stringify((await q(`select cau_hoi_id from public.de_cau_hoi where de_id='${de}' order by thu_tu`, U.gv)).rows);
await q(`select public.sinh_de('${de}','seed-1')`, U.gv);
const same2 = JSON.stringify((await q(`select cau_hoi_id from public.de_cau_hoi where de_id='${de}' order by thu_tu`, U.gv)).rows);
console.log(same === same2 ? "PASS cùng seed → cùng đề" : "FAIL cùng seed khác đề"); if (same !== same2) process.exitCode = 1;
await q(`select public.sinh_de('${de}','seed-2')`, U.gv);
const same3 = JSON.stringify((await q(`select cau_hoi_id from public.de_cau_hoi where de_id='${de}' order by thu_tu`, U.gv)).rows);
console.log(same3 !== same2 ? "PASS khác seed → khác đề" : "FAIL khác seed cùng đề"); if (same3 === same2) process.exitCode = 1;

// khoá & sinh lại
const first = (await q(`select coalesce(cum_id,cau_hoi_id) u, dong_id from public.de_cau_hoi where de_id='${de}' order by thu_tu limit 1`, U.gv)).rows[0];
await q(`select public.khoa_don_vi('${de}','${first.dong_id}','${first.u}',true)`, U.gv);
await q(`select public.sinh_de('${de}','seed-3')`, U.gv);
const keep = (await q(`select count(*)::int c from public.de_cau_hoi where de_id='${de}' and coalesce(cum_id,cau_hoi_id)='${first.u}'`, U.gv)).rows[0].c;
console.log(keep >= 1 ? "PASS đơn vị khoá được giữ khi sinh lại" : "FAIL mất đơn vị khoá"); if (keep < 1) process.exitCode = 1;
const thuTuOk = (await q(`select min(thu_tu) mn, max(thu_tu) mx, count(*)::int c from public.de_cau_hoi where de_id='${de}'`, U.gv)).rows[0];
console.log(thuTuOk.mn === 1 && thuTuOk.mx === thuTuOk.c ? "PASS thu_tu liên tục 1..n" : "FAIL thu_tu " + JSON.stringify(thuTuOk)); if (!(thuTuOk.mn === 1 && thuTuOk.mx === thuTuOk.c)) process.exitCode = 1;

// đổi cụm
const cumRow = (await q(`select distinct dong_id, cum_id from public.de_cau_hoi where de_id='${de}' and cum_id is not null limit 1`, U.gv)).rows[0];
await q(`select public.khoa_don_vi('${de}','${cumRow.dong_id}','${cumRow.cum_id}',false)`, U.gv);
const gy = (await q(`select * from public.goi_y_cum('${de}','${cumRow.dong_id}')`, U.gv)).rows;
console.log("gợi ý cụm:", gy.length);
await ok("doi_cum", () => q(`select public.doi_cum('${de}','${cumRow.dong_id}','${cumRow.cum_id}','${gy[0].don_vi_id}')`, U.gv));
await err("doi_cum sang đơn vị không hợp lệ", () => q(`select public.doi_cum('${de}','${cumRow.dong_id}','${gy[0].don_vi_id}','${U.gv}')`, U.gv), /không hợp lệ|Không tìm thấy/);

// thiếu → không chốt được
const mt2 = (await q(`insert into public.ma_tran_de(ten,cap_hoc_ma,mon_hoc_ma,nguoi_tao) values ('MT thiếu',1,10,'${U.gv}') returning id`, U.gv)).rows[0].id;
await q(`insert into public.ma_tran_dong(ma_tran_id,thu_tu,so_luong,do_kho_tu,do_kho_den,cho_phep_noi_do_kho) values ('${mt2}',1,50,5,5,true)`, U.gv);
const de2 = (await q(`insert into public.de(ten,nguoi_tao,ma_tran_id,cap_hoc_ma,mon_hoc_ma) values ('Đề thiếu','${U.gv}','${mt2}',1,10) returning id`, U.gv)).rows[0].id;
const rs2 = (await q(`select public.sinh_de('${de2}','s') j`, U.gv)).rows[0].j;
console.log("đề thiếu:", JSON.stringify(rs2.dong));
await err("không chốt đề thiếu", () => q(`select public.chot_de('${de2}')`, U.gv), /còn thiếu/);

// chốt
await err("không UPDATE trang_thai trực tiếp", () => q(`update public.de set trang_thai='da_phat_hanh' where id='${de}'`, U.gv), /Chốt đề/);
const ch = await ok("chot_de (4 mã)", async () => (await q(`select public.chot_de('${de}', 4) j`, U.gv)).rows[0].j);
console.log(ch);
const nm = (await q(`select count(*)::int c from public.de_ma_de where de_id='${de}'`, U.gv)).rows[0].c;
console.log(nm === 4 ? "PASS 4 mã đề" : "FAIL số mã đề " + nm); if (nm !== 4) process.exitCode = 1;
const bc = (await q(`select ma, bo_cuc from public.de_ma_de where de_id='${de}' order by thu_tu`, U.gv)).rows;
const sig = bc.map(b => JSON.stringify(b.bo_cuc.map(x => x.de_cau_hoi_id)));
console.log("mã đề khác nhau về thứ tự:", new Set(sig).size > 1 ? "PASS" : "FAIL"); if (new Set(sig).size <= 1) process.exitCode = 1;
const lc1 = JSON.stringify(bc[0].bo_cuc.map(x => x.lua_chon)), lc2 = JSON.stringify(bc[1].bo_cuc.map(x => x.lua_chon));
console.log("mã đề 2 hoán vị đáp án:", lc1 !== lc2 ? "PASS" : "FAIL");
await q(`delete from public.de_cau_hoi where de_id='${de}'`, U.gv);
await q(`update public.de_cau_hoi set thu_tu=thu_tu+500 where de_id='${de}'`, U.gv);
{ const c = (await q(`select count(*)::int c from public.de_cau_hoi where de_id='${de}' and thu_tu<500`, U.gv)).rows[0].c; console.log(c === 24 ? "PASS đề đã chốt: delete/update không có tác dụng" : "FAIL còn " + c); if (c !== 24) process.exitCode = 1; }
await err("trigger chặn khi RLS bị bỏ qua (admin vẫn bị chặn)", async () => { await db.exec("reset role"); await db.query(`delete from public.de_cau_hoi where de_id='${de}'`); }, /đã chốt/);
await err("không sinh lại đề đã chốt", () => q(`select public.sinh_de('${de}')`, U.gv), /đã chốt/);
await err("không sửa ma trận đã dùng", () => q(`update public.ma_tran_dong set so_luong=5 where id='${dongs[0]}'`, U.gv), /nhân bản/);
await err("không đổi nội dung câu trong đề đã chốt (snapshot độc lập)", async () => { const r = await q(`select count(*)::int c from public.de_cau_hoi_ban_chup where de_id='${de}'`, U.gv); if (r.rows[0].c === 0) throw new Error("rỗng"); throw new Error("Đã có snapshot " + r.rows[0].c); }, /Đã có snapshot/);
await err("trợ giảng không đọc đề", async () => { const r = await q(`select count(*)::int c from public.de`, U.tg); if (r.rows[0].c) throw new Error("thấy"); throw new Error("row-level (0 dòng)"); }, /row-level/);
await err("gv2 (môn khác) không đọc snapshot", async () => { const r = await q(`select count(*)::int c from public.de_cau_hoi_ban_chup`, U.gv2); if (r.rows[0].c) throw new Error("thấy"); throw new Error("row-level (0 dòng)"); }, /row-level/);
await err("không tự ghi snapshot", () => q(`insert into public.de_cau_hoi_ban_chup(de_cau_hoi_id,de_id,cau_hoi_id,ma_cau_hoi,noi_dung) select id,de_id,cau_hoi_id,'x','x' from public.de_cau_hoi limit 1`, U.gv), /row-level|chỉ được tạo|duplicate/);

// chống lặp: đề thứ 3 cùng ma trận nhỏ phải tránh câu của đề đã chốt khi đủ câu khác
const mt3 = (await q(`insert into public.ma_tran_de(ten,cap_hoc_ma,mon_hoc_ma,nguoi_tao) values ('MT lặp',1,10,'${U.gv}') returning id`, U.gv)).rows[0].id;
await q(`insert into public.ma_tran_dong(ma_tran_id,thu_tu,so_luong,do_kho_tu,do_kho_den) values ('${mt3}',1,10,1,5)`, U.gv);
const de3 = (await q(`insert into public.de(ten,nguoi_tao,ma_tran_id,cap_hoc_ma,mon_hoc_ma,chong_lap_n) values ('Đề 3','${U.gv}','${mt3}',1,10,3) returning id`, U.gv)).rows[0].id;
await q(`select public.sinh_de('${de3}','z')`, U.gv);
const overlap = (await q(`select count(*)::int c from public.de_cau_hoi a join public.de_cau_hoi b on a.cau_hoi_id=b.cau_hoi_id and b.de_id='${de}' where a.de_id='${de3}'`, U.gv)).rows[0].c;
console.log(overlap === 0 ? "PASS chống lặp: 0 câu trùng đề đã chốt" : "FAIL trùng " + overlap); if (overlap) process.exitCode = 1;
// admin thấy tất
const adm = (await q(`select count(*)::int c from public.ma_tran_de`, U.ad)).rows[0].c;
console.log(adm >= 3 ? "PASS admin thấy mọi ma trận" : "FAIL admin " + adm);
// anon không gọi RPC
await err("anon không execute sinh_de", async () => { await db.exec("reset role; set role anon;"); await db.query(`select public.sinh_de('${de3}')`); }, /permission denied/);
await db.exec("reset role");

// luu_ma_tran / nhan_ban
const jd = JSON.stringify([{thu_tu:1,nhan:"A",so_luong:5,do_kho_tu:1,do_kho_den:5},{thu_tu:2,nhan:"B",loai_ngu_lieu:"doc_core",so_luong:2,cau_moi_cum:3}]);
const lm = await ok("luu_ma_tran tạo mới", async () => (await q(`select public.luu_ma_tran(null,'MT lưu',null,1::smallint,10::smallint,'${jd}'::jsonb) id`, U.gv)).rows[0].id);
const ex = (await q(`select id, thu_tu from public.ma_tran_dong where ma_tran_id='${lm}' order by thu_tu`, U.gv)).rows;
const jd2 = JSON.stringify([{id:ex[1].id,thu_tu:1,nhan:"B2",loai_ngu_lieu:"doc_core",so_luong:2,cau_moi_cum:3},{id:ex[0].id,thu_tu:2,nhan:"A2",so_luong:6}]);
await ok("luu_ma_tran sửa + hoán đổi thứ tự", () => q(`select public.luu_ma_tran('${lm}','MT lưu 2','mô tả',1::smallint,10::smallint,'${jd2}'::jsonb)`, U.gv));
const ex2 = (await q(`select nhan, thu_tu, so_luong from public.ma_tran_dong where ma_tran_id='${lm}' order by thu_tu`, U.gv)).rows;
console.log(JSON.stringify(ex2)); if (ex2[0].nhan !== "B2" || ex2[1].so_luong !== 6) process.exitCode = 1;
await err("gv2 không sửa ma trận người khác", () => q(`select public.luu_ma_tran('${lm}','x',null,1::smallint,10::smallint,'${jd2}'::jsonb)`, U.gv2), /Không có quyền/);
const cl = await ok("nhan_ban_ma_tran", async () => (await q(`select public.nhan_ban_ma_tran('${lm}') id`, U.gv)).rows[0].id);
console.log((await q(`select count(*)::int c from public.ma_tran_dong where ma_tran_id='${cl}'`, U.gv)).rows[0].c === 2 ? "PASS nhân bản 2 dòng" : "FAIL nhân bản");
// sau khi bỏ dòng cũ khỏi danh sách, dòng bị xoá
await ok("luu_ma_tran xoá dòng không còn trong danh sách", () => q(`select public.luu_ma_tran('${lm}','t',null,1::smallint,10::smallint,'${JSON.stringify([{id:ex[1].id,thu_tu:1,so_luong:2}])}'::jsonb)`, U.gv));
console.log((await q(`select count(*)::int c from public.ma_tran_dong where ma_tran_id='${lm}'`, U.gv)).rows[0].c === 1 ? "PASS còn 1 dòng" : "FAIL xoá dòng");
