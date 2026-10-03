"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type BaiHoc = {
  id: string;
  ma: number | null;
  ten: string;
};

export type TaoBaiHocResult = { error: string } | { data: BaiHoc };
export type SuaBaiHocResult = { error: string } | { ok: true };
export type XoaBaiHocResult = { error: string } | { ok: true };

// Mã để trống = hệ thống tự cấp (trigger DB, tuần tự trong học phần).
function docMa(formData: FormData): number | null | { error: string } {
  const raw = String(formData.get("ma") ?? "").trim();
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 99) {
    return { error: "Mã bài học phải là số nguyên từ 1 đến 99." };
  }
  return value;
}

export async function taoBaiHoc(formData: FormData): Promise<TaoBaiHocResult> {
  const supabase = await createClient();

  const hocPhanId = String(formData.get("hoc_phan_id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!hocPhanId) return { error: "Vui lòng chọn học phần." };
  if (!ten) return { error: "Tên bài học không được để trống." };

  const ma = docMa(formData);
  if (ma !== null && typeof ma !== "number") return ma;

  const { data, error } = await supabase
    .from("bai_hoc")
    .insert({ hoc_phan_id: hocPhanId, ...(ma === null ? {} : { ma }), ten, mo_ta: moTa })
    .select("id, ma, ten")
    .single();

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/bai-hoc");
  return { data: data as BaiHoc };
}

export async function suaBaiHoc(formData: FormData): Promise<SuaBaiHocResult> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!id) return { error: "Thiếu ID bài học." };
  if (!ten) return { error: "Tên bài học không được để trống." };

  const ma = docMa(formData);
  if (ma !== null && typeof ma !== "number") return ma;

  const { error } = await supabase
    .from("bai_hoc")
    .update({ ...(ma === null ? {} : { ma }), ten, mo_ta: moTa })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/bai-hoc");
  return { ok: true };
}

export async function xoaBaiHoc(id: string): Promise<XoaBaiHocResult> {
  const supabase = await createClient();

  if (!id) return { error: "Thiếu ID bài học." };

  const { error } = await supabase.from("bai_hoc").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/bai-hoc");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền quản lý bài học của học phần này (chỉ Master Admin, Admin học thuật trong phạm vi cấp học, hoặc Trưởng bộ môn trong phạm vi môn học).";
  if (msg.includes("uq_bai_hoc")) return "Mã bài học này đã tồn tại trong học phần đã chọn.";
  if (msg.includes("bai_hoc_ma_check")) return "Mã bài học phải từ 1 đến 99.";
  if (msg.includes("update or delete"))
    return "Không thể xoá — bài học này còn dữ liệu liên quan bên trong (chủ đề/câu hỏi).";
  return msg;
}
