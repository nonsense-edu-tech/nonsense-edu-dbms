// Công thức số liệu tài chính DÙNG CHUNG cho trang Học phí (HocPhiDashboardClient)
// và dashboard Trang chủ. Trang Học phí là NGUỒN GỐC: công thức ở đây được tách
// nguyên văn từ HocPhiDashboardClient, không đổi hành vi — để hai nơi không thể
// lệch số vì mỗi nơi tự viết một phép tính riêng.
//
// Định nghĩa (khớp trang Học phí):
//   Doanh thu thuần = tổng doanh_thu_thuan của hợp đồng đang hoạt động + hoàn thành,
//                     lọc theo mốc ngày ký/kích hoạt (kich_hoat_luc, thiếu thì created_at)
//   Thực thu        = tổng phiếu thu trong khoảng ngày thu; phiếu đảo (la_phieu_dao) trừ đi
//   Còn phải thu    = max(Doanh thu thuần − Thực thu, 0)
//   HĐ đang hoạt động = số hợp đồng trạng thái dang_hoat_dong

// Vai trò đọc được phieu_thu + hop_dong_hoc_phi toàn bộ — khớp RLS thật trên production.
export const VAI_TRO_DOC_TAI_CHINH = ["master_admin", "ke_toan", "thu_ngan", "admin_ts"];

export type HopDongTinh = {
  trang_thai: string;
  doanh_thu_thuan: number;
  ngay_moc: string; // YYYY-MM-DD: kich_hoat_luc (ưu tiên) hoặc created_at
  chuong_trinh_ma?: string;
};

export type PhieuThuTinh = {
  so_tien: number;
  ngay_thu: string; // timestamptz dạng ISO — chỉ lấy phần ngày để so sánh
  la_phieu_dao: boolean;
  chuong_trinh_ma?: string;
};

export type BoLocTaiChinh = {
  tuNgay: string | null; // null = không chặn đầu
  denNgay: string; // YYYY-MM-DD, bao gồm
  chuongTrinhChon: string[]; // rỗng = tất cả chương trình
};

// Không lọc thời gian, không lọc chương trình — dùng cho số dư công nợ hiện tại.
export const LOC_TOAN_THOI_GIAN: BoLocTaiChinh = { tuNgay: null, denNgay: "9999-12-31", chuongTrinhChon: [] };

function theoChuongTrinh(ma: string | undefined, loc: BoLocTaiChinh): boolean {
  return loc.chuongTrinhChon.length === 0 || loc.chuongTrinhChon.includes(ma ?? "");
}

function trongKhoang(ngay: string, loc: BoLocTaiChinh): boolean {
  return (!loc.tuNgay || ngay >= loc.tuNgay) && ngay <= loc.denNgay;
}

export function tinhSoHopDongHoatDong(hopDong: HopDongTinh[], loc: BoLocTaiChinh): number {
  return hopDong.filter((h) => h.trang_thai === "dang_hoat_dong" && theoChuongTrinh(h.chuong_trinh_ma, loc)).length;
}

export function tinhDoanhThuThuan(hopDong: HopDongTinh[], loc: BoLocTaiChinh): number {
  return hopDong
    .filter(
      (h) =>
        (h.trang_thai === "dang_hoat_dong" || h.trang_thai === "hoan_thanh") &&
        theoChuongTrinh(h.chuong_trinh_ma, loc) &&
        trongKhoang(h.ngay_moc, loc)
    )
    .reduce((tong, h) => tong + h.doanh_thu_thuan, 0);
}

export function tinhThucThu(phieuThu: PhieuThuTinh[], loc: BoLocTaiChinh): number {
  return phieuThu
    .filter((p) => theoChuongTrinh(p.chuong_trinh_ma, loc) && trongKhoang(p.ngay_thu.slice(0, 10), loc))
    .reduce((tong, p) => tong + (p.la_phieu_dao ? -p.so_tien : p.so_tien), 0);
}

export function tinhConPhaiThu(doanhThuThuan: number, thucThu: number): number {
  return Math.max(doanhThuThuan - thucThu, 0);
}

// Thực thu gom theo tháng (khoá "YYYY-MM", cùng quy ước lấy phần ngày như tinhThucThu,
// phiếu đảo trừ đi) — dùng cho biểu đồ thực thu theo tháng ở Trang chủ.
export function thucThuTheoThang(phieuThu: PhieuThuTinh[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of phieuThu) {
    const thang = p.ngay_thu.slice(0, 7);
    m.set(thang, (m.get(thang) ?? 0) + (p.la_phieu_dao ? -p.so_tien : p.so_tien));
  }
  return m;
}

// N tháng gần nhất tính đến tháng của `homNay` (YYYY-MM-DD), cũ → mới, mỗi phần tử "YYYY-MM".
export function nThangGanNhat(homNay: string, n: number): string[] {
  const y = Number(homNay.slice(0, 4));
  const m = Number(homNay.slice(5, 7)); // 1-12
  const ds: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const tong = y * 12 + (m - 1) - i;
    ds.push(`${Math.floor(tong / 12)}-${String((tong % 12) + 1).padStart(2, "0")}`);
  }
  return ds;
}
