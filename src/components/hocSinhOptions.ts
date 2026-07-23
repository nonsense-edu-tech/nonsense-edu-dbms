export const GIOI_TINH_LABEL: Record<string, string> = {
  nam: "Nam",
  nu: "Nữ",
  khac: "Khác",
};

export const TINH_TRANG_DANG_KY_LABEL: Record<string, string> = {
  da_dang_ky: "Đã đăng ký",
  da_xac_nhan: "Đã xác nhận",
  da_nhap_hoc: "Đã nhập học",
  huy_dang_ky: "Huỷ đăng ký",
};

export const GIOI_TINH_OPTIONS = Object.keys(GIOI_TINH_LABEL);
export const TINH_TRANG_DANG_KY_OPTIONS = Object.keys(TINH_TRANG_DANG_KY_LABEL);

export const TRANG_THAI_GHI_DANH_LABEL: Record<string, string> = {
  dang_hoc: "Đang học",
  da_nghi: "Đã nghỉ",
  bao_luu: "Bảo lưu",
  hoan_thanh: "Đã hoàn thành",
  da_chuyen_lop: "Đã chuyển lớp",
};

export const TRANG_THAI_GHI_DANH_OPTIONS = Object.keys(TRANG_THAI_GHI_DANH_LABEL);
