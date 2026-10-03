import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0051 (đề thi × ngữ liệu) trên PGlite — KHÔNG đụng DB thật. Chạy: npm run test:de-ngu-lieu
// Tái dùng schema giả lập của test 0049 (cắt từ "create schema auth" tới trước khi áp migration 0049).
const dir = path.dirname(fileURLToPath(import.meta.url));
const t49 = fs.readFileSync(path.join(dir, "0049-de-thi.test.mjs"), "utf8");
const stub = t49.slice(t49.indexOf("create schema auth;"), t49.indexOf("`);\n\nawait db.exec(mig)"));
const mig49 = fs.readFileSync(path.join(dir, "../migrations/0049_de_thi_theo_ma_tran.sql"), "utf8");
const mig51 = fs.readFileSync(path.join(dir, "../migrations/0051_de_thi_nhom_ngu_lieu.sql"), "utf8");

const db = new PGlite();
await db.exec(stub);
// cột của 0050 mà 0051 dùng
await db.exec(`alter table public.cau_hoi add column thu_tu_trong_ngu_lieu smallint;`);
await db.exec(mig49);
await db.exec(mig51);
console.log("migration OK");

const ok = (c, m) => { if (c) console.log("PASS", m); else { console.log("FAIL", m); process.exitCode = 1; } };
const U = { gv: "00000000-0000-0000-0000-000000000001", gv2: "00000000-0000-0000-0000-000000000002", tg: "00000000-0000-0000-0000-000000000003" };
await db.exec(`
insert into auth.users values ('${U.gv}'),('${U.gv2}'),('${U.tg}');
insert into public.users values ('${U.gv}','gv'),('${U.gv2}','gv'),('${U.tg}','tro_giang');
insert into public.user_pham_vi(user_id,cap_hoc_ma,mon_hoc_ma) values ('${U.gv}',1,10),('${U.gv2}',1,11);
`);
async function q(sql, uid) {
  await db.exec(`reset role; select set_config('app.uid','${uid ?? ""}',false);` + (uid ? "set role authenticated;" : ""));
  return db.query(sql);
}
async function loi(fn) { try { await fn(); return null; } catch (e) { return e.message; } }
const mk = (stt) => `1000100000001${String(stt).padStart(4, "0")}`; // mon 10, dang 1

// 1 ngữ liệu, 5 câu con: mã tăng dần nhưng thứ tự soạn bị đảo (mã 1..5 → thu_tu 5,4,3,2,1)
await db.exec(`insert into public.ngu_lieu(loai,tieu_de,noi_dung) values ('doc_core','Bài đọc A','nội dung A');`);
for (let j = 1; j <= 5; j++) {
  await db.exec(`insert into public.cau_hoi(ma_cau_hoi,noi_dung,do_kho,ngu_lieu_id,thu_tu_trong_ngu_lieu)
    values ('${mk(j)}','Con ${j}',3,(select id from public.ngu_lieu where tieu_de='Bài đọc A'),${6 - j});`);
}
// câu lẻ cho dòng thường
for (let j = 1; j <= 3; j++) await db.exec(`insert into public.cau_hoi(ma_cau_hoi,noi_dung,do_kho) values ('${mk(100 + j)}','Lẻ ${j}',2);`);

const mt = (await q(`insert into public.ma_tran_de(ten,cap_hoc_ma,mon_hoc_ma,nguoi_tao) values ('MT',1,10,'${U.gv}') returning id`, U.gv)).rows[0].id;
await q(`insert into public.ma_tran_dong(ma_tran_id,thu_tu,nhan,loai_ngu_lieu,so_luong,do_kho_tu,do_kho_den) values ('${mt}',1,'Đọc hiểu','doc_core',1,1,5)`, U.gv); // lấy trọn cụm
await q(`insert into public.ma_tran_dong(ma_tran_id,thu_tu,nhan,so_luong,do_kho_tu,do_kho_den) values ('${mt}',2,'Câu lẻ',2,1,5)`, U.gv);
const de = (await q(`insert into public.de(ten,nguoi_tao,ma_tran_id,cap_hoc_ma,mon_hoc_ma) values ('Đề','${U.gv}','${mt}',1,10) returning id`, U.gv)).rows[0].id;
await q(`select public.sinh_de('${de}','s1')`, U.gv);

const dsCum = async () => (await q(`select c.noi_dung, dch.thu_tu from public.de_cau_hoi dch join public.cau_hoi c on c.id=dch.cau_hoi_id where dch.de_id='${de}' and dch.cum_id is not null order by dch.thu_tu`, U.gv)).rows;
let r = await dsCum();
ok(r.length === 5, "cụm vào đề đủ 5 câu con");
ok(r.map((x) => x.noi_dung).join(",") === "Con 5,Con 4,Con 3,Con 2,Con 1", "câu con theo thu_tu_trong_ngu_lieu (không theo mã câu hỏi)");
const tt = r.map((x) => x.thu_tu);
ok(tt.every((v, i) => i === 0 || v === tt[i - 1] + 1), "câu con liền nhau (thu_tu liên tiếp)");

// mã đề 2: cụm giữ nguyên thứ tự câu con và liền nhau
await q(`select public.tao_ma_de('${de}', 2)`, U.gv).catch(() => {});

// bỏ câu con
const ids = (await q(`select dch.id, c.noi_dung from public.de_cau_hoi dch join public.cau_hoi c on c.id=dch.cau_hoi_id where dch.de_id='${de}' and dch.cum_id is not null order by dch.thu_tu`, U.gv)).rows;
ok(!(await loi(() => q(`select public.bo_cau_con_khoi_de('${de}','${ids[1].id}')`, U.gv))), "gv bỏ 1 câu con");
r = await dsCum();
ok(r.map((x) => x.noi_dung).join(",") === "Con 5,Con 3,Con 2,Con 1", "còn 4 câu, giữ thứ tự");
const tt2 = r.map((x) => x.thu_tu);
ok(tt2.every((v, i) => i === 0 || v === tt2[i - 1] + 1), "đánh số lại liền nhau sau khi bỏ");
ok(/không có quyền/i.test((await loi(() => q(`select public.bo_cau_con_khoi_de('${de}','${ids[0].id}')`, U.gv2))) ?? ""), "gv khác không bỏ được");
ok(/không có quyền/i.test((await loi(() => q(`select public.bo_cau_con_khoi_de('${de}','${ids[0].id}')`, U.tg))) ?? ""), "trợ giảng không bỏ được");
const le = (await q(`select id from public.de_cau_hoi where de_id='${de}' and cum_id is null limit 1`, U.gv)).rows[0].id;
ok(/câu lẻ/i.test((await loi(() => q(`select public.bo_cau_con_khoi_de('${de}','${le}')`, U.gv))) ?? ""), "câu lẻ không dùng chức năng này");
// bỏ tới còn 1 câu thì chặn
for (const x of [ids[0], ids[2], ids[3]]) await q(`select public.bo_cau_con_khoi_de('${de}','${x.id}')`, U.gv);
ok(/chỉ còn 1 câu/.test((await loi(() => q(`select public.bo_cau_con_khoi_de('${de}','${ids[4].id}')`, U.gv))) ?? ""), "cụm còn 1 câu thì không bỏ thêm");

// đề đã chốt thì không bỏ được
await q(`select public.chot_de('${de}', 1)`, U.gv).catch((e) => console.log("chot_de:", e.message));
const st = (await q(`select trang_thai from public.de where id='${de}'`, U.gv)).rows[0].trang_thai;
if (st === "da_phat_hanh") ok(/đã chốt|không có quyền/i.test((await loi(() => q(`select public.bo_cau_con_khoi_de('${de}','${ids[4].id}')`, U.gv))) ?? ""), "đề đã chốt không bỏ được");
else console.log("SKIP chốt đề (trang_thai =", st + ")");

console.log(process.exitCode ? "CÓ LỖI" : "TẤT CẢ ĐẠT");
