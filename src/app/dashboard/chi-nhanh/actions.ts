"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ChiNhanh = {
  id: number;
  ma: string;
  ten: string;
};

export type TaoChiNhanhResult = { error: string } | { data: ChiNhanh };
export type SuaChiNhanhResult = { error: string } | { ok: true };
export type XoaChiNhanhResult = { error: string } | { ok: true };
export type GanQuanLyResult = { error: string } | { ok: true };
export type GoQuanLyResult = { error: string } | { ok: true };

export async function taoChiNhanh(formData: FormData): Promise<TaoChiNhanhResult> {
  const supabase = await createClient();

  const ma = String(formData.get("ma") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();
  const diaChi = String(formData.get("dia_chi") ?? "").trim() || null;

  if (!ma) return { error: "Mã chi nhánh không được để trống." };
  if (!ten) return { error: "Tên chi nhánh không được để trống." };

  const { data, error } = await supabase
    .from("chi_nhanh")
    .insert({ ma, ten, dia_chi: diaChi })
    .select("id, ma, ten")
    .single();

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/chi-nhanh");
  return { data: data as ChiNhanh };
}

export async function suaChiNhanh(formData: FormData): Promise<SuaChiNhanhResult> {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  const ten = String(formData.get("ten") ?? "").trim();
  const diaChi = String(formData.get("dia_chi") ?? "").trim() || null;

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID chi nhánh." };
  if (!ten) return { error: "Tên chi nhánh không được để trống." };

  const { error } = await supabase
    .from("chi_nhanh")
    .update({ ten, dia_chi: diaChi })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/chi-nhanh");
  return { ok: true };
}

export async function xoaChiNhanh(id: number): Promise<XoaChiNhanhResult> {
  const supabase = await createClient();

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID chi nhánh." };

  const { error } = await supabase
    .from("chi_nhanh")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/chi-nhanh");
  return { ok: true };
}

export async function ganQuanLy(formData: FormData): Promise<GanQuanLyResult> {
  const supabase = await createClient();

  const chiNhanhId = Number(formData.get("chi_nhanh_id"));
  const userId = String(formData.get("user_id") ?? "").trim();

  if (!Number.isInteger(chiNhanhId) || chiNhanhId <= 0) return { error: "Thiếu chi nhánh." };
  if (!userId) return { error: "Vui lòng chọn người quản lý." };

  const { error } = await supabase
    .from("user_chi_nhanh")
    .insert({ chi_nhanh_id: chiNhanhId, user_id: userId });

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/chi-nhanh");
  return { ok: true };
}

export async function goQuanLy(id: number): Promise<GoQuanLyResult> {
  const supabase = await createClient();

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID phân công." };

  const { error } = await supabase.from("user_chi_nhanh").delete().eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/chi-nhanh");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này (chỉ Master Admin).";
  if (msg.includes("duplicate key") && msg.includes("chi_nhanh_ma_key"))
    return "Mã chi nhánh này đã tồn tại.";
  if (msg.includes("duplicate key") && msg.includes("user_chi_nhanh"))
    return "Người này đã được gán quản lý chi nhánh này rồi.";
  return msg;
}
