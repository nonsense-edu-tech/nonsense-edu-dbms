import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0053 (unique hợp đồng chỉ tính hợp đồng đang mở) trên PGlite — KHÔNG đụng DB thật.
// Chạy: npm run test:hop-dong-unique
const dir = path.dirname(fileURLToPath(import.meta.url));
const mig = fs.readFileSync(path.join(dir, "../migrations/0053_hop_dong_unique_chi_tinh_hop_dong_mo.sql"), "utf8");

const db = new PGlite();
await db.exec(`
create table public.hop_dong_hoc_phi(
  id uuid primary key default gen_random_uuid(),
  ghi_danh_id uuid not null,
  trang_thai text not null default 'nhap',
  deleted_at timestamptz,
  constraint hop_dong_hoc_phi_ghi_danh_id_key unique (ghi_danh_id)
);
`);

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error("FAIL:", msg); } else console.log("ok:", msg); };
const thuInsert = async (gd, tt, xoa = "null") => {
  try { await db.exec(`insert into public.hop_dong_hoc_phi(ghi_danh_id, trang_thai, deleted_at) values ('${gd}','${tt}',${xoa})`); return true; }
  catch { return false; }
};

const GD = "00000000-0000-0000-0000-000000000001";
await db.exec(`insert into public.hop_dong_hoc_phi(ghi_danh_id, trang_thai) values ('${GD}','da_huy')`);
ok(!(await thuInsert(GD, "nhap")), "TRƯỚC migration: hợp đồng da_huy chặn tạo hợp đồng mới (tái hiện lỗi)");

await db.exec(mig);
await db.exec(mig); // idempotent: chạy lại không lỗi

ok(await thuInsert(GD, "nhap"), "SAU migration: tạo được hợp đồng mới khi hợp đồng cũ đã hủy");
ok(!(await thuInsert(GD, "dang_hoat_dong")), "vẫn chặn hợp đồng đang mở thứ hai trên cùng ghi danh");
ok(await thuInsert(GD, "da_huy"), "cho phép nhiều hợp đồng da_huy (giữ vết)");
ok(await thuInsert("00000000-0000-0000-0000-000000000002", "nhap", "now()"), "hợp đồng xóa mềm không chiếm chỗ");
ok(await thuInsert("00000000-0000-0000-0000-000000000002", "nhap"), "ghi danh có hợp đồng xóa mềm vẫn tạo mới được");

process.exit(fail ? 1 : 0);
