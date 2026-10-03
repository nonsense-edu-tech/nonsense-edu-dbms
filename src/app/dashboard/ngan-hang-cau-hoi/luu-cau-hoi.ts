// Lưu 1 câu hỏi (cấp mã + chèn cau_hoi + lua_chon) — dùng chung cho tạo từng câu
// (actions.ts) và nhập từ file (import-actions.ts) để 2 đường luôn cho ra dữ liệu
// giống hệt nhau. File này KHÔNG phải server action (không "use server").

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CauHoiNhap } from "@/lib/cau-hoi-import";

export function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền tạo/sửa câu hỏi (chỉ Master Admin, Admin học thuật, Trưởng bộ môn, hoặc Giáo viên trong phạm vi môn được phân công).";
  if (msg.includes("cau_hoi_ma_cau_hoi_key")) return "Mã câu hỏi này đã tồn tại (trùng lặp hiếm gặp) — thử lưu lại.";
  if (msg.includes("cau_hoi_do_kho_check")) return "Độ khó phải từ 1 đến 5.";
  if (msg.includes("cau_hoi_ma_cau_hoi_check")) return "Mã câu hỏi sinh ra không hợp lệ (phải đủ 17 chữ số).";
  if (msg.includes("uq_cau_hoi_thu_tu_ngu_lieu")) return "Thứ tự câu trong ngữ liệu bị trùng (có người vừa thêm câu cùng lúc) — thử lưu lại.";
  if (msg.includes("uq_lua_chon_thu_tu")) return "Danh sách lựa chọn bị trùng thứ tự.";
  if (msg.includes("update or delete")) return "Không thể xoá — câu hỏi này còn dữ liệu liên quan (đã nằm trong đề).";
  // Các lỗi do RPC cap_ma_cau_hoi() raise exception đã là tiếng Việt sẵn (vd "Học phần % không thuộc môn %").
  return msg;
}

export type LuuCauHoiResult = { error: string } | { data: { id: string; ma_cau_hoi: string } };

/** Câu hỏi mới luôn ở trạng thái mặc định của DB (`nhap`) — chờ nộp duyệt. */
export async function luuCauHoi(
  supabase: SupabaseClient,
  userId: string,
  c: CauHoiNhap,
  /** Có = câu con của ngữ liệu này (vị trí phải khớp ngữ liệu — DB kiểm bằng trigger). Bỏ trống = câu đứng một mình. */
  nguLieuId?: string
): Promise<LuuCauHoiResult> {
  // Cấp mã câu hỏi qua RPC — hàm này cũng xác nhận học phần/bài học/chủ đề/dạng câu
  // thật sự thuộc đúng môn học/cấp học đã chọn (chặn dữ liệu rác ngay ở tầng DB).
  const { data: maCauHoi, error: rpcError } = await supabase.rpc("cap_ma_cau_hoi", {
    p_cap_hoc: c.cap_hoc,
    p_chuong_trinh: c.chuong_trinh,
    p_mon_hoc: c.mon_hoc,
    p_hoc_phan: c.hoc_phan,
    p_bai_hoc: c.bai_hoc,
    p_chu_de: c.chu_de,
    p_dang_cau: c.dang_cau,
  });

  if (rpcError || !maCauHoi) return { error: mapDbError(rpcError?.message ?? "Không cấp được mã câu hỏi.") };

  const sttCau = Number(String(maCauHoi).slice(-4));

  let thuTuTrongNguLieu: number | null = null;
  if (nguLieuId) {
    const { data: thuTu, error: thuTuError } = await supabase.rpc("thu_tu_ke_tiep_ngu_lieu", { p_ngu_lieu_id: nguLieuId });
    if (thuTuError || thuTu == null) return { error: mapDbError(thuTuError?.message ?? "Không xác định được thứ tự trong ngữ liệu.") };
    thuTuTrongNguLieu = Number(thuTu);
  }

  const { data: cauHoi, error: insertError } = await supabase
    .from("cau_hoi")
    .insert({
      ma_cau_hoi: maCauHoi,
      cap_hoc: c.cap_hoc,
      chuong_trinh: c.chuong_trinh,
      mon_hoc: c.mon_hoc,
      hoc_phan: c.hoc_phan,
      bai_hoc: c.bai_hoc,
      chu_de: c.chu_de,
      dang_cau: c.dang_cau,
      stt_cau: sttCau,
      noi_dung: c.noi_dung,
      do_kho: c.do_kho,
      loi_giai: c.loi_giai,
      dap_an_text: c.dap_an_text,
      nguoi_tao: userId,
      ...(nguLieuId ? { ngu_lieu_id: nguLieuId, thu_tu_trong_ngu_lieu: thuTuTrongNguLieu } : {}),
    })
    .select("id, ma_cau_hoi")
    .single();

  if (insertError) return { error: mapDbError(insertError.message) };

  if (c.lua_chon.length > 0) {
    const { error: luaChonError } = await supabase.from("lua_chon").insert(
      c.lua_chon.map((lc, idx) => ({
        cau_hoi_id: cauHoi.id,
        thu_tu: idx + 1,
        noi_dung: lc.noi_dung,
        la_dap_an: lc.la_dap_an,
      }))
    );

    if (luaChonError) {
      // Dọn lại câu hỏi vừa tạo — tránh để lại câu hỏi rỗng lựa chọn do lỗi giữa chừng.
      await supabase.from("cau_hoi").delete().eq("id", cauHoi.id);
      return { error: mapDbError(luaChonError.message) };
    }
  }

  return { data: cauHoi as { id: string; ma_cau_hoi: string } };
}
