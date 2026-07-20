"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const HINH_THUC_HOP_LE = ["tien_mat", "chuyen_khoan"];

export type TaoPhieuThuResult = { error: string } | { data: { ma_phieu_thu: string } };

export async function taoPhieuThu(formData: FormData): Promise<TaoPhieuThuResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const hopDongId = Number(formData.get("hop_dong_id"));
  const soTien = Number(formData.get("so_tien"));
  const ngayThu = String(formData.get("ngay_thu") ?? "").trim();
  const hinhThuc = String(formData.get("hinh_thuc") ?? "").trim();
  const ghiChu = String(formData.get("ghi_chu") ?? "").trim() || null;

  if (!Number.isInteger(hopDongId) || hopDongId <= 0) return { error: "Vui lòng chọn hợp đồng." };
  if (!Number.isFinite(soTien) || soTien <= 0) return { error: "Số tiền phải lớn hơn 0." };
  if (!ngayThu) return { error: "Vui lòng chọn ngày thu." };
  if (!HINH_THUC_HOP_LE.includes(hinhThuc)) return { error: "Hình thức thu không hợp lệ." };

  const { data: maPhieuThu, error: rpcError } = await supabase.rpc("tao_ma_phieu_thu");
  if (rpcError) return { error: mapDbError(rpcError.message) };

  const { error } = await supabase.from("phieu_thu").insert({
    ma_phieu_thu: maPhieuThu,
    hop_dong_id: hopDongId,
    so_tien: Math.round(soTien),
    ngay_thu: ngayThu,
    hinh_thuc: hinhThuc,
    ghi_chu: ghiChu,
    nguoi_thu: user.id,
  });

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/thu-tien");
  revalidatePath("/dashboard/hoc-phi");
  return { data: { ma_phieu_thu: maPhieuThu as string } };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền ghi phiếu thu.";
  return msg;
}
