"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CapHocResult = { error: string } | { ok: true; ten: string };

const PATH = "/dashboard/hoc-lieu/cap-hoc";

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Chỉ Master Admin được tạo/sửa/xoá cấp học.";
  if (msg.includes("cap_hoc_ma_key") || msg.includes("duplicate key")) return "Mã cấp học này đã tồn tại.";
  if (msg.includes("cap_hoc_ma_check")) return "Mã cấp học phải từ 1 đến 9.";
  return msg;
}

export async function taoCapHoc(formData: FormData): Promise<CapHocResult> {
  const supabase = await createClient();
  const ma = Number(formData.get("ma"));
  const ten = String(formData.get("ten") ?? "").trim();

  if (!Number.isInteger(ma) || ma < 1 || ma > 9) return { error: "Mã cấp học phải là số nguyên từ 1 đến 9." };
  if (!ten) return { error: "Tên cấp học không được để trống." };

  const { error } = await supabase.from("cap_hoc").insert({ ma, ten });
  if (error) return { error: mapDbError(error.message) };

  revalidatePath(PATH);
  return { ok: true, ten };
}

// Mã (ma) là một phần của ID lớp/học sinh/câu hỏi nên KHÔNG cho sửa — chỉ sửa tên.
export async function suaCapHoc(formData: FormData): Promise<CapHocResult> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();

  if (!id) return { error: "Thiếu ID cấp học." };
  if (!ten) return { error: "Tên cấp học không được để trống." };

  const { error } = await supabase.from("cap_hoc").update({ ten }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  revalidatePath(PATH);
  return { ok: true, ten };
}

export async function xoaCapHoc(id: string, ma: number): Promise<CapHocResult> {
  const supabase = await createClient();
  if (!id) return { error: "Thiếu ID cấp học." };

  const [mon, lop, mapping] = await Promise.all([
    supabase.from("mon_hoc").select("id", { count: "exact", head: true }).eq("cap_hoc_ma", ma).is("deleted_at", null),
    supabase.from("lop").select("id", { count: "exact", head: true }).eq("cap_hoc_ma", ma).is("deleted_at", null),
    supabase.from("chuong_trinh_mon_hoc").select("cap_hoc_ma", { count: "exact", head: true }).eq("cap_hoc_ma", ma),
  ]);
  if ((mon.count ?? 0) > 0) return { error: "Không thể xoá — cấp học này còn môn học bên trong." };
  if ((lop.count ?? 0) > 0) return { error: "Không thể xoá — cấp học này đã có lớp học." };
  if ((mapping.count ?? 0) > 0) return { error: "Không thể xoá — cấp học này còn được gán vào chương trình (tab Chương trình)." };

  const { error } = await supabase.from("cap_hoc").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  revalidatePath(PATH);
  return { ok: true, ten: "" };
}
