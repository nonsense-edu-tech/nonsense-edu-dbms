"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const HINH_THUC_HOP_LE = ["mot_lan", "hang_thang", "hang_quy", "tra_gop"];

export type TaoGoiResult = { error: string } | { ok: true };

export async function taoGoiHocPhi(formData: FormData): Promise<TaoGoiResult> {
  const supabase = await createClient();

  const chuongTrinhMa = String(formData.get("chuong_trinh_ma") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();
  const hinhThucDong = String(formData.get("hinh_thuc_dong") ?? "").trim();
  const giaNiemYet = Number(formData.get("gia_niem_yet"));
  const hieuLucTu = String(formData.get("hieu_luc_tu") ?? "").trim() || null;

  if (!/^[0-9]{3}$/.test(chuongTrinhMa)) return { error: "Chương trình không hợp lệ." };
  if (!ten) return { error: "Tên gói không được để trống." };
  if (!HINH_THUC_HOP_LE.includes(hinhThucDong)) return { error: "Hình thức đóng không hợp lệ." };
  if (!Number.isFinite(giaNiemYet) || giaNiemYet < 0) return { error: "Giá niêm yết phải là số ≥ 0." };

  const { error } = await supabase.from("goi_hoc_phi").insert({
    chuong_trinh_ma: chuongTrinhMa,
    ten,
    hinh_thuc_dong: hinhThucDong,
    gia_niem_yet: Math.round(giaNiemYet),
    ...(hieuLucTu ? { hieu_luc_tu: hieuLucTu } : {}),
  });

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/goi");
  return { ok: true };
}

export async function doiGiaGoi(formData: FormData): Promise<TaoGoiResult> {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  const giaMoi = Number(formData.get("gia_niem_yet_moi"));
  const ngayDoiGia = String(formData.get("ngay_doi_gia") ?? "").trim();

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID gói học phí." };
  if (!Number.isFinite(giaMoi) || giaMoi < 0) return { error: "Giá mới phải là số ≥ 0." };
  if (!ngayDoiGia) return { error: "Thiếu ngày áp dụng giá mới." };

  const { data: goiCu, error: fetchError } = await supabase
    .from("goi_hoc_phi")
    .select("chuong_trinh_ma, ten, hinh_thuc_dong")
    .eq("id", id)
    .single();

  if (fetchError || !goiCu) return { error: "Không tìm thấy gói học phí." };

  const ngayKetThucCu = new Date(ngayDoiGia);
  ngayKetThucCu.setDate(ngayKetThucCu.getDate() - 1);
  const hieuLucDenCu = ngayKetThucCu.toISOString().slice(0, 10);

  const { error: updateError } = await supabase
    .from("goi_hoc_phi")
    .update({ hieu_luc_den: hieuLucDenCu })
    .eq("id", id);

  if (updateError) return { error: mapDbError(updateError.message) };

  const { error: insertError } = await supabase.from("goi_hoc_phi").insert({
    chuong_trinh_ma: goiCu.chuong_trinh_ma,
    ten: goiCu.ten,
    hinh_thuc_dong: goiCu.hinh_thuc_dong,
    gia_niem_yet: Math.round(giaMoi),
    hieu_luc_tu: ngayDoiGia,
  });

  if (insertError) return { error: mapDbError(insertError.message) };

  revalidatePath("/dashboard/hoc-phi/goi");
  return { ok: true };
}

export async function ngungApDungGoi(id: number): Promise<TaoGoiResult> {
  const supabase = await createClient();

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID gói học phí." };

  const { error } = await supabase.from("goi_hoc_phi").update({ dang_ap_dung: false }).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/goi");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này (chỉ Master Admin / Kế toán).";
  return msg;
}
