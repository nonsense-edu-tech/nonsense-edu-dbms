"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CauHoi = {
  id: string;
  ma_cau_hoi: string;
};

export type TaoCauHoiResult = { error: string } | { data: CauHoi };
export type XoaCauHoiResult = { error: string } | { ok: true };

function docSoNguyen(formData: FormData, key: string, ten: string, min: number, max: number): number | { error: string } {
  const raw = formData.get(key);
  if (raw === null || raw === "") return { error: `Vui lòng chọn ${ten}.` };
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return { error: `${ten} không hợp lệ.` };
  }
  return value;
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

  const noiDung = String(formData.get("noi_dung") ?? "").trim();
  if (!noiDung) return { error: "Nội dung câu hỏi không được để trống." };

  const doKhoRaw = String(formData.get("do_kho") ?? "").trim();
  const doKho = doKhoRaw ? Number(doKhoRaw) : null;
  if (doKho !== null && (!Number.isInteger(doKho) || doKho < 1 || doKho > 5)) {
    return { error: "Độ khó phải từ 1 đến 5." };
  }

  const loiGiai = String(formData.get("loi_giai") ?? "").trim() || null;
  const dapAnText = String(formData.get("dap_an_text") ?? "").trim() || null;

  const luaChonNoiDung = formData.getAll("lua_chon_noi_dung").map((v) => String(v).trim());
  const luaChonDungIdx = new Set(formData.getAll("lua_chon_dung").map((v) => String(v)));
  const luaChonList = luaChonNoiDung
    .map((noi_dung, idx) => ({ noi_dung, la_dap_an: luaChonDungIdx.has(String(idx)) }))
    .filter((lc) => lc.noi_dung !== "");

  // Cấp mã câu hỏi qua RPC — hàm này cũng xác nhận học phần/bài học/chủ đề/dạng câu
  // thật sự thuộc đúng môn học/cấp học đã chọn (chặn dữ liệu rác ngay ở tầng DB).
  const { data: maCauHoi, error: rpcError } = await supabase.rpc("cap_ma_cau_hoi", {
    p_cap_hoc: capHoc,
    p_chuong_trinh: chuongTrinh,
    p_mon_hoc: monHoc,
    p_hoc_phan: hocPhan,
    p_bai_hoc: baiHoc,
    p_chu_de: chuDe,
    p_dang_cau: dangCau,
  });

  if (rpcError || !maCauHoi) return { error: mapDbError(rpcError?.message ?? "Không cấp được mã câu hỏi.") };

  const sttCau = Number(String(maCauHoi).slice(-4));

  const { data: cauHoi, error: insertError } = await supabase
    .from("cau_hoi")
    .insert({
      ma_cau_hoi: maCauHoi,
      cap_hoc: capHoc,
      chuong_trinh: chuongTrinh,
      mon_hoc: monHoc,
      hoc_phan: hocPhan,
      bai_hoc: baiHoc,
      chu_de: chuDe,
      dang_cau: dangCau,
      stt_cau: sttCau,
      noi_dung: noiDung,
      do_kho: doKho,
      loi_giai: loiGiai,
      dap_an_text: dapAnText,
      nguoi_tao: user.id,
    })
    .select("id, ma_cau_hoi")
    .single();

  if (insertError) return { error: mapDbError(insertError.message) };

  if (luaChonList.length > 0) {
    const { error: luaChonError } = await supabase.from("lua_chon").insert(
      luaChonList.map((lc, idx) => ({
        cau_hoi_id: cauHoi.id,
        thu_tu: idx + 1,
        noi_dung: lc.noi_dung,
        la_dap_an: lc.la_dap_an,
      }))
    );

    if (luaChonError) {
      // Dọn lại câu hỏi vừa tạo — tránh để lại câu hỏi rỗng lựa chọn do lỗi giữa chừng.
      await supabase.from("cau_hoi").delete().eq("id", cauHoi.id);
      return { error: mapDbError(luaChonError.message) };
    }
  }

  revalidatePath("/dashboard/hoc-lieu/cau-hoi");
  return { data: cauHoi as CauHoi };
}

export async function xoaCauHoi(id: string): Promise<XoaCauHoiResult> {
  const supabase = await createClient();

  if (!id) return { error: "Thiếu ID câu hỏi." };

  const { error } = await supabase.from("cau_hoi").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/cau-hoi");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền tạo/sửa câu hỏi (chỉ Master Admin, Admin học thuật, Trưởng bộ môn, hoặc Giáo viên trong phạm vi môn được phân công).";
  if (msg.includes("cau_hoi_ma_cau_hoi_key")) return "Mã câu hỏi này đã tồn tại (trùng lặp hiếm gặp) — thử lưu lại.";
  if (msg.includes("cau_hoi_do_kho_check")) return "Độ khó phải từ 1 đến 5.";
  if (msg.includes("cau_hoi_ma_cau_hoi_check")) return "Mã câu hỏi sinh ra không hợp lệ (phải đủ 17 chữ số).";
  if (msg.includes("uq_lua_chon_thu_tu")) return "Danh sách lựa chọn bị trùng thứ tự.";
  if (msg.includes("update or delete")) return "Không thể xoá — câu hỏi này còn dữ liệu liên quan (đã nằm trong đề).";
  // Các lỗi do RPC cap_ma_cau_hoi() raise exception đã là tiếng Việt sẵn (vd "Học phần % không thuộc môn %").
  return msg;
}
