"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type YeuCauSuaKetQua = { error: string } | { ok: true };

function lamMoi() {
  revalidatePath("/dashboard/hoc-phi/yeu-cau-sua");
  revalidatePath("/dashboard/hoc-phi/hop-dong");
  revalidatePath("/dashboard/hoc-phi");
}

function mapLoi(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này.";
  return msg;
}

// Master Admin phê duyệt hoặc từ chối — BẮT BUỘC có lý do. Quyền kiểm tra lại ở DB (xu_ly_yeu_cau_sua_hop_dong).
export async function xuLyYeuCauSua(
  id: string,
  quyet: "duyet" | "tu_choi",
  lyDo: string
): Promise<YeuCauSuaKetQua> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  if (!id) return { error: "Thiếu ID yêu cầu." };
  if (quyet !== "duyet" && quyet !== "tu_choi") return { error: "Quyết định không hợp lệ." };
  if (lyDo.trim().length < 5) {
    return { error: `Vui lòng nêu lý do ${quyet === "duyet" ? "phê duyệt" : "từ chối"} (tối thiểu 5 ký tự).` };
  }

  const { error } = await supabase.rpc("xu_ly_yeu_cau_sua_hop_dong", { p_id: id, p_quyet: quyet, p_ly_do: lyDo.trim() });
  if (error) return { error: mapLoi(error.message) };

  lamMoi();
  return { ok: true };
}

// Người đề xuất rút yêu cầu đang chờ.
export async function rutYeuCauSua(id: string): Promise<YeuCauSuaKetQua> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  if (!id) return { error: "Thiếu ID yêu cầu." };

  const { error } = await supabase.rpc("rut_yeu_cau_sua_hop_dong", { p_id: id });
  if (error) return { error: mapLoi(error.message) };

  lamMoi();
  return { ok: true };
}
