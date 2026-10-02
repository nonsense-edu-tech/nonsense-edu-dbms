// Bộ lọc danh sách câu hỏi (phía server) — cùng kiểu bộ lọc danh sách học sinh:
// trạng thái nằm trên URL (?q=&cap=&ct=&mon=&hp=&bh=&cd=&dang=&tt=&dk=), server
// luôn ép giá trị hợp lệ, không tin tham số từ client.
//
// Thuần (không import next/*), dùng được ở cả server lẫn client.

import { TRANG_THAI_LABEL } from "@/components/trangThaiCauHoi";
import { lamSachTuKhoa } from "@/lib/hoc-sinh-loc";
import type { RawSearchParams } from "@/lib/phan-trang";

export type BoLocCauHoi = {
  /** Từ khoá tìm theo mã câu hỏi hoặc nội dung (đã làm sạch). */
  q: string;
  /** Mã cấp học (1-9) hoặc "". */
  cap: string;
  /** Mã chương trình (3 số) hoặc "". */
  ct: string;
  /** id môn học (uuid) hoặc "". */
  mon: string;
  /** id học phần (uuid) hoặc "". */
  hp: string;
  /** id bài học (uuid) hoặc "". */
  bh: string;
  /** id chủ đề (uuid) hoặc "". */
  cd: string;
  /** Mã dạng câu (số) hoặc "". */
  dang: string;
  /** trạng thái câu hỏi hoặc "". */
  tt: string;
  /** độ khó 1-5 hoặc "". */
  dk: string;
};

export const CAC_KHOA_LOC = ["q", "cap", "ct", "mon", "hp", "bh", "cd", "dang", "tt", "dk"] as const;

export const BO_LOC_RONG: BoLocCauHoi = { q: "", cap: "", ct: "", mon: "", hp: "", bh: "", cd: "", dang: "", tt: "", dk: "" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_RONG = "00000000-0000-0000-0000-000000000000";

function layDau(v: string | string[] | undefined): string {
  return ((Array.isArray(v) ? v[0] : v) ?? "").trim();
}

function uuidHopLe(v: string): string {
  return UUID_RE.test(v) ? v : "";
}

export function parseBoLocCauHoi(raw: RawSearchParams): BoLocCauHoi {
  const cap = layDau(raw.cap);
  const ct = layDau(raw.ct);
  const dang = layDau(raw.dang);
  const tt = layDau(raw.tt);
  const dk = layDau(raw.dk);
  return {
    q: lamSachTuKhoa(layDau(raw.q)),
    cap: /^[1-9]$/.test(cap) ? cap : "",
    ct: /^\d{3}$/.test(ct) ? ct : "",
    mon: uuidHopLe(layDau(raw.mon)),
    hp: uuidHopLe(layDau(raw.hp)),
    bh: uuidHopLe(layDau(raw.bh)),
    cd: uuidHopLe(layDau(raw.cd)),
    dang: /^\d{1,2}$/.test(dang) ? String(Number(dang)) : "",
    tt: tt in TRANG_THAI_LABEL ? tt : "",
    dk: /^[1-5]$/.test(dk) ? dk : "",
  };
}

export function dangLocCauHoi(bo: BoLocCauHoi): boolean {
  return CAC_KHOA_LOC.some((k) => bo[k] !== "");
}

export type CtxLocCauHoi = {
  monHocList: { id: string; ma: number; cap_hoc_ma: number }[];
  hocPhanList: { id: string; ma: number; mon_hoc_id: string }[];
  baiHocList: { id: string; ma: number; hoc_phan_id: string }[];
  chuDeList: { id: string; ma: number; mon_hoc_id: string }[];
};

// Chỉ cần các phương thức lọc của PostgREST query builder.
type LocDuoc = {
  or(filters: string): LocDuoc;
  eq(column: string, value: string | number): LocDuoc;
};

/**
 * Áp bộ lọc lên query bảng `cau_hoi`.
 * - Các cột mã (cap_hoc, mon_hoc, hoc_phan, bai_hoc, chu_de) là mã số, chỉ duy
 *   nhất trong phạm vi cha — nên bộ lọc nhận id (uuid) rồi quy ra mã + cha ở
 *   đây, để "Bài học 01" của môn này không lẫn với "Bài học 01" của môn khác.
 * - id lạ / đã xoá không tìm thấy → không khớp dòng nào (không được bỏ lọc).
 */
export function apDungBoLocCauHoi<Q>(query: Q, bo: BoLocCauHoi, ctx: CtxLocCauHoi): Q {
  let qb = query as unknown as LocDuoc;

  if (bo.q) {
    qb = qb.or(`ma_cau_hoi.ilike.%${bo.q}%,noi_dung.ilike.%${bo.q}%`);
  }
  if (bo.cap) qb = qb.eq("cap_hoc", Number(bo.cap));
  if (bo.ct) qb = qb.eq("chuong_trinh", Number(bo.ct));

  const khongKhop = () => (qb = qb.eq("id", UUID_RONG));
  const locTheoMon = (monId: string): boolean => {
    const mon = ctx.monHocList.find((m) => m.id === monId);
    if (!mon) return false;
    qb = qb.eq("cap_hoc", mon.cap_hoc_ma).eq("mon_hoc", mon.ma);
    return true;
  };

  if (bo.mon && !locTheoMon(bo.mon)) khongKhop();

  if (bo.hp) {
    const hp = ctx.hocPhanList.find((h) => h.id === bo.hp);
    if (!hp || !locTheoMon(hp.mon_hoc_id)) khongKhop();
    else qb = qb.eq("hoc_phan", hp.ma);
  }

  if (bo.bh) {
    const bh = ctx.baiHocList.find((b) => b.id === bo.bh);
    const hp = bh ? ctx.hocPhanList.find((h) => h.id === bh.hoc_phan_id) : undefined;
    if (!bh || !hp || !locTheoMon(hp.mon_hoc_id)) khongKhop();
    else qb = qb.eq("hoc_phan", hp.ma).eq("bai_hoc", bh.ma);
  }

  if (bo.cd) {
    const cd = ctx.chuDeList.find((c) => c.id === bo.cd);
    if (!cd || !locTheoMon(cd.mon_hoc_id)) khongKhop();
    else qb = qb.eq("chu_de", cd.ma);
  }

  if (bo.dang) qb = qb.eq("dang_cau", Number(bo.dang));
  if (bo.tt) qb = qb.eq("trang_thai", bo.tt);
  if (bo.dk) qb = qb.eq("do_kho", Number(bo.dk));

  return qb as unknown as Q;
}
