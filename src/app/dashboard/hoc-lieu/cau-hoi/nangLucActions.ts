"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Gắn năng lực (Bước 5.5) — lớp gắn thẻ năng lực cho câu hỏi, theo brief từ
// dự án "Chuẩn năng lực NonsenseEdu" (khung v0.13, chưa CEO duyệt — xem
// khung_nang_luc trong bộ nhớ dự án). Bảng cau_hoi_nang_luc/nang_luc/
// tien_trinh đã có sẵn từ migration 0038, RLS đã đủ (cùng 4 vai trò ghi như
// cau_hoi) — KHÔNG cần migration mới cho bước này.
//
// LƯU Ý QUAN TRỌNG: bảng `nang_luc` trên production hiện đang RỖNG (0 dòng,
// xác nhận qua SQL trực tiếp 28/09/2026) — bộ 20 mã năng lực v0.13 nêu trong
// brief CHƯA được nhập vào CSDL. Tính năng gắn thẻ ở đây hoạt động đúng
// nhưng dropdown chọn năng lực sẽ trống cho tới khi có người nhập seed data
// thật (không tự bịa tên/mô tả hành vi — ERP không được tự sáng tác mã năng
// lực ngoài xác nhận từ dự án khung năng lực).

export type NangLucOption = { id: string; ma_nang_luc: string; ten: string; mien: string };

export type NangLucCauHoiRow = {
  id: string;
  nang_luc_id: string | null;
  la_chinh: boolean;
  ma_nang_luc: string | null;
  ten_nang_luc: string | null;
  mien: string | null;
};

export type LayNangLucCauHoiResult =
  | { error: string }
  | { data: { tienTrinh: string | null; nangLucList: NangLucCauHoiRow[] } };
export type GanNangLucResult = { error: string } | { ok: true };

// Lấy tien_trinh hiện tại + danh sách năng lực đã gắn cho 1 câu hỏi — gọi khi
// mở modal gắn năng lực (không fetch kèm danh sách câu hỏi vì phần lớn sẽ
// không được mở). Join thủ công (2 truy vấn + map) thay vì embed PostgREST —
// khớp quy ước cả repo (xem cau-hoi/page.tsx: build Map rồi nối tay).
export async function layNangLucCauHoi(cauHoiId: string): Promise<LayNangLucCauHoiResult> {
  const supabase = await createClient();
  if (!cauHoiId) return { error: "Thiếu ID câu hỏi." };

  const [{ data: cauHoi, error: cauHoiError }, { data: ganList, error: ganError }] = await Promise.all([
    supabase.from("cau_hoi").select("tien_trinh").eq("id", cauHoiId).single(),
    supabase
      .from("cau_hoi_nang_luc")
      .select("id, nang_luc_id, la_chinh")
      .eq("cau_hoi_id", cauHoiId)
      .order("la_chinh", { ascending: false }),
  ]);

  if (cauHoiError || !cauHoi) return { error: "Không tìm thấy câu hỏi." };
  if (ganError) return { error: mapDbErrorNangLuc(ganError.message) };

  const nangLucIds = (ganList ?? []).map((r) => r.nang_luc_id).filter((id): id is string => id !== null);
  const nangLucMap = new Map<string, { ma_nang_luc: string; ten: string; mien: string }>();
  if (nangLucIds.length > 0) {
    const { data: nangLucRows } = await supabase
      .from("nang_luc")
      .select("id, ma_nang_luc, ten, mien")
      .in("id", nangLucIds);
    for (const nl of nangLucRows ?? []) nangLucMap.set(nl.id, nl);
  }

  const nangLucList: NangLucCauHoiRow[] = (ganList ?? []).map((row) => {
    const nl = row.nang_luc_id ? nangLucMap.get(row.nang_luc_id) : undefined;
    return {
      id: row.id,
      nang_luc_id: row.nang_luc_id,
      la_chinh: row.la_chinh,
      ma_nang_luc: nl?.ma_nang_luc ?? null,
      ten_nang_luc: nl?.ten ?? null,
      mien: nl?.mien ?? null,
    };
  });

  return { data: { tienTrinh: cauHoi.tien_trinh, nangLucList } };
}

export async function capNhatTienTrinh(cauHoiId: string, tienTrinhMa: string | null): Promise<GanNangLucResult> {
  const supabase = await createClient();
  if (!cauHoiId) return { error: "Thiếu ID câu hỏi." };

  const { error } = await supabase
    .from("cau_hoi")
    .update({ tien_trinh: tienTrinhMa })
    .eq("id", cauHoiId);

  if (error) return { error: mapDbErrorNangLuc(error.message) };

  revalidatePath("/dashboard/hoc-lieu/cau-hoi");
  return { ok: true };
}

// Gắn 1 năng lực cho câu hỏi. laChinh=true nghĩa là năng lực TRỌNG TÂM của
// câu hỏi này — DB chưa có ràng buộc "chỉ 1 dòng la_chinh=true mỗi câu hỏi",
// nên tự đảm bảo ở tầng app: bỏ đánh dấu la_chinh trên các dòng khác trước
// khi gắn dòng mới là chính.
export async function ganNangLucCauHoi(
  cauHoiId: string,
  nangLucId: string,
  laChinh: boolean
): Promise<GanNangLucResult> {
  const supabase = await createClient();
  if (!cauHoiId) return { error: "Thiếu ID câu hỏi." };
  if (!nangLucId) return { error: "Vui lòng chọn năng lực." };

  const { data: trung } = await supabase
    .from("cau_hoi_nang_luc")
    .select("id")
    .eq("cau_hoi_id", cauHoiId)
    .eq("nang_luc_id", nangLucId)
    .maybeSingle();
  if (trung) return { error: "Năng lực này đã được gắn cho câu hỏi rồi." };

  if (laChinh) {
    const { error: boDanhDauError } = await supabase
      .from("cau_hoi_nang_luc")
      .update({ la_chinh: false })
      .eq("cau_hoi_id", cauHoiId)
      .eq("la_chinh", true);
    if (boDanhDauError) return { error: mapDbErrorNangLuc(boDanhDauError.message) };
  }

  const { error } = await supabase
    .from("cau_hoi_nang_luc")
    .insert({ cau_hoi_id: cauHoiId, nang_luc_id: nangLucId, la_chinh: laChinh });

  if (error) return { error: mapDbErrorNangLuc(error.message) };

  revalidatePath("/dashboard/hoc-lieu/cau-hoi");
  return { ok: true };
}

export async function xoaGanNangLuc(id: string): Promise<GanNangLucResult> {
  const supabase = await createClient();
  if (!id) return { error: "Thiếu ID." };

  const { error } = await supabase.from("cau_hoi_nang_luc").delete().eq("id", id);
  if (error) return { error: mapDbErrorNangLuc(error.message) };

  revalidatePath("/dashboard/hoc-lieu/cau-hoi");
  return { ok: true };
}

function mapDbErrorNangLuc(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền gắn năng lực cho câu hỏi (chỉ Master Admin, Admin học thuật, Trưởng bộ môn, hoặc Giáo viên trong phạm vi môn được phân công).";
  return msg;
}
