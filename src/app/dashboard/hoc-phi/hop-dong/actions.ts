"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tinhDoanhThuThuan } from "@/components/hocPhiOptions";

const LOAI_GIAM_GIA_HOP_LE = ["khong", "phan_tram", "co_dinh"];

export type HopDongActionResult = { error: string } | { ok: true };

export async function taoHopDong(formData: FormData): Promise<HopDongActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const ghiDanhId = Number(formData.get("ghi_danh_id"));
  const goiHocPhiId = Number(formData.get("goi_hoc_phi_id"));
  const loaiGiamGia = String(formData.get("loai_giam_gia") ?? "khong").trim();
  const giaTriGiamGia = Number(formData.get("gia_tri_giam_gia") || 0);

  if (!Number.isInteger(ghiDanhId) || ghiDanhId <= 0) return { error: "Vui lòng chọn lượt ghi danh." };
  if (!Number.isInteger(goiHocPhiId) || goiHocPhiId <= 0) return { error: "Vui lòng chọn gói học phí." };
  if (!LOAI_GIAM_GIA_HOP_LE.includes(loaiGiamGia)) return { error: "Loại giảm giá không hợp lệ." };
  if (!Number.isFinite(giaTriGiamGia) || giaTriGiamGia < 0) return { error: "Giá trị giảm giá phải là số ≥ 0." };
  if (loaiGiamGia === "phan_tram" && giaTriGiamGia > 100) return { error: "Giảm theo % không được vượt quá 100." };

  const { data: goi, error: goiError } = await supabase
    .from("goi_hoc_phi")
    .select("gia_niem_yet, hinh_thuc_dong")
    .eq("id", goiHocPhiId)
    .single();
  if (goiError || !goi) return { error: "Không tìm thấy gói học phí." };

  const { soTienGiam, doanhThuThuan } = tinhDoanhThuThuan(goi.gia_niem_yet, loaiGiamGia, giaTriGiamGia);

  const { error } = await supabase.from("hop_dong_hoc_phi").insert({
    ghi_danh_id: ghiDanhId,
    goi_hoc_phi_id: goiHocPhiId,
    gia_niem_yet: goi.gia_niem_yet,
    loai_giam_gia: loaiGiamGia,
    gia_tri_giam_gia: Math.round(giaTriGiamGia),
    so_tien_giam: soTienGiam,
    doanh_thu_thuan: doanhThuThuan,
    hinh_thuc_dong: goi.hinh_thuc_dong,
    nguoi_tao: user.id,
  });

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/hop-dong");
  revalidatePath("/dashboard/hoc-phi");
  return { ok: true };
}

export async function kichHoatHopDong(id: number): Promise<HopDongActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID hợp đồng." };

  const { error } = await supabase
    .from("hop_dong_hoc_phi")
    .update({ trang_thai: "dang_hoat_dong", kich_hoat_luc: new Date().toISOString(), nguoi_duyet: user.id })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/hop-dong");
  revalidatePath("/dashboard/hoc-phi");
  return { ok: true };
}

export async function huyHopDong(id: number): Promise<HopDongActionResult> {
  const supabase = await createClient();

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID hợp đồng." };

  const { error } = await supabase.from("hop_dong_hoc_phi").update({ trang_thai: "da_huy" }).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/hop-dong");
  revalidatePath("/dashboard/hoc-phi");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này.";
  if (msg.includes("duplicate key") && msg.includes("ghi_danh_id"))
    return "Lượt ghi danh này đã có hợp đồng học phí rồi.";
  return msg;
}
