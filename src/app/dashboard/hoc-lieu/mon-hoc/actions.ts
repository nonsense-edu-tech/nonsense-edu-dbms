"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MonHocResult = { error: string } | { ok: true; ten: string };

const PATH = "/dashboard/hoc-lieu/mon-hoc";

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền quản lý môn học của cấp học này (chỉ Master Admin, hoặc Admin học thuật trong phạm vi cấp học).";
  if (msg.includes("duplicate key") || msg.includes("mon_hoc_cap_hoc_ma_ma")) return "Mã môn học này đã tồn tại trong cấp học đã chọn.";
  if (msg.includes("mon_hoc_ma_check")) return "Mã môn học phải từ 1 đến 99.";
  return msg;
}

export async function taoMonHoc(formData: FormData): Promise<MonHocResult> {
  const supabase = await createClient();
  const capHocMa = Number(formData.get("cap_hoc_ma"));
  const ma = Number(formData.get("ma"));
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!Number.isInteger(capHocMa) || capHocMa < 1) return { error: "Vui lòng chọn cấp học." };
  if (!Number.isInteger(ma) || ma < 1 || ma > 99) return { error: "Mã môn học phải là số nguyên từ 1 đến 99." };
  if (!ten) return { error: "Tên môn học không được để trống." };

  const { error } = await supabase.from("mon_hoc").insert({ cap_hoc_ma: capHocMa, ma, ten, mo_ta: moTa });
  if (error) return { error: mapDbError(error.message) };

  revalidatePath(PATH);
  return { ok: true, ten };
}

// Mã môn nằm trong ID câu hỏi (2 số) nên KHÔNG cho sửa — chỉ sửa tên và mô tả.
export async function suaMonHoc(formData: FormData): Promise<MonHocResult> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!id) return { error: "Thiếu ID môn học." };
  if (!ten) return { error: "Tên môn học không được để trống." };

  const { error } = await supabase.from("mon_hoc").update({ ten, mo_ta: moTa }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  revalidatePath(PATH);
  return { ok: true, ten };
}

export async function xoaMonHoc(id: string, ma: number, capHocMa: number): Promise<MonHocResult> {
  const supabase = await createClient();
  if (!id) return { error: "Thiếu ID môn học." };

  const [hocPhan, chuDe, mapping] = await Promise.all([
    supabase.from("hoc_phan").select("id", { count: "exact", head: true }).eq("mon_hoc_id", id).is("deleted_at", null),
    supabase.from("chu_de").select("id", { count: "exact", head: true }).eq("mon_hoc_id", id).is("deleted_at", null),
    supabase.from("chuong_trinh_mon_hoc").select("mon_hoc_ma", { count: "exact", head: true }).eq("mon_hoc_ma", ma).eq("cap_hoc_ma", capHocMa),
  ]);
  if ((hocPhan.count ?? 0) > 0) return { error: "Không thể xoá — môn học này còn học phần bên trong." };
  if ((chuDe.count ?? 0) > 0) return { error: "Không thể xoá — môn học này còn chủ đề bên trong." };
  if ((mapping.count ?? 0) > 0) return { error: "Không thể xoá — môn học này còn được gán vào chương trình (Vận hành → Chương trình - Môn học)." };

  const { error } = await supabase.from("mon_hoc").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  revalidatePath(PATH);
  return { ok: true, ten: "" };
}
