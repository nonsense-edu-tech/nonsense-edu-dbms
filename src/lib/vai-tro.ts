// Dùng chung cho mọi nơi cần biết "vai trò này thuộc nhóm giao diện nào" —
// tách ra từ src/app/dashboard/page.tsx để layout.tsx + Sidebar.tsx dùng lại
// đúng 1 nguồn, tránh lệch danh sách vai trò giữa các nơi.

export const VAI_TRO_LABEL: Record<string, string> = {
  master_admin: "Master Admin",
  admin_ts: "Admin Tuyển sinh",
  admin_ht: "Admin Hiệu trưởng",
  truong_bm: "Trưởng bộ môn",
  gv: "Giáo viên",
  ke_toan: "Kế toán",
  thu_ngan: "Thu ngân",
  quan_ly_chi_nhanh: "Quản lý chi nhánh",
  tro_giang: "Trợ giảng",
};

export const ADMIN_TIER = ["master_admin", "admin_ts", "admin_ht", "ke_toan", "thu_ngan", "quan_ly_chi_nhanh"];
export const GV_TIER = ["truong_bm", "gv"];
export const TRO_GIANG_TIER = ["tro_giang"];

// "Người dùng" chỉ liên quan tới master_admin (quản lý toàn bộ) và admin_ht
// (cấp tài khoản gv/trợ giảng cho chi nhánh mình) — RLS thật trên
// users/nhat_ky/RPC admin_ht_tao_nhan_su chỉ 2 vai trò này có quyền, các vai
// trò admin-tier khác (ke_toan/thu_ngan/admin_ts/quan_ly_chi_nhanh) ẩn hẳn
// mục này theo đúng quy tắc 28/09/2026 — không hiện dạng khoá.
export const NGUOI_DUNG_TIER = ["master_admin", "admin_ht"];

export function tenVaiTro(vaiTro: string) {
  return VAI_TRO_LABEL[vaiTro] ?? vaiTro;
}

export function chuCaiDau(s: string) {
  return (s.trim()[0] ?? "?").toUpperCase();
}

// Nhóm giao diện sidebar dùng — khớp đúng 3 nhóm dashboard hiện có.
export type NhomGiaoDien = "admin" | "gv" | "tro_giang";

export function nhomGiaoDien(vaiTro: string): NhomGiaoDien {
  if (ADMIN_TIER.includes(vaiTro)) return "admin";
  if (GV_TIER.includes(vaiTro)) return "gv";
  // Trợ giảng + vai trò lạ chưa ánh xạ đều rơi vào nhóm tối thiểu (an toàn
  // hơn là mặc định cho xem nhóm admin).
  return "tro_giang";
}
