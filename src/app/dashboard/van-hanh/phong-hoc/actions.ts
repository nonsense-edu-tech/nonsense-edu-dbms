"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type PhongHoc = {
  id: string;
  ten: string;
};

export type TaoPhongHocResult = { error: string } | { data: PhongHoc };
export type SuaPhongHocResult = { error: string } | { ok: true };
export type XoaPhongHocResult = { error: string } | { ok: true };

export async function taoPhongHoc(formData: FormData): Promise<TaoPhongHocResult> {
  const supabase = await createClient();

  const ten = String(formData.get("ten") ?? "").trim();
  const chiNhanhId = String(formData.get("chi_nhanh_id") ?? "").trim();
  const loaiPhongId = String(formData.get("loai_phong_id") ?? "").trim();

  if (!ten) return { error: "Tên phòng không được để trống." };
  if (!chiNhanhId) return { error: "Vui lòng chọn chi nhánh." };
  if (!loaiPhongId) return { error: "Vui lòng chọn loại phòng." };

  const { data, error } = await supabase
    .from("phong_hoc")
    .insert({ ten, chi_nhanh_id: chiNhanhId, loai_phong_id: loaiPhongId })
    .select("id, ten")
    .single();

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/phong-hoc");
  return { data: data as PhongHoc };
}

export async function suaPhongHoc(formData: FormData): Promise<SuaPhongHocResult> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();

  if (!id) return { error: "Thiếu ID phòng học." };
  if (!ten) return { error: "Tên phòng không được để trống." };

  const patch: Record<string, unknown> = { ten };

  if (formData.has("chi_nhanh_id")) {
    const chiNhanhId = String(formData.get("chi_nhanh_id") ?? "").trim();
    if (!chiNhanhId) return { error: "Chi nhánh không hợp lệ." };
    patch.chi_nhanh_id = chiNhanhId;
  }

  if (formData.has("loai_phong_id")) {
    const loaiPhongId = String(formData.get("loai_phong_id") ?? "").trim();
    if (!loaiPhongId) return { error: "Loại phòng không hợp lệ." };
    patch.loai_phong_id = loaiPhongId;
  }

  const { error } = await supabase.from("phong_hoc").update(patch).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/phong-hoc");
  return { ok: true };
}

export async function xoaPhongHoc(id: string): Promise<XoaPhongHocResult> {
  const supabase = await createClient();

  if (!id) return { error: "Thiếu ID phòng học." };

  const { error } = await supabase
    .from("phong_hoc")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/phong-hoc");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này trên phòng học này (kiểm tra lại chi nhánh phụ trách).";
  return msg;
}
