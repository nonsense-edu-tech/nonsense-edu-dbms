// Bộ lọc danh sách học sinh (phía server) — dùng chung cho trang danh sách
// (phân trang) và server action xuất CSV, để "xuất theo bộ lọc" luôn khớp đúng
// với những gì đang hiển thị.
//
// Thuần (không import next/*). Bộ lọc nằm trên URL: ?q=&lop=&cn=&tt=

import { TRANG_THAI_GHI_DANH_OPTIONS } from "@/components/hocSinhOptions";
import type { RawSearchParams } from "@/lib/phan-trang";

export type BoLocHocSinh = {
  /** Từ khoá tìm theo mã, họ tên, lớp (đã làm sạch). */
  q: string;
  /** id lớp (uuid) hoặc "". */
  lop: string;
  /** id chi nhánh (uuid) hoặc "". */
  cn: string;
  /** trạng thái ghi danh hiện tại hoặc "". */
  tt: string;
};

export type LopChoLoc = {
  id: string;
  ma_lop: string;
  ten_lop: string | null;
  chi_nhanh_id: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_RONG = "00000000-0000-0000-0000-000000000000";
const DO_DAI_TOI_DA_TU_KHOA = 100;

function layDau(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Từ khoá được ghép vào chuỗi filter `.or(...)` của PostgREST nên PHẢI bỏ các
 * ký tự có nghĩa trong cú pháp đó (`, ( ) " \`) và ký tự đại diện của ILIKE
 * (`% _ *`), nếu không người dùng có thể chèn thêm điều kiện lọc.
 */
export function lamSachTuKhoa(raw: string): string {
  return raw
    .replace(/[%_\\",()*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DO_DAI_TOI_DA_TU_KHOA);
}

export function parseBoLoc(raw: RawSearchParams): BoLocHocSinh {
  const lop = layDau(raw.lop).trim();
  const cn = layDau(raw.cn).trim();
  const tt = layDau(raw.tt).trim();
  return {
    q: lamSachTuKhoa(layDau(raw.q)),
    lop: UUID_RE.test(lop) ? lop : "",
    cn: UUID_RE.test(cn) ? cn : "",
    tt: TRANG_THAI_GHI_DANH_OPTIONS.includes(tt) ? tt : "",
  };
}

/** Bộ lọc từ dữ liệu client gửi lên server action — ép hợp lệ như khi đọc URL. */
export function chuanHoaBoLoc(b: Partial<BoLocHocSinh> | null | undefined): BoLocHocSinh {
  return parseBoLoc({ q: b?.q, lop: b?.lop, cn: b?.cn, tt: b?.tt });
}

// Chỉ cần các phương thức lọc của PostgREST query builder.
type LocDuoc = {
  or(filters: string): LocDuoc;
  eq(column: string, value: string): LocDuoc;
  in(column: string, values: string[]): LocDuoc;
};

/**
 * Áp bộ lọc lên query của view `v_hoc_sinh_danh_sach`.
 * - Tìm kiếm: mã/họ tên (ilike) + học sinh thuộc lớp có mã/tên lớp khớp từ khoá
 *   (khớp hành vi cũ: tìm theo cả tên lớp).
 * - Chi nhánh: học sinh có lớp hiện tại thuộc chi nhánh đó.
 * - Trạng thái: theo ghi danh MỚI NHẤT (cột của view).
 */
export function apDungBoLoc<Q>(query: Q, bo: BoLocHocSinh, lopList: LopChoLoc[]): Q {
  let qb = query as unknown as LocDuoc;

  if (bo.q) {
    const q = bo.q.toLowerCase();
    const lopKhop = lopList
      .filter((l) => l.ma_lop.toLowerCase().includes(q) || (l.ten_lop ?? "").toLowerCase().includes(q))
      .map((l) => l.id);
    const dieuKien = [`ma_hoc_sinh.ilike.%${bo.q}%`, `ho_ten.ilike.%${bo.q}%`];
    if (lopKhop.length > 0) dieuKien.push(`lop_hien_tai_id.in.(${lopKhop.join(",")})`);
    qb = qb.or(dieuKien.join(","));
  }

  if (bo.lop) qb = qb.eq("lop_hien_tai_id", bo.lop);

  if (bo.cn) {
    const lopCuaCn = lopList.filter((l) => l.chi_nhanh_id === bo.cn).map((l) => l.id);
    // Chi nhánh chưa có lớp nào → không có học sinh nào khớp (không được bỏ lọc).
    qb = qb.in("lop_hien_tai_id", lopCuaCn.length > 0 ? lopCuaCn : [UUID_RONG]);
  }

  if (bo.tt) qb = qb.eq("trang_thai_ghi_danh", bo.tt);

  return qb as unknown as Q;
}

/** Biến bộ lọc thành query string cho link/điều hướng (bỏ giá trị rỗng). */
export function boLocThanhParams(bo: Partial<BoLocHocSinh>): URLSearchParams {
  const qs = new URLSearchParams();
  for (const k of ["q", "lop", "cn", "tt"] as const) {
    const v = bo[k];
    if (v) qs.set(k, v);
  }
  return qs;
}
