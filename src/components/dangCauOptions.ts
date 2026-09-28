// Mã dạng câu (bảng `dang_cau`, cột `ma`) — cố định theo seed data, dùng chung
// giữa CauHoiForm.tsx (client) và cau-hoi/actions.ts (server) để 2 bên luôn
// khớp logic UI ↔ validate.
//
// 5 (Nối/ghép cặp) và 6 (Sắp xếp thứ tự/kéo thả) CHƯA có UI soạn thảo riêng —
// cấu trúc dữ liệu khác hẳn lựa chọn/đáp án text hiện có (cần mô hình "cặp nối"
// hoặc "thứ tự đúng", có thể cần bảng mới). Tạm ẩn khỏi form tạo câu hỏi, ghi
// nợ kỹ thuật ở đây + CHANGELOG, làm ở bước riêng sau khi có thời gian thiết kế.
export const DANG_CAU_CHUA_HO_TRO: readonly number[] = [5, 6];

export type LoaiDangCau = "single" | "multi" | "dung_sai" | "dien_khuyet" | "text" | "khong_xac_dinh";

export function layLoaiDangCau(ma: number | null): LoaiDangCau {
  switch (ma) {
    case 1:
      return "single"; // Trắc nghiệm 1 đáp án — lựa chọn, đúng 1 đáp án đúng
    case 2:
      return "multi"; // Trắc nghiệm nhiều đáp án — lựa chọn, ≥1 đáp án đúng
    case 3:
      return "dung_sai"; // Đúng/Sai (từng ý) — mệnh đề, mỗi ý tự đúng/sai
    case 4:
      return "dien_khuyet"; // Điền khuyết — danh sách đáp án cho từng chỗ trống
    case 7:
    case 8:
      return "text"; // Trả lời ngắn / Tự luận — 1 ô đáp án text (tự luận có thể để trống)
    default:
      return "khong_xac_dinh";
  }
}
