// Quy tắc "hợp đồng nào được ghi phiếu thu" — MỘT nơi duy nhất, dùng chung cho
// danh sách chọn ở trang Thu tiền (UI) và chốt chặn ở server action taoPhieuThu.
//
// - Đang hoạt động: luôn được thu.
// - Hoàn thành: "kết thúc hợp đồng" ≠ "đã thu đủ". Học sinh nghỉ/hết khoá nhưng gia đình
//   đóng muộn (vd học phí tháng 8 chuyển đầu tháng 10) vẫn phải ghi nhận được. Chỉ hiện
//   khi còn phải thu > 0, để không bị thu vượt hợp đồng đã tất toán.
// - Nháp / chờ duyệt / đã huỷ: không nhận phiếu thu.

export const TRANG_THAI_NHAN_PHIEU_THU = ["dang_hoat_dong", "hoan_thanh"];

export function nhanPhieuThuTrongDanhSach(trangThai: string | null | undefined, conPhaiThu: number): boolean {
  if (trangThai === "dang_hoat_dong") return true;
  return trangThai === "hoan_thanh" && conPhaiThu > 0;
}
