"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DANG_CAU_CHUA_HO_TRO, layLoaiDangCau, type LoaiDangCau } from "@/components/dangCauOptions";
import { TRANG_THAI_LABEL } from "@/components/trangThaiCauHoi";
import { luuCauHoi, mapDbError } from "./luu-cau-hoi";

type CauHoi = {
  id: string;
  ma_cau_hoi: string;
};

export type TaoCauHoiResult = { error: string } | { data: CauHoi };
export type SuaCauHoiResult = { error: string } | { ok: true };
export type XoaCauHoiResult = { error: string } | { ok: true };
export type LuaChonRow = { id: string; thu_tu: number; noi_dung: string; la_dap_an: boolean };
export type LayLuaChonResult = { error: string } | { data: LuaChonRow[] };

function docSoNguyen(formData: FormData, key: string, ten: string, min: number, max: number): number | { error: string } {
  const raw = formData.get(key);
  if (raw === null || raw === "") return { error: `Vui lòng chọn ${ten}.` };
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return { error: `${ten} không hợp lệ.` };
  }
  return value;
}

type DapAnDaXuLy = { dapAnText: string | null; luaChonList: { noi_dung: string; la_dap_an: boolean }[] };

// Đọc + validate phần đáp án theo đúng dạng câu — dùng chung cho tạo mới và
// sửa câu hỏi (cấu trúc form giống hệt nhau, xem DapAnFields.tsx).
function docDapAn(formData: FormData, loaiDangCau: LoaiDangCau): DapAnDaXuLy | { error: string } {
  if (loaiDangCau === "single" || loaiDangCau === "multi" || loaiDangCau === "dung_sai") {
    const luaChonNoiDung = formData.getAll("lua_chon_noi_dung").map((v) => String(v).trim());
    const luaChonDungIdx = new Set(formData.getAll("lua_chon_dung").map((v) => String(v)));
    const luaChonList = luaChonNoiDung
      .map((noi_dung, idx) => ({ noi_dung, la_dap_an: luaChonDungIdx.has(String(idx)) }))
      .filter((lc) => lc.noi_dung !== "");

    if (loaiDangCau === "dung_sai") {
      if (luaChonList.length < 1) return { error: "Vui lòng nhập ít nhất 1 mệnh đề." };
    } else {
      if (luaChonList.length < 2) return { error: "Trắc nghiệm cần ít nhất 2 lựa chọn." };
      const soDapAnDung = luaChonList.filter((lc) => lc.la_dap_an).length;
      if (loaiDangCau === "single" && soDapAnDung !== 1) {
        return { error: "Trắc nghiệm 1 đáp án phải đánh dấu đúng 1 lựa chọn đúng." };
      }
      if (loaiDangCau === "multi" && soDapAnDung < 1) {
        return { error: "Trắc nghiệm nhiều đáp án cần đánh dấu ít nhất 1 lựa chọn đúng." };
      }
    }
    return { dapAnText: null, luaChonList };
  }

  if (loaiDangCau === "dien_khuyet") {
    const dapAnList = formData
      .getAll("dien_khuyet_dap_an")
      .map((v) => String(v).trim())
      .filter((v) => v !== "");
    if (dapAnList.length < 1) return { error: "Vui lòng nhập ít nhất 1 đáp án cho chỗ trống." };
    return { dapAnText: dapAnList.join(" | "), luaChonList: [] };
  }

  // "text" (trả lời ngắn/tự luận) — đáp án tuỳ chọn, tự luận có thể để trống.
  const dapAnText = String(formData.get("dap_an_text") ?? "").trim() || null;
  return { dapAnText, luaChonList: [] };
}

export async function taoCauHoi(formData: FormData): Promise<TaoCauHoiResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const capHoc = docSoNguyen(formData, "cap_hoc", "cấp học", 1, 9);
  if (typeof capHoc !== "number") return capHoc;

  const chuongTrinhMaRaw = String(formData.get("chuong_trinh_ma") ?? "").trim();
  if (!chuongTrinhMaRaw) return { error: "Vui lòng chọn chương trình." };
  const chuongTrinh = Number(chuongTrinhMaRaw);
  if (!Number.isInteger(chuongTrinh) || chuongTrinh < 0 || chuongTrinh > 999) {
    return { error: "Mã chương trình không hợp lệ." };
  }

  const monHoc = docSoNguyen(formData, "mon_hoc_ma", "môn học", 1, 99);
  if (typeof monHoc !== "number") return monHoc;

  const hocPhan = docSoNguyen(formData, "hoc_phan_ma", "học phần", 1, 99);
  if (typeof hocPhan !== "number") return hocPhan;

  const baiHoc = docSoNguyen(formData, "bai_hoc_ma", "bài học", 1, 99);
  if (typeof baiHoc !== "number") return baiHoc;

  const chuDe = docSoNguyen(formData, "chu_de_ma", "chủ đề", 1, 99);
  if (typeof chuDe !== "number") return chuDe;

  const dangCau = docSoNguyen(formData, "dang_cau_ma", "dạng câu", 1, 9);
  if (typeof dangCau !== "number") return dangCau;

  if (DANG_CAU_CHUA_HO_TRO.includes(dangCau)) {
    return { error: "Dạng câu này chưa được hỗ trợ soạn thảo — vui lòng chọn dạng khác." };
  }

  const noiDung = String(formData.get("noi_dung") ?? "").trim();
  if (!noiDung) return { error: "Nội dung câu hỏi không được để trống." };

  const doKhoRaw = String(formData.get("do_kho") ?? "").trim();
  const doKho = doKhoRaw ? Number(doKhoRaw) : null;
  if (doKho !== null && (!Number.isInteger(doKho) || doKho < 1 || doKho > 5)) {
    return { error: "Độ khó phải từ 1 đến 5." };
  }

  const loiGiai = String(formData.get("loi_giai") ?? "").trim() || null;

  // Cấu trúc đáp án phụ thuộc dạng câu — xem dangCauOptions.ts (dùng chung UI/server).
  const loaiDangCau = layLoaiDangCau(dangCau);
  const dapAn = docDapAn(formData, loaiDangCau);
  if ("error" in dapAn) return dapAn;
  const { dapAnText, luaChonList } = dapAn;

  const ketQua = await luuCauHoi(supabase, user.id, {
    cap_hoc: capHoc,
    chuong_trinh: chuongTrinh,
    mon_hoc: monHoc,
    hoc_phan: hocPhan,
    bai_hoc: baiHoc,
    chu_de: chuDe,
    dang_cau: dangCau,
    noi_dung: noiDung,
    do_kho: doKho,
    loi_giai: loiGiai,
    dap_an_text: dapAnText,
    lua_chon: luaChonList,
  });
  if ("error" in ketQua) return ketQua;
  const cauHoi = ketQua.data;

  revalidatePath("/dashboard/ngan-hang-cau-hoi");
  return { data: cauHoi as CauHoi };
}

// Lấy lựa chọn/mệnh đề hiện có của 1 câu hỏi — gọi khi mở modal sửa để prefill
// (không fetch kèm theo danh sách câu hỏi vì phần lớn sẽ không được mở sửa).
export async function layLuaChonCauHoi(cauHoiId: string): Promise<LayLuaChonResult> {
  const supabase = await createClient();

  if (!cauHoiId) return { error: "Thiếu ID câu hỏi." };

  const { data, error } = await supabase
    .from("lua_chon")
    .select("id, thu_tu, noi_dung, la_dap_an")
    .eq("cau_hoi_id", cauHoiId)
    .order("thu_tu");

  if (error) return { error: mapDbError(error.message) };
  return { data: (data ?? []) as LuaChonRow[] };
}

export async function suaCauHoi(formData: FormData): Promise<SuaCauHoiResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Thiếu ID câu hỏi." };

  const noiDung = String(formData.get("noi_dung") ?? "").trim();
  if (!noiDung) return { error: "Nội dung câu hỏi không được để trống." };

  const doKhoRaw = String(formData.get("do_kho") ?? "").trim();
  const doKho = doKhoRaw ? Number(doKhoRaw) : null;
  if (doKho !== null && (!Number.isInteger(doKho) || doKho < 1 || doKho > 5)) {
    return { error: "Độ khó phải từ 1 đến 5." };
  }

  const loiGiai = String(formData.get("loi_giai") ?? "").trim() || null;

  // Phân loại câu hỏi (cấp học/môn/học phần/bài học/chủ đề/dạng câu) KHÔNG
  // cho sửa — mã câu hỏi gắn cố định theo phân loại lúc tạo, giống quy ước
  // ma_hoc_sinh/ma_lop bất biến. Lấy dang_cau thật từ DB (không tin form) để
  // biết đúng cấu trúc đáp án cần đọc.
  const { data: cauHoiHienTai, error: layError } = await supabase
    .from("cau_hoi")
    .select("dang_cau")
    .eq("id", id)
    .single();
  if (layError || !cauHoiHienTai) return { error: "Không tìm thấy câu hỏi." };

  const loaiDangCau = layLoaiDangCau(cauHoiHienTai.dang_cau);
  const dapAn = docDapAn(formData, loaiDangCau);
  if ("error" in dapAn) return dapAn;
  const { dapAnText, luaChonList } = dapAn;

  const { error: updateError } = await supabase
    .from("cau_hoi")
    .update({ noi_dung: noiDung, do_kho: doKho, loi_giai: loiGiai, dap_an_text: dapAnText })
    .eq("id", id);

  if (updateError) return { error: mapDbError(updateError.message) };

  if (loaiDangCau === "single" || loaiDangCau === "multi" || loaiDangCau === "dung_sai") {
    // Thay toàn bộ lựa chọn/mệnh đề cũ bằng danh sách mới — xoá rồi chèn lại
    // (không có cách "diff" gọn qua PostgREST). Rủi ro nhỏ: nếu insert lỗi
    // giữa chừng sau khi đã xoá, câu hỏi tạm thời rỗng lựa chọn — hiếm gặp,
    // người dùng sẽ thấy lỗi và có thể thêm lại ngay.
    const { error: xoaLuaChonError } = await supabase.from("lua_chon").delete().eq("cau_hoi_id", id);
    if (xoaLuaChonError) return { error: mapDbError(xoaLuaChonError.message) };

    const { error: themLuaChonError } = await supabase.from("lua_chon").insert(
      luaChonList.map((lc, idx) => ({
        cau_hoi_id: id,
        thu_tu: idx + 1,
        noi_dung: lc.noi_dung,
        la_dap_an: lc.la_dap_an,
      }))
    );
    if (themLuaChonError) return { error: mapDbError(themLuaChonError.message) };
  }

  revalidatePath("/dashboard/ngan-hang-cau-hoi");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Bước 5.4 — luồng nộp duyệt/duyệt câu hỏi (nhap → cho_duyet → da_duyet).
// Mỗi hàm tự kiểm tra trang_thai hiện tại trước (thông báo tiếng Việt rõ
// ràng) — lớp chặn thật vẫn là trigger DB (trg_chan_tu_duyet_cau_hoi chặn tự
// duyệt, trg_cau_hoi_chan_gv_tu_duyet chặn gv duyệt — xem migration 0041),
// đề phòng gọi trực tiếp qua API không qua các hàm này.
// ---------------------------------------------------------------------------

async function layTrangThaiHienTai(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<{ trang_thai: string; nguoi_tao: string | null } | { error: string }> {
  const { data, error } = await supabase.from("cau_hoi").select("trang_thai, nguoi_tao").eq("id", id).single();
  if (error || !data) return { error: "Không tìm thấy câu hỏi." };
  return data;
}

export async function nopDuyetCauHoi(id: string): Promise<XoaCauHoiResult> {
  const supabase = await createClient();
  if (!id) return { error: "Thiếu ID câu hỏi." };

  const hienTai = await layTrangThaiHienTai(supabase, id);
  if ("error" in hienTai) return hienTai;
  if (hienTai.trang_thai !== "nhap") {
    return {
      error: `Chỉ câu hỏi đang ở trạng thái Nháp mới nộp duyệt được (hiện tại: ${TRANG_THAI_LABEL[hienTai.trang_thai] ?? hienTai.trang_thai}).`,
    };
  }

  const { error } = await supabase.from("cau_hoi").update({ trang_thai: "cho_duyet" }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/ngan-hang-cau-hoi");
  return { ok: true };
}

export async function duyetCauHoi(id: string): Promise<XoaCauHoiResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  if (!id) return { error: "Thiếu ID câu hỏi." };

  const hienTai = await layTrangThaiHienTai(supabase, id);
  if ("error" in hienTai) return hienTai;
  if (hienTai.trang_thai !== "cho_duyet") {
    return {
      error: `Chỉ câu hỏi đang Chờ duyệt mới duyệt được (hiện tại: ${TRANG_THAI_LABEL[hienTai.trang_thai] ?? hienTai.trang_thai}).`,
    };
  }
  if (hienTai.nguoi_tao === user.id) {
    return { error: "Không được tự duyệt câu hỏi do chính mình tạo." };
  }

  const { error } = await supabase
    .from("cau_hoi")
    .update({ trang_thai: "da_duyet", nguoi_duyet: user.id, ngay_duyet: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/ngan-hang-cau-hoi");
  return { ok: true };
}

// Trả câu hỏi về Nháp để người tạo sửa lại — không lưu lý do (chưa có cột phù
// hợp; cau_hoi.tien_trinh là khoá ngoại sang bảng tien_trinh của khung năng
// lực, không phải ghi chú duyệt — không dùng nhầm). Ghi nợ kỹ thuật: nếu cần
// lý do từ chối chi tiết, cần thêm cột/bảng riêng ở bước sau.
export async function tuChoiDuyetCauHoi(id: string): Promise<XoaCauHoiResult> {
  const supabase = await createClient();
  if (!id) return { error: "Thiếu ID câu hỏi." };

  const hienTai = await layTrangThaiHienTai(supabase, id);
  if ("error" in hienTai) return hienTai;
  if (hienTai.trang_thai !== "cho_duyet") {
    return {
      error: `Chỉ câu hỏi đang Chờ duyệt mới từ chối được (hiện tại: ${TRANG_THAI_LABEL[hienTai.trang_thai] ?? hienTai.trang_thai}).`,
    };
  }

  const { error } = await supabase.from("cau_hoi").update({ trang_thai: "nhap" }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/ngan-hang-cau-hoi");
  return { ok: true };
}

export async function xoaCauHoi(id: string): Promise<XoaCauHoiResult> {
  const supabase = await createClient();

  if (!id) return { error: "Thiếu ID câu hỏi." };

  const { error } = await supabase.from("cau_hoi").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/ngan-hang-cau-hoi");
  return { ok: true };
}
