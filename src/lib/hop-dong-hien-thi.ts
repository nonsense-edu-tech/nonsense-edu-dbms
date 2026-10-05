import { HINH_THUC_DONG_LABEL, LOAI_GIAM_GIA_LABEL, TRANG_THAI_HOP_DONG_LABEL } from "@/components/hocPhiOptions";
import { tienHienThi } from "@/lib/formatCurrency";

// Nhãn tiếng Việt cho các cột hợp đồng + hàm hiển thị giá trị — dùng chung cho Lịch sử hợp đồng và trang Yêu cầu sửa.
export const COT_HOP_DONG_LABEL: Record<string, string> = {
  goi_hoc_phi_id: "Gói học phí",
  gia_niem_yet: "Giá niêm yết",
  loai_giam_gia: "Loại giảm giá",
  gia_tri_giam_gia: "Giá trị giảm",
  so_tien_giam: "Số tiền giảm",
  doanh_thu_thuan: "Doanh thu thuần",
  hinh_thuc_dong: "Hình thức đóng",
  trang_thai: "Trạng thái",
  ghi_chu: "Ghi chú",
  nguoi_duyet: "Người duyệt",
  kich_hoat_luc: "Kích hoạt lúc",
  deleted_at: "Xoá mềm lúc",
};

const COT_TIEN = ["gia_niem_yet", "gia_tri_giam_gia", "so_tien_giam", "doanh_thu_thuan"];

export function hienThiGiaTriHopDong(cot: string, v: unknown, loaiGiam?: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (cot === "gia_tri_giam_gia" && loaiGiam === "phan_tram") return `${v}%`;
  if (COT_TIEN.includes(cot) && typeof v === "number") return tienHienThi(v);
  if (cot === "hinh_thuc_dong") return HINH_THUC_DONG_LABEL[String(v)] ?? String(v);
  if (cot === "loai_giam_gia") return LOAI_GIAM_GIA_LABEL[String(v)] ?? String(v);
  if (cot === "trang_thai") return TRANG_THAI_HOP_DONG_LABEL[String(v)] ?? String(v);
  if (cot === "kich_hoat_luc" || cot === "deleted_at") return new Date(String(v)).toLocaleString("vi-VN");
  return String(v);
}

export const TRANG_THAI_YEU_CAU_LABEL: Record<string, string> = {
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  tu_choi: "Đã từ chối",
  da_rut: "Đã rút",
};
