"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ChuongTrinhResult = { error: string } | { ok: true; ten: string };

const PATH = "/dashboard/hoc-lieu/chuong-trinh";

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Chỉ Master Admin được tạo/sửa/xoá chương trình.";
  if (msg.includes("chuong_trinh_ma_key") || msg.includes("chuong_trinh_pkey") || msg.includes("duplicate key"))
    return "Mã chương trình này đã tồn tại.";
  return msg;
}

// Mã chương trình là chuỗi 3 chữ số (CHAR(3)), vd "001".
function docMa(formData: FormData): string | { error: string } {
  const raw = String(formData.get("ma") ?? "").trim();
  if (!/^\d{1,3}$/.test(raw) || Number(raw) < 1) return { error: "Mã chương trình phải là số từ 1 đến 999." };
  return raw.padStart(3, "0");
}

export async function taoChuongTrinh(formData: FormData): Promise<ChuongTrinhResult> {
  const supabase = await createClient();
  const ten = String(formData.get("ten") ?? "").trim();
  if (!ten) return { error: "Tên chương trình không được để trống." };

  const ma = docMa(formData);
  if (typeof ma !== "string") return ma;

  const { error } = await supabase.from("chuong_trinh").insert({ ma, ten });
  if (error) return { error: mapDbError(error.message) };

  revalidatePath(PATH);
  return { ok: true, ten };
}

// Mã là một phần của ID lớp/học sinh/câu hỏi nên KHÔNG cho sửa — chỉ sửa tên.
export async function suaChuongTrinh(formData: FormData): Promise<ChuongTrinhResult> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();

  if (!id) return { error: "Thiếu ID chương trình." };
  if (!ten) return { error: "Tên chương trình không được để trống." };

  const { error } = await supabase.from("chuong_trinh").update({ ten }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  revalidatePath(PATH);
  return { ok: true, ten };
}

export async function xoaChuongTrinh(id: string, ma: string): Promise<ChuongTrinhResult> {
  const supabase = await createClient();
  if (!id) return { error: "Thiếu ID chương trình." };

  const [lop, goi, mapping] = await Promise.all([
    supabase.from("lop").select("id", { count: "exact", head: true }).eq("chuong_trinh_ma", ma).is("deleted_at", null),
    supabase.from("goi_hoc_phi").select("id", { count: "exact", head: true }).eq("chuong_trinh_ma", ma).is("deleted_at", null),
    supabase.from("chuong_trinh_mon_hoc").select("chuong_trinh_ma", { count: "exact", head: true }).eq("chuong_trinh_ma", ma),
  ]);
  if ((lop.count ?? 0) > 0) return { error: "Không thể xoá — chương trình này đã có lớp học." };
  if ((goi.count ?? 0) > 0) return { error: "Không thể xoá — chương trình này còn gói học phí." };
  if ((mapping.count ?? 0) > 0) return { error: "Không thể xoá — chương trình này còn môn học được gán — hãy gỡ hết môn học khỏi chương trình trước." };

  const { error } = await supabase.from("chuong_trinh").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  revalidatePath(PATH);
  return { ok: true, ten: "" };
}

// ---- Gán môn học vào chương trình (bảng chuong_trinh_mon_hoc, trục Model C) ----

export type GanMonResult = { error: string } | { ok: true };

function mapGanMonError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Chỉ Master Admin được gán/gỡ môn học khỏi chương trình.";
  if (msg.includes("duplicate key")) return "Môn học này đã được gán vào chương trình này rồi.";
  return msg;
}

export async function ganMonVaoChuongTrinh(formData: FormData): Promise<GanMonResult> {
  const supabase = await createClient();

  const chuongTrinhMa = String(formData.get("chuong_trinh_ma") ?? "").trim();
  const capHocMa = Number(formData.get("cap_hoc_ma"));
  const monHocMa = Number(formData.get("mon_hoc_ma"));

  if (!chuongTrinhMa) return { error: "Vui lòng chọn chương trình." };
  if (!Number.isInteger(capHocMa) || capHocMa < 1 || capHocMa > 9) return { error: "Vui lòng chọn cấp học." };
  if (!Number.isInteger(monHocMa) || monHocMa < 1 || monHocMa > 99) return { error: "Vui lòng chọn môn học." };

  const { error } = await supabase
    .from("chuong_trinh_mon_hoc")
    .insert({ chuong_trinh_ma: chuongTrinhMa, cap_hoc_ma: capHocMa, mon_hoc_ma: monHocMa });
  if (error) return { error: mapGanMonError(error.message) };

  revalidatePath(PATH);
  return { ok: true };
}

export async function goMonKhoiChuongTrinh(chuongTrinhMa: string, capHocMa: number, monHocMa: number): Promise<GanMonResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chuong_trinh_mon_hoc")
    .delete()
    .eq("chuong_trinh_ma", chuongTrinhMa)
    .eq("cap_hoc_ma", capHocMa)
    .eq("mon_hoc_ma", monHocMa);
  if (error) return { error: mapGanMonError(error.message) };

  revalidatePath(PATH);
  return { ok: true };
}
