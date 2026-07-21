export const HINH_THUC_DONG_LABEL: Record<string, string> = {
  mot_lan: "Một lần",
  hang_thang: "Hàng tháng",
  hang_quy: "Hàng quý",
  tra_gop: "Trả góp",
};
export const HINH_THUC_DONG_OPTIONS = Object.keys(HINH_THUC_DONG_LABEL);

export const LOAI_GIAM_GIA_LABEL: Record<string, string> = {
  khong: "Không giảm",
  phan_tram: "Giảm theo %",
  co_dinh: "Giảm số tiền cố định",
};

export const TRANG_THAI_HOP_DONG_LABEL: Record<string, string> = {
  nhap: "Nháp",
  cho_duyet: "Chờ duyệt",
  dang_hoat_dong: "Đang hoạt động",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã huỷ",
};

export const HINH_THUC_THU_LABEL: Record<string, string> = {
  tien_mat: "Tiền mặt",
  chuyen_khoan: "Chuyển khoản",
};

export type TrangThaiThu = "chua_du" | "du" | "du_thua";

export const TRANG_THAI_THU_LABEL: Record<TrangThaiThu, string> = {
  chua_du: "Chưa thu đủ",
  du: "Đã thu đủ",
  du_thua: "Thu dư",
};

export function tinhTrangThaiThu(doanhThuThuan: number, thucThu: number): TrangThaiThu {
  if (thucThu < doanhThuThuan) return "chua_du";
  if (thucThu > doanhThuThuan) return "du_thua";
  return "du";
}

export function tinhDoanhThuThuan(
  giaNiemYet: number,
  loaiGiamGia: string,
  giaTriGiamGia: number
): { soTienGiam: number; doanhThuThuan: number } {
  let soTienGiam = 0;
  if (loaiGiamGia === "phan_tram") {
    soTienGiam = Math.round((giaNiemYet * giaTriGiamGia) / 100);
  } else if (loaiGiamGia === "co_dinh") {
    soTienGiam = giaTriGiamGia;
  }
  soTienGiam = Math.max(0, Math.min(soTienGiam, giaNiemYet));
  return { soTienGiam, doanhThuThuan: giaNiemYet - soTienGiam };
}
