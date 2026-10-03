// Hằng số + kiểu dùng chung cho ngữ liệu (đề dẫn dùng chung cho nhiều câu hỏi con).
// File thuần: dùng được ở server lẫn client. Quy ước nghiệp vụ: xem migration 0050.

export const LOAI_NGU_LIEU = [
  { ma: "doc_core", ten: "Bài đọc khoa học (CORE)" },
  { ma: "so_lieu", ten: "Bảng số liệu / biểu đồ" },
  { ma: "logic", ten: "Tình huống logic" },
  { ma: "khac", ten: "Khác" },
] as const;

export type LoaiNguLieu = (typeof LOAI_NGU_LIEU)[number]["ma"];

export const tenLoaiNguLieu = (ma: string): string => LOAI_NGU_LIEU.find((l) => l.ma === ma)?.ten ?? ma;

export const laLoaiNguLieu = (v: unknown): v is LoaiNguLieu => LOAI_NGU_LIEU.some((l) => l.ma === v);

/** Số câu con tối đa trong một ngữ liệu (V-ACT thường 3–6 câu; 30 là trần an toàn). */
export const SO_CAU_CON_TOI_DA = 30;

/** Vai trò được tạo/sửa ngữ liệu — trùng RLS p_write_* của ngu_lieu và cau_hoi. */
export const VAI_TRO_SOAN_NGU_LIEU = ["master_admin", "admin_ht", "truong_bm", "gv"];
