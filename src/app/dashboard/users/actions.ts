"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const VAI_TRO_HOP_LE = ["master_admin", "admin_ts", "admin_ht", "truong_bm", "gv", "ke_toan", "thu_ngan"] as const;
const TRANG_THAI_HOP_LE = ["active", "disabled"] as const;

export type CapNhatUserResult = { error: string } | { ok: true };

export async function capNhatUser(formData: FormData): Promise<CapNhatUserResult> {
  const supabase = await createClient();

  const userId = String(formData.get("user_id") ?? "").trim();
  const vaiTro = String(formData.get("vai_tro") ?? "").trim();
  const trangThai = String(formData.get("trang_thai") ?? "").trim();

  if (!userId) return { error: "Thiếu user_id." };
  if (!VAI_TRO_HOP_LE.includes(vaiTro as (typeof VAI_TRO_HOP_LE)[number])) {
    return { error: "Vai trò không hợp lệ." };
  }
  if (!TRANG_THAI_HOP_LE.includes(trangThai as (typeof TRANG_THAI_HOP_LE)[number])) {
    return { error: "Trạng thái không hợp lệ." };
  }

  const { data: target } = await supabase
    .from("users")
    .select("vai_tro")
    .eq("id", userId)
    .single();

  if (target?.vai_tro === "master_admin") {
    return {
      error: "Tài khoản Master Admin bị khoá cứng — không thể đổi vai trò/trạng thái qua giao diện. Dùng Supabase SQL Editor nếu thực sự cần.",
    };
  }

  const { error } = await supabase
    .from("users")
    .update({ vai_tro: vaiTro, trang_thai: trangThai })
    .eq("id", userId);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/users");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền sửa người dùng (chỉ Master Admin).";
  return msg;
}
