// Phân trang bảng dữ liệu — dùng chung cho mọi trang danh sách.
//
// Trạng thái phân trang nằm trên URL (?page=2&size=20) để chia sẻ được link,
// nút Back hoạt động và trang server đọc thẳng từ searchParams. Server LUÔN ép
// giá trị hợp lệ — không tin tham số từ client (vd ?size=500 → 50).
//
// File này thuần (không import next/*), dùng được cả ở server lẫn client.

export const PAGE_SIZES = [10, 15, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

/** Khoá lưu lựa chọn số dòng/trang của người dùng (localStorage). */
export const PAGE_SIZE_STORAGE_KEY = "nonsense-edu:page-size";

export type RawSearchParams = { [key: string]: string | string[] | undefined };

export type PhanTrang = {
  /** Trang hiện tại, bắt đầu từ 1 (đã ép hợp lệ). */
  page: number;
  /** Số dòng mỗi trang, thuộc PAGE_SIZES. */
  size: number;
  /** Chỉ số dòng đầu (0-based, dùng cho .range(from, to)). */
  from: number;
  /** Chỉ số dòng cuối (0-based, gồm cả đầu mút — đúng ngữ nghĩa .range()). */
  to: number;
};

function layGiaTriDau(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** "abc", "", "1.5", "-3", "0" … → null; chỉ nhận số nguyên dương. */
function soNguyenDuong(v: string | undefined): number | null {
  if (v == null || !/^\d+$/.test(v.trim())) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

/** Ép số dòng/trang về giá trị hợp lệ: lạ → mặc định; >50 → 50; giá trị lửng → mặc định. */
export function chuanHoaSize(raw: number | null): number {
  if (raw == null) return DEFAULT_PAGE_SIZE;
  if (raw > MAX_PAGE_SIZE) return MAX_PAGE_SIZE;
  return (PAGE_SIZES as readonly number[]).includes(raw) ? raw : DEFAULT_PAGE_SIZE;
}

/**
 * Đọc ?page & ?size từ searchParams. `prefix` dùng khi 1 trang có nhiều bảng
 * (vd prefix "xoa" → ?xoa_page=2&xoa_size=20).
 */
export function parsePhanTrang(raw: RawSearchParams, prefix = ""): PhanTrang {
  const kPage = prefix ? `${prefix}_page` : "page";
  const kSize = prefix ? `${prefix}_size` : "size";
  const size = chuanHoaSize(soNguyenDuong(layGiaTriDau(raw[kSize])));
  const page = soNguyenDuong(layGiaTriDau(raw[kPage])) ?? 1;
  return tinhTrang(page, size);
}

export function tinhTrang(page: number, size: number): PhanTrang {
  const from = (page - 1) * size;
  return { page, size, from, to: from + size - 1 };
}

export function tongSoTrang(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

/**
 * Nếu người dùng đang ở trang vượt quá tổng (vd vừa xoá dòng cuối của trang
 * cuối) trả về đường dẫn của trang cuối để trang gọi `redirect()`; ngược lại null.
 * Chỉ gọi sau khi đã có `total` từ count của query.
 */
export function duongDanTrangCuoi(
  pathname: string,
  raw: RawSearchParams,
  pp: PhanTrang,
  total: number,
  prefix = ""
): string | null {
  const cuoi = tongSoTrang(total, pp.size);
  if (pp.page <= cuoi) return null;
  const kPage = prefix ? `${prefix}_page` : "page";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (k === kPage || v == null) continue;
    for (const item of Array.isArray(v) ? v : [v]) qs.append(k, item);
  }
  qs.set(kPage, String(cuoi));
  return `${pathname}?${qs.toString()}`;
}

/**
 * Danh sách nút số trang rút gọn: luôn có trang đầu/cuối và 1 trang mỗi bên
 * trang hiện tại; phần bị lược thay bằng "…". Vd (page 5 / 20): 1 … 4 5 6 … 20
 */
export function danhSachSoTrang(page: number, tong: number): (number | "…")[] {
  if (tong <= 7) return Array.from({ length: tong }, (_, i) => i + 1);
  const set = new Set<number>([1, tong, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= tong - 2) [tong - 3, tong - 2, tong - 1].forEach((n) => set.add(n));
  const dsach = [...set].filter((n) => n >= 1 && n <= tong).sort((a, b) => a - b);
  const kq: (number | "…")[] = [];
  dsach.forEach((n, i) => {
    if (i > 0) {
      const khoang = n - dsach[i - 1];
      // Chỉ thiếu đúng 1 trang thì hiện luôn số đó, không dùng "…" cho 1 trang.
      if (khoang === 2) kq.push(n - 1);
      else if (khoang > 2) kq.push("…");
    }
    kq.push(n);
  });
  return kq;
}
