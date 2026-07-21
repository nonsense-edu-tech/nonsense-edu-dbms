"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const HINH_THUC_HOP_LE = ["tien_mat", "chuyen_khoan"];
const MIME_HOP_LE = ["image/jpeg", "image/png", "image/heic", "application/pdf"];
const DUNG_LUONG_TOI_DA_BYTE = 10 * 1024 * 1024;
const SO_TEP_TOI_DA = 2;

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

  // Tên người thu lấy từ hồ sơ của CHÍNH người đang đăng nhập (RLS chỉ cho đọc
  // chính mình) — không nhận từ client, đảm bảo không sửa được qua form.
  const { data: hoSo } = await supabase.from("users").select("ho_ten").eq("id", user.id).single();
  const nguoiThuTen = hoSo?.ho_ten?.trim() || user.email || "?";

  const tepList = formData
    .getAll("tep_dinh_kem")
    .filter((v): v is File => v instanceof File && v.size > 0)
    .slice(0, SO_TEP_TOI_DA);

  for (const tep of tepList) {
    if (!MIME_HOP_LE.includes(tep.type)) {
      return { error: `File "${tep.name}" sai định dạng. Chỉ nhận jpg/png/heic/pdf.` };
    }
    if (tep.size > DUNG_LUONG_TOI_DA_BYTE) {
      return { error: `File "${tep.name}" vượt quá 10MB.` };
    }
  }

  const tepDinhKemIds: number[] = [];
  for (const [index, tep] of tepList.entries()) {
    const tenAnToan = tep.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const duongDan = `hd-${hopDongId}/${Date.now()}-${index}-${tenAnToan}`;

    const { error: uploadError } = await supabase.storage.from("bien-lai").upload(duongDan, tep, {
      contentType: tep.type,
    });
    if (uploadError) return { error: `Tải file "${tep.name}" thất bại: ${uploadError.message}` };

    const { data: tepDinhKem, error: tepError } = await supabase
      .from("tep_dinh_kem")
      .insert({
        ten_tep: tep.name,
        loai_mime: tep.type,
        dung_luong: tep.size,
        duong_dan_luu_tru: duongDan,
        nguoi_tai_len: user.id,
      })
      .select("id")
      .single();

    if (tepError || !tepDinhKem) return { error: mapDbError(tepError?.message ?? "Lỗi lưu biên lai.") };
    tepDinhKemIds.push(tepDinhKem.id);
  }

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
    nguoi_thu_ten: nguoiThuTen,
    tep_dinh_kem_id: tepDinhKemIds[0] ?? null,
    tep_dinh_kem_id_2: tepDinhKemIds[1] ?? null,
  });

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/thu-tien");
  revalidatePath("/dashboard/hoc-phi");
  return { data: { ma_phieu_thu: maPhieuThu as string } };
}

export async function layDuongDanBienLai(duongDan: string): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("bien-lai").createSignedUrl(duongDan, 60 * 10);
  if (error || !data) return { error: "Không tạo được liên kết xem biên lai." };
  return { url: data.signedUrl };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền ghi phiếu thu.";
  return msg;
}
