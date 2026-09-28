// Nhãn + mã badge cho trang_thai của cau_hoi — dùng chung giữa CauHoiTable.tsx
// (hiển thị) và cau-hoi/actions.ts (thông báo lỗi "chỉ câu hỏi đang ở trạng
// thái X mới ... được") để nhãn tiếng Việt khớp nhau ở cả 2 nơi, tránh lệch
// như dangCauOptions.ts đã làm cho dạng câu.
export const TRANG_THAI_LABEL: Record<string, string> = {
  nhap: "Nháp",
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  luu_tru: "Lưu trữ",
};

export const TRANG_THAI_BADGE: Record<string, string> = {
  nhap: "badgeNhap",
  cho_duyet: "badgeChoDuyet",
  da_duyet: "badgeDaDuyet",
  luu_tru: "badgeLuuTru",
};
