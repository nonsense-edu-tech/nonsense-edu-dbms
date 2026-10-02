// Dựng nội dung CSV danh sách học sinh (thuần, dùng ở server action).

import {
  GIOI_TINH_LABEL,
  TINH_TRANG_DANG_KY_LABEL,
} from "@/components/hocSinhOptions";

export const CSV_HEADER = [
  "STT", "ID hoc sinh", "Ho va ten", "Lop hien tai", "Ten phu huynh", "SDT phu huynh",
  "Ngay sinh", "Gioi tinh", "SDT hoc sinh", "Email", "CCCD", "Dia chi",
  "Tinh trang dang ky", "Truong THPT", "Khoi thi", "NV1",
];

export type DongCsvNguon = {
  stt: number | null;
  ma_hoc_sinh: string | null;
  ho_ten: string | null;
  lop_hien_tai_id: string | null;
  ten_phu_huynh: string | null;
  sdt_phu_huynh: string | null;
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  sdt_hoc_sinh: string | null;
  email: string | null;
  cccd: string | null;
  dia_chi: string | null;
  tinh_trang_dang_ky: string[] | null;
  truong_thpt: string | null;
  khoi_thi: string | null;
  nv1: string | null;
};

export function csvEscape(value: string): string {
  // Chống CSV/formula injection khi mở bằng Excel: ô bắt đầu bằng = + - @ → thêm dấu nháy.
  const an_toan = /^[=+\-@]/.test(value) && !/^[+-]?\d[\d\s.,-]*$/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(an_toan)) return `"${an_toan.replace(/"/g, '""')}"`;
  return an_toan;
}

export function dongCsv(hs: DongCsvNguon, tenLop: (id: string | null) => string): string[] {
  const tinhTrang = Array.isArray(hs.tinh_trang_dang_ky)
    ? hs.tinh_trang_dang_ky.map((t) => TINH_TRANG_DANG_KY_LABEL[t] ?? t).join(", ")
    : "";
  return [
    hs.stt != null ? String(hs.stt) : "",
    hs.ma_hoc_sinh ?? "",
    hs.ho_ten ?? "",
    tenLop(hs.lop_hien_tai_id),
    hs.ten_phu_huynh ?? "",
    hs.sdt_phu_huynh ?? "",
    hs.ngay_sinh ?? "",
    hs.gioi_tinh ? (GIOI_TINH_LABEL[hs.gioi_tinh] ?? hs.gioi_tinh) : "",
    hs.sdt_hoc_sinh ?? "",
    hs.email ?? "",
    hs.cccd ?? "",
    hs.dia_chi ?? "",
    tinhTrang,
    hs.truong_thpt ?? "",
    hs.khoi_thi ?? "",
    hs.nv1 ?? "",
  ];
}

/** Ghép header + các dòng → chuỗi CSV (CRLF). BOM do client thêm khi tạo file. */
export function ghepCsv(rows: string[][]): string {
  return [CSV_HEADER, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
}
