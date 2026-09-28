"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ChuDe = {
  id: string;
  mon_hoc_id: string;
  ma: number;
  ten: string;
};

export type TaoChuDeResult = { error: string } | { data: ChuDe };
export type SuaChuDeResult = { error: string } | { ok: true };
export type XoaChuDeResult = { error: string } | { ok: true };

function docMa(formData: FormData): number | { error: string } {
  const raw = formData.get("ma");
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 99) {
    return { error: "Mã chủ đề phải là số nguyên từ 1 đến 99." };
  }
  return value;
}

export async function taoChuDe(formData: FormData): Promise<TaoChuDeResult> {
  const supabase = await createClient();

  const monHocId = String(formData.get("mon_hoc_id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!monHocId) return { error: "Vui lòng chọn môn học." };
  if (!ten) return { error: "Tên chủ đề không được để trống." };

  const ma = docMa(formData);
  if (typeof ma !== "number") return ma;

  const { data, error } = await supabase
    .from("chu_de")
    .insert({ mon_hoc_id: monHocId, ma, ten, mo_ta: moTa })
    .select("id, mon_hoc_id, ma, ten")
    .single();

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/chu-de");
  return { data: data as ChuDe };
}

export async function suaChuDe(formData: FormData): Promise<SuaChuDeResult> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!id) return { error: "Thiếu ID chủ đề." };
  if (!ten) return { error: "Tên chủ đề không được để trống." };

  const ma = docMa(formData);
  if (typeof ma !== "number") return ma;

  const { error } = await supabase
    .from("chu_de")
    .update({ ma, ten, mo_ta: moTa })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/chu-de");
  return { ok: true };
}

export async function xoaChuDe(id: string): Promise<XoaChuDeResult> {
  const supabase = await createClient();

  if (!id) return { error: "Thiếu ID chủ đề." };

  const { error } = await supabase
    .from("chu_de")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/chu-de");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền quản lý chủ đề (chỉ Master Admin / Admin học thuật / Trưởng bộ môn).";
  if (msg.includes("uq_chu_de_mon"))
    return "Mã chủ đề này đã tồn tại trong môn học đã chọn.";
  if (msg.includes("chu_de_ma_check"))
    return "Mã chủ đề phải từ 1 đến 99.";
  return msg;
}
