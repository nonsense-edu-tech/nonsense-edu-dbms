"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HINH_THUC_DONG_OPTIONS, tinhDoanhThuThuan } from "@/components/hocPhiOptions";

const LOAI_GIAM_GIA_HOP_LE = ["khong", "phan_tram", "co_dinh"];

export type HopDongActionResult = { error: string } | { ok: true };

export async function taoHopDong(formData: FormData): Promise<HopDongActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const ghiDanhId = String(formData.get("ghi_danh_id") ?? "").trim();
  const goiHocPhiId = String(formData.get("goi_hoc_phi_id") ?? "").trim();
  const loaiGiamGia = String(formData.get("loai_giam_gia") ?? "khong").trim();
  const giaTriGiamGia = Number(formData.get("gia_tri_giam_gia") || 0);

  if (!ghiDanhId) return { error: "Vui lòng chọn lượt ghi danh." };
  if (!goiHocPhiId) return { error: "Vui lòng chọn gói học phí." };
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

export async function kichHoatHopDong(id: string): Promise<HopDongActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  if (!id) return { error: "Thiếu ID hợp đồng." };

  const { error } = await supabase
    .from("hop_dong_hoc_phi")
    .update({ trang_thai: "dang_hoat_dong", kich_hoat_luc: new Date().toISOString(), nguoi_duyet: user.id })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/hop-dong");
  revalidatePath("/dashboard/hoc-phi");
  return { ok: true };
}

export async function huyHopDong(id: string): Promise<HopDongActionResult> {
  const supabase = await createClient();

  if (!id) return { error: "Thiếu ID hợp đồng." };

  // Hợp đồng đã có phiếu thu KHÔNG được huỷ: phiếu thu bất biến, huỷ hợp đồng sẽ làm doanh thu về 0 và
  // "còn phải thu" tính sai (số đã thu bị bỏ khỏi sổ). Phải tất toán/chấm dứt hợp đồng theo quy trình riêng.
  const { count: soPhieuThu, error: demError } = await supabase
    .from("phieu_thu")
    .select("id", { count: "exact", head: true })
    .eq("hop_dong_id", id);
  if (demError) return { error: mapDbError(demError.message) };
  if ((soPhieuThu ?? 0) > 0) {
    return {
      error:
        `Hợp đồng này đã có ${soPhieuThu} phiếu thu nên không thể huỷ (huỷ sẽ làm sai công nợ và doanh thu). ` +
        "Nếu học sinh nghỉ/bảo lưu, hãy nhờ Master Admin tất toán hợp đồng thay vì huỷ.",
    };
  }

  const { error } = await supabase.from("hop_dong_hoc_phi").update({ trang_thai: "da_huy" }).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/hop-dong");
  revalidatePath("/dashboard/hoc-phi");
  return { ok: true };
}

export type SuaHopDongKetQua =
  | { error: string }
  | { ok: true; doanhThuCu: number; doanhThuMoi: number; thucThu: number; soKy: number; tongKyDuKien: number };

// Sửa hợp đồng — CHỈ Master Admin. Quyền được kiểm tra lại ở DB (RPC sua_hop_dong_master); nhật ký do trigger tự ghi.
export async function suaHopDongMaster(formData: FormData): Promise<SuaHopDongKetQua> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const id = String(formData.get("id") ?? "").trim();
  const giaNiemYet = Number(formData.get("gia_niem_yet"));
  const loaiGiamGia = String(formData.get("loai_giam_gia") ?? "khong").trim();
  const giaTriGiamGia = Number(formData.get("gia_tri_giam_gia") || 0);
  const hinhThucDong = String(formData.get("hinh_thuc_dong") ?? "").trim();
  const ghiChu = String(formData.get("ghi_chu") ?? "").trim();
  const lyDo = String(formData.get("ly_do") ?? "").trim();

  if (!id) return { error: "Thiếu ID hợp đồng." };
  if (!Number.isFinite(giaNiemYet) || giaNiemYet < 0) return { error: "Giá niêm yết phải là số ≥ 0." };
  if (!LOAI_GIAM_GIA_HOP_LE.includes(loaiGiamGia)) return { error: "Loại giảm giá không hợp lệ." };
  if (!Number.isFinite(giaTriGiamGia) || giaTriGiamGia < 0) return { error: "Giá trị giảm giá phải là số ≥ 0." };
  if (loaiGiamGia === "phan_tram" && giaTriGiamGia > 100) return { error: "Giảm theo % không được vượt quá 100." };
  if (!HINH_THUC_DONG_OPTIONS.includes(hinhThucDong)) return { error: "Hình thức đóng không hợp lệ." };
  if (lyDo.length < 5) return { error: "Vui lòng nhập lý do chỉnh sửa (tối thiểu 5 ký tự)." };

  const { data, error } = await supabase.rpc("sua_hop_dong_master", {
    p_id: id,
    p_gia_niem_yet: Math.round(giaNiemYet),
    p_loai_giam_gia: loaiGiamGia,
    p_gia_tri_giam_gia: Math.round(giaTriGiamGia),
    p_hinh_thuc_dong: hinhThucDong,
    p_ghi_chu: ghiChu,
    p_ly_do: lyDo,
  });
  if (error) return { error: mapDbError(error.message) };

  const kq = (data ?? {}) as Record<string, number>;
  revalidatePath("/dashboard/hoc-phi/hop-dong");
  revalidatePath("/dashboard/hoc-phi");
  return {
    ok: true,
    doanhThuCu: Number(kq.doanh_thu_thuan_cu ?? 0),
    doanhThuMoi: Number(kq.doanh_thu_thuan_moi ?? 0),
    thucThu: Number(kq.thuc_thu ?? 0),
    soKy: Number(kq.so_ky ?? 0),
    tongKyDuKien: Number(kq.tong_ky_du_kien ?? 0),
  };
}

export type DeXuatSuaKetQua = { error: string } | { ok: true };

// Admin Tuyển sinh đề xuất chỉnh sửa hợp đồng — KHÔNG đổi hợp đồng, chỉ tạo yêu cầu chờ Master Admin duyệt.
export async function deXuatSuaHopDong(formData: FormData): Promise<DeXuatSuaKetQua> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const id = String(formData.get("id") ?? "").trim();
  const giaNiemYet = Number(formData.get("gia_niem_yet"));
  const loaiGiamGia = String(formData.get("loai_giam_gia") ?? "khong").trim();
  const giaTriGiamGia = Number(formData.get("gia_tri_giam_gia") || 0);
  const hinhThucDong = String(formData.get("hinh_thuc_dong") ?? "").trim();
  const ghiChu = String(formData.get("ghi_chu") ?? "").trim();
  const lyDo = String(formData.get("ly_do") ?? "").trim();

  if (!id) return { error: "Thiếu ID hợp đồng." };
  if (!Number.isFinite(giaNiemYet) || giaNiemYet < 0) return { error: "Giá niêm yết phải là số ≥ 0." };
  if (!LOAI_GIAM_GIA_HOP_LE.includes(loaiGiamGia)) return { error: "Loại giảm giá không hợp lệ." };
  if (!Number.isFinite(giaTriGiamGia) || giaTriGiamGia < 0) return { error: "Giá trị giảm giá phải là số ≥ 0." };
  if (loaiGiamGia === "phan_tram" && giaTriGiamGia > 100) return { error: "Giảm theo % không được vượt quá 100." };
  if (!HINH_THUC_DONG_OPTIONS.includes(hinhThucDong)) return { error: "Hình thức đóng không hợp lệ." };
  if (lyDo.length < 5) return { error: "Vui lòng nêu lý do đề xuất (tối thiểu 5 ký tự)." };

  const { error } = await supabase.rpc("de_xuat_sua_hop_dong", {
    p_hop_dong_id: id,
    p_gia_niem_yet: Math.round(giaNiemYet),
    p_loai_giam_gia: loaiGiamGia,
    p_gia_tri_giam_gia: Math.round(giaTriGiamGia),
    p_hinh_thuc_dong: hinhThucDong,
    p_ghi_chu: ghiChu,
    p_ly_do: lyDo,
  });
  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-phi/hop-dong");
  revalidatePath("/dashboard/hoc-phi/yeu-cau-sua");
  return { ok: true };
}

export type NhatKyHopDong = {
  id: string;
  hanh_dong: string;
  ly_do: string | null;
  truoc: Record<string, unknown> | null;
  sau: Record<string, unknown> | null;
  created_at: string;
  nguoi: string;
};

// Lịch sử thay đổi của 1 hợp đồng. Chỉ Master Admin đọc được (RLS của nhat_ky).
export async function layLichSuHopDong(id: string): Promise<{ error: string } | { ok: true; list: NhatKyHopDong[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  if (!id) return { error: "Thiếu ID hợp đồng." };

  const { data, error } = await supabase
    .from("nhat_ky")
    .select("id, hanh_dong, ly_do, truoc, sau, created_at, nguoi_dung:nguoi_dung_id(email, ho_ten)")
    // Gồm cả sự kiện của các yêu cầu sửa gắn với hợp đồng này (đề xuất / duyệt / từ chối / rút).
    .or(`and(doi_tuong.eq.hop_dong_hoc_phi,doi_tuong_id.eq.${id}),and(doi_tuong.eq.yeu_cau_sua_hop_dong,sau->>hop_dong_id.eq.${id})`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);
  if (error) return { error: mapDbError(error.message) };

  const list: NhatKyHopDong[] = (data ?? []).map((n) => {
    const nguoi = n.nguoi_dung as unknown as { email: string; ho_ten: string | null } | null;
    return {
      id: n.id,
      hanh_dong: n.hanh_dong,
      ly_do: n.ly_do,
      truoc: (n.truoc ?? null) as Record<string, unknown> | null,
      sau: (n.sau ?? null) as Record<string, unknown> | null,
      created_at: n.created_at,
      nguoi: nguoi?.ho_ten ?? nguoi?.email ?? "Hệ thống / không xác định",
    };
  });
  return { ok: true, list };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này.";
  if (msg.includes("duplicate key") && msg.includes("ghi_danh_id"))
    return "Lượt ghi danh này đã có hợp đồng học phí rồi.";
  return msg;
}
