"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TRANG_THAI_HOP_LE = ["du_kien", "da_day", "huy"];

export type TaoBuoiHocResult = { error: string } | { data: { id: number } };
export type SuaBuoiHocResult = { error: string } | { ok: true };
export type XoaBuoiHocResult = { error: string } | { ok: true };
export type GanChiPhiResult = { error: string } | { ok: true };

function docChuoiTuyChon(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (raw === null) return null;
  const value = String(raw).trim();
  return value || null;
}

export async function taoBuoiHoc(formData: FormData): Promise<TaoBuoiHocResult> {
  const supabase = await createClient();

  const lopId = Number(formData.get("lop_id"));
  const monHocMa = Number(formData.get("mon_hoc_ma"));
  const ngay = String(formData.get("ngay") ?? "").trim();
  const gvId = docChuoiTuyChon(formData, "gv_id");
  const phongHocId = docChuoiTuyChon(formData, "phong_hoc_id");
  const gioBatDau = docChuoiTuyChon(formData, "gio_bat_dau");
  const gioKetThuc = docChuoiTuyChon(formData, "gio_ket_thuc");

  if (!Number.isInteger(lopId) || lopId <= 0) return { error: "Vui lòng chọn lớp." };
  if (!Number.isInteger(monHocMa) || monHocMa <= 0) return { error: "Vui lòng chọn môn học." };
  if (!ngay) return { error: "Vui lòng chọn ngày học." };

  const { data, error } = await supabase
    .from("buoi_hoc")
    .insert({
      lop_id: lopId,
      mon_hoc_ma: monHocMa,
      ngay,
      gv_id: gvId,
      phong_hoc_id: phongHocId ? Number(phongHocId) : null,
      gio_bat_dau: gioBatDau,
      gio_ket_thuc: gioKetThuc,
    })
    .select("id")
    .single();

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/buoi-hoc");
  return { data: data as { id: number } };
}

export async function suaBuoiHoc(formData: FormData): Promise<SuaBuoiHocResult> {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID buổi học." };

  const patch: Record<string, unknown> = {};

  if (formData.has("mon_hoc_ma")) {
    const monHocMa = Number(formData.get("mon_hoc_ma"));
    if (!Number.isInteger(monHocMa) || monHocMa <= 0) return { error: "Môn học không hợp lệ." };
    patch.mon_hoc_ma = monHocMa;
  }
  if (formData.has("gv_id")) {
    patch.gv_id = docChuoiTuyChon(formData, "gv_id");
  }
  if (formData.has("phong_hoc_id")) {
    const phongHocId = docChuoiTuyChon(formData, "phong_hoc_id");
    patch.phong_hoc_id = phongHocId ? Number(phongHocId) : null;
  }
  if (formData.has("ngay")) {
    const ngay = String(formData.get("ngay") ?? "").trim();
    if (!ngay) return { error: "Vui lòng chọn ngày học." };
    patch.ngay = ngay;
  }
  if (formData.has("gio_bat_dau")) {
    patch.gio_bat_dau = docChuoiTuyChon(formData, "gio_bat_dau");
  }
  if (formData.has("gio_ket_thuc")) {
    patch.gio_ket_thuc = docChuoiTuyChon(formData, "gio_ket_thuc");
  }
  if (formData.has("trang_thai")) {
    const trangThai = String(formData.get("trang_thai") ?? "").trim();
    if (!TRANG_THAI_HOP_LE.includes(trangThai)) return { error: "Trạng thái không hợp lệ." };
    patch.trang_thai = trangThai;
  }

  const { error } = await supabase.from("buoi_hoc").update(patch).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/buoi-hoc");
  return { ok: true };
}

export async function xoaBuoiHoc(id: number): Promise<XoaBuoiHocResult> {
  const supabase = await createClient();

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID buổi học." };

  const { error } = await supabase
    .from("buoi_hoc")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/buoi-hoc");
  return { ok: true };
}

export async function ganChiPhiBuoiHoc(formData: FormData): Promise<GanChiPhiResult> {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  const thuLaoGv = Number(formData.get("thu_lao_gv") || 0);
  const chiPhiPhong = Number(formData.get("chi_phi_phong") || 0);

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID buổi học." };
  if (!Number.isFinite(thuLaoGv) || thuLaoGv < 0) return { error: "Thù lao GV phải là số ≥ 0." };
  if (!Number.isFinite(chiPhiPhong) || chiPhiPhong < 0) return { error: "Chi phí phòng phải là số ≥ 0." };

  const { error } = await supabase
    .from("buoi_hoc_chi_phi")
    .update({ thu_lao_gv: Math.round(thuLaoGv), chi_phi_phong: Math.round(chiPhiPhong) })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/buoi-hoc");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này trên buổi học này.";
  if (msg.includes("không hợp lệ cho cấp học"))
    return "Môn học không thuộc cấp học của lớp này.";
  if (msg.includes("duplicate key"))
    return "Lớp này đã có buổi học cho môn này vào đúng ngày đó rồi.";
  return msg;
}
