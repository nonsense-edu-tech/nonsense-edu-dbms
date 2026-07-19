"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type HocSinh = {
  id: number;
  ma_hoc_sinh: string;
  ho_ten: string;
};

export type TaoHocSinhResult = { error: string } | { data: HocSinh };
export type SuaHocSinhResult = { error: string } | { ok: true };
export type XoaHocSinhResult = { error: string } | { ok: true };

const GIOI_TINH_HOP_LE = ["nam", "nu", "khac"] as const;
const TINH_TRANG_HOP_LE = ["da_dang_ky", "da_xac_nhan", "da_nhap_hoc", "huy_dang_ky"];

type ThongTinBoSung = {
  tinh_trang_dang_ky: string[] | null;
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  email: string | null;
  sdt_hoc_sinh: string | null;
  cccd: string | null;
  truong_thpt: string | null;
  khoi_thi: string | null;
  nv1: string | null;
  ten_phu_huynh: string | null;
  dia_chi: string | null;
};

function docThongTinBoSung(formData: FormData): ThongTinBoSung | { error: string } {
  const layChuoi = (key: string) => String(formData.get(key) ?? "").trim() || null;

  const gioiTinh = layChuoi("gioi_tinh");
  if (gioiTinh && !GIOI_TINH_HOP_LE.includes(gioiTinh as (typeof GIOI_TINH_HOP_LE)[number])) {
    return { error: "Giới tính không hợp lệ." };
  }

  const tinhTrang = formData.getAll("tinh_trang_dang_ky").map((v) => String(v));
  for (const t of tinhTrang) {
    if (!TINH_TRANG_HOP_LE.includes(t)) return { error: "Tình trạng đăng ký không hợp lệ." };
  }

  return {
    tinh_trang_dang_ky: tinhTrang.length > 0 ? tinhTrang : null,
    ngay_sinh: layChuoi("ngay_sinh"),
    gioi_tinh: gioiTinh,
    email: layChuoi("email"),
    sdt_hoc_sinh: layChuoi("sdt_hoc_sinh"),
    cccd: layChuoi("cccd"),
    truong_thpt: layChuoi("truong_thpt"),
    khoi_thi: layChuoi("khoi_thi"),
    nv1: layChuoi("nv1"),
    ten_phu_huynh: layChuoi("ten_phu_huynh"),
    dia_chi: layChuoi("dia_chi"),
  };
}

export async function taoHocSinh(formData: FormData): Promise<TaoHocSinhResult> {
  const supabase = await createClient();

  const lopId = Number(formData.get("lop_id"));
  const hoTen = String(formData.get("ho_ten") ?? "").trim();
  const sdtPhuHuynh = String(formData.get("sdt_phu_huynh") ?? "").trim() || null;

  if (!Number.isInteger(lopId) || lopId <= 0) {
    return { error: "Vui lòng chọn lớp." };
  }
  if (!hoTen) {
    return { error: "Vui lòng nhập họ tên học sinh." };
  }

  const boSung = docThongTinBoSung(formData);
  if ("error" in boSung) return boSung;

  const { data, error } = await supabase.rpc("tao_hoc_sinh", {
    p_lop_id: lopId,
    p_ho_ten: hoTen,
    p_sdt_phu_huynh: sdtPhuHuynh,
  });

  if (error) return { error: mapDbError(error.message) };

  const hocSinh = data as HocSinh;

  const coThongTinBoSung = Object.values(boSung).some((v) => v !== null);
  if (coThongTinBoSung) {
    const { error: updateError } = await supabase.from("hoc_sinh").update(boSung).eq("id", hocSinh.id);
    if (updateError) return { error: mapDbError(updateError.message) };
  }

  revalidatePath("/dashboard/hoc-sinh");
  return { data: hocSinh };
}

export async function suaHocSinh(formData: FormData): Promise<SuaHocSinhResult> {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  const hoTen = String(formData.get("ho_ten") ?? "").trim();
  const sdtPhuHuynh = String(formData.get("sdt_phu_huynh") ?? "").trim() || null;

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID học sinh." };
  if (!hoTen) return { error: "Vui lòng nhập họ tên học sinh." };

  const boSung = docThongTinBoSung(formData);
  if ("error" in boSung) return boSung;

  const { error } = await supabase
    .from("hoc_sinh")
    .update({ ho_ten: hoTen, sdt_phu_huynh: sdtPhuHuynh, ...boSung })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-sinh");
  return { ok: true };
}

export async function xoaHocSinh(id: number): Promise<XoaHocSinhResult> {
  const supabase = await createClient();

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID học sinh." };

  const { error } = await supabase
    .from("hoc_sinh")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-sinh");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này.";
  if (msg.includes("Chỉ Master Admin được xoá"))
    return "Chỉ Master Admin được xoá học sinh.";
  return msg;
}
