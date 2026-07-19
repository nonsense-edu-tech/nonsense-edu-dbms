"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type HocSinh = {
  id: number;
  ma_hoc_sinh: string;
  ho_ten: string;
};

export type TaoHocSinhResult = { error: string } | { data: HocSinh };

export async function taoHocSinh(formData: FormData): Promise<TaoHocSinhResult> {
  const supabase = await createClient();

  const lopId = Number(formData.get("lop_id"));
  const hoTen = String(formData.get("ho_ten") ?? "").trim();
  const sdtPhuHuynh = String(formData.get("sdt_phu_huynh") ?? "").trim() || null;

  if (!Number.isInteger(lopId) || lopId <= 0) {
    return { error: "Vui lòng chọn lớp." };
  }
  if (!hoTen) {
    return { error: "Vui lòng nhập họ tên học sinh." };
  }

  const { data, error } = await supabase.rpc("tao_hoc_sinh", {
    p_lop_id: lopId,
    p_ho_ten: hoTen,
    p_sdt_phu_huynh: sdtPhuHuynh,
  });

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-sinh");
  return { data: data as HocSinh };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền tạo học sinh (chỉ Master Admin / admin_ts).";
  return msg;
}
