"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Lop = {
  id: number;
  ma_lop: string;
  ten_lop: string | null;
};

export type TaoLopResult = { error: string } | { data: Lop };

export async function taoLop(formData: FormData): Promise<TaoLopResult> {
  const supabase = await createClient();

  const capHoc = Number(formData.get("cap_hoc"));
  const chuongTrinh = String(formData.get("chuong_trinh") ?? "").trim();
  const namHoc = Number(formData.get("nam_hoc"));
  const tenLop = String(formData.get("ten_lop") ?? "").trim() || null;

  if (!Number.isInteger(capHoc) || capHoc < 1 || capHoc > 9) {
    return { error: "Cấp học phải là số từ 1-9." };
  }
  if (!/^[0-9]{3}$/.test(chuongTrinh)) {
    return { error: "Chương trình phải là chuỗi 3 chữ số (vd 012)." };
  }
  if (!Number.isInteger(namHoc) || namHoc < 0 || namHoc > 99) {
    return { error: "Năm học phải là số từ 00-99 (vd 25 = 2025-2026)." };
  }

  const { data, error } = await supabase.rpc("tao_lop", {
    p_cap_hoc: capHoc,
    p_chuong_trinh: chuongTrinh,
    p_nam_hoc: namHoc,
    p_ten_lop: tenLop,
  });

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/lop");
  return { data: data as Lop };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền tạo lớp (chỉ Master Admin / admin_ts).";
  return msg;
}
