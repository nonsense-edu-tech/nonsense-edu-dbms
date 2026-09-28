"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type HocPhan = {
  id: string;
  ma: number;
  ten: string;
};

export type TaoHocPhanResult = { error: string } | { data: HocPhan };
export type SuaHocPhanResult = { error: string } | { ok: true };
export type XoaHocPhanResult = { error: string } | { ok: true };

function docMa(formData: FormData): number | { error: string } {
  const value = Number(formData.get("ma"));
  if (!Number.isInteger(value) || value < 1 || value > 99) {
    return { error: "Mã học phần phải là số nguyên từ 1 đến 99." };
  }
  return value;
}

export async function taoHocPhan(formData: FormData): Promise<TaoHocPhanResult> {
  const supabase = await createClient();

  const monHocId = String(formData.get("mon_hoc_id") ?? "").trim();
  const capHocMa = Number(formData.get("cap_hoc_ma"));
  const monHocMa = Number(formData.get("mon_hoc_ma"));
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!monHocId || !Number.isInteger(capHocMa) || !Number.isInteger(monHocMa)) {
    return { error: "Vui lòng chọn môn học." };
  }
  if (!ten) return { error: "Tên học phần không được để trống." };

  const ma = docMa(formData);
  if (typeof ma !== "number") return ma;

  const { data, error } = await supabase
    .from("hoc_phan")
    .insert({ mon_hoc_id: monHocId, cap_hoc_ma: capHocMa, mon_hoc_ma: monHocMa, ma, ten, mo_ta: moTa })
    .select("id, ma, ten")
    .single();

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/hoc-phan");
  return { data: data as HocPhan };
}

export async function suaHocPhan(formData: FormData): Promise<SuaHocPhanResult> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!id) return { error: "Thiếu ID học phần." };
  if (!ten) return { error: "Tên học phần không được để trống." };

  const ma = docMa(formData);
  if (typeof ma !== "number") return ma;

  const { error } = await supabase.from("hoc_phan").update({ ma, ten, mo_ta: moTa }).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/hoc-phan");
  return { ok: true };
}

export async function xoaHocPhan(id: string): Promise<XoaHocPhanResult> {
  const supabase = await createClient();

  if (!id) return { error: "Thiếu ID học phần." };

  const { error } = await supabase.from("hoc_phan").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/hoc-phan");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền quản lý học phần của môn học này (chỉ Master Admin, Admin học thuật trong phạm vi cấp học, hoặc Trưởng bộ môn trong phạm vi môn học).";
  if (msg.includes("uq_hoc_phan")) return "Mã học phần này đã tồn tại trong môn học đã chọn.";
  if (msg.includes("hoc_phan_ma_check")) return "Mã học phần phải từ 1 đến 99.";
  if (msg.includes("bai_hoc_hoc_phan_id_fkey") || msg.includes("update or delete"))
    return "Không thể xoá — học phần này còn bài học bên trong.";
  return msg;
}
