"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type LoaiPhong = {
  id: number;
  ten: string;
};

export type TaoLoaiPhongResult = { error: string } | { data: LoaiPhong };
export type SuaLoaiPhongResult = { error: string } | { ok: true };
export type XoaLoaiPhongResult = { error: string } | { ok: true };

function docSoTien(formData: FormData, key: string): number | { error: string } {
  const raw = formData.get(key);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return { error: `Giá trị "${key}" phải là số ≥ 0.` };
  return Math.round(value);
}

export async function taoLoaiPhong(formData: FormData): Promise<TaoLoaiPhongResult> {
  const supabase = await createClient();

  const ten = String(formData.get("ten") ?? "").trim();
  const hieuLucTu = String(formData.get("hieu_luc_tu") ?? "").trim();
  const hieuLucDen = String(formData.get("hieu_luc_den") ?? "").trim() || null;

  if (!ten) return { error: "Tên loại phòng không được để trống." };
  if (!hieuLucTu) return { error: "Vui lòng chọn ngày hiệu lực từ." };

  const donGiaThue = docSoTien(formData, "don_gia_thue_gio");
  if (typeof donGiaThue !== "number") return donGiaThue;
  const donGiaDienNuoc = docSoTien(formData, "don_gia_dien_nuoc_gio");
  if (typeof donGiaDienNuoc !== "number") return donGiaDienNuoc;
  const donGiaKhauHaoRaw = formData.get("don_gia_khau_hao_gio");
  const donGiaKhauHao = donGiaKhauHaoRaw ? docSoTien(formData, "don_gia_khau_hao_gio") : 0;
  if (typeof donGiaKhauHao !== "number") return donGiaKhauHao;

  const { data, error } = await supabase
    .from("loai_phong")
    .insert({
      ten,
      don_gia_thue_gio: donGiaThue,
      don_gia_dien_nuoc_gio: donGiaDienNuoc,
      don_gia_khau_hao_gio: donGiaKhauHao,
      hieu_luc_tu: hieuLucTu,
      hieu_luc_den: hieuLucDen,
    })
    .select("id, ten")
    .single();

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/loai-phong");
  return { data: data as LoaiPhong };
}

export async function suaLoaiPhong(formData: FormData): Promise<SuaLoaiPhongResult> {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  const ten = String(formData.get("ten") ?? "").trim();
  const hieuLucTu = String(formData.get("hieu_luc_tu") ?? "").trim();
  const hieuLucDen = String(formData.get("hieu_luc_den") ?? "").trim() || null;

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID loại phòng." };
  if (!ten) return { error: "Tên loại phòng không được để trống." };
  if (!hieuLucTu) return { error: "Vui lòng chọn ngày hiệu lực từ." };

  const donGiaThue = docSoTien(formData, "don_gia_thue_gio");
  if (typeof donGiaThue !== "number") return donGiaThue;
  const donGiaDienNuoc = docSoTien(formData, "don_gia_dien_nuoc_gio");
  if (typeof donGiaDienNuoc !== "number") return donGiaDienNuoc;
  const donGiaKhauHao = docSoTien(formData, "don_gia_khau_hao_gio");
  if (typeof donGiaKhauHao !== "number") return donGiaKhauHao;

  const { error } = await supabase
    .from("loai_phong")
    .update({
      ten,
      don_gia_thue_gio: donGiaThue,
      don_gia_dien_nuoc_gio: donGiaDienNuoc,
      don_gia_khau_hao_gio: donGiaKhauHao,
      hieu_luc_tu: hieuLucTu,
      hieu_luc_den: hieuLucDen,
    })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/loai-phong");
  return { ok: true };
}

export async function xoaLoaiPhong(id: number): Promise<XoaLoaiPhongResult> {
  const supabase = await createClient();

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID loại phòng." };

  const { error } = await supabase
    .from("loai_phong")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/loai-phong");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này (chỉ Master Admin quản lý đơn giá phòng).";
  return msg;
}
