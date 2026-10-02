"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { docFileNhap } from "@/lib/cau-hoi-doc-file";
import {
  kiemTraCauTruc,
  kiemTraDong,
  khoaTrungNoiDung,
  khoaViTri,
  SO_CAU_MOI_LO,
  type CauHoiNhap,
  type DongXemTruoc,
} from "@/lib/cau-hoi-import";
import { docZipAnh, mimeTheoByte } from "@/lib/cau-hoi-doc-zip";
import { luuCauHoi } from "./luu-cau-hoi";
import { dacTaTuTenAnh, donDepCauHoi, luuHinhAnh } from "./hinh-anh";
import { kiemTraQuyenNhap, layDanhMucNhap } from "./nhap-ho-tro";

export type XemTruocResult = { error: string } | { tenFile: string; dong: DongXemTruoc[]; canhBaoZip: string[]; coZip: boolean };
export type KetQuaNhapDong = { chiSo: number; ma_cau_hoi?: string; error?: string };
export type NhapHangLoatResult = { error: string } | { ketQua: KetQuaNhapDong[] };

const TRANG_DOC = 1000;
const SO_TRANG_DOC_TOI_DA = 5; // kiểm tra trùng tối đa 5.000 câu/tổ hợp (cấp, môn)

/**
 * Đánh dấu dòng có khả năng trùng: (a) trùng dòng trước đó trong cùng file,
 * (b) trùng câu đã có trong ngân hàng (cùng vị trí + cùng nội dung, bỏ qua
 * hoa/thường & khoảng trắng). Chỉ là CẢNH BÁO — người dùng quyết định nhập hay không.
 */
async function danhDauTrung(supabase: Awaited<ReturnType<typeof createClient>>, dong: DongXemTruoc[]): Promise<void> {
  const hopLe = dong.filter((d) => d.cauHoi);

  const daThay = new Map<string, number>();
  for (const d of hopLe) {
    const khoa = `${khoaViTri(d.cauHoi!)}|${khoaTrungNoiDung(d.cauHoi!.noi_dung)}`;
    const dau = daThay.get(khoa);
    if (dau !== undefined) {
      d.trung = true;
      d.canhBao.push(`Trùng nội dung với dòng ${dau} trong cùng file.`);
    } else daThay.set(khoa, d.soDong);
  }

  const nhom = new Map<string, { cap: number; mon: number }>();
  for (const d of hopLe) {
    const c = d.cauHoi!;
    nhom.set(`${c.cap_hoc}-${c.mon_hoc}`, { cap: c.cap_hoc, mon: c.mon_hoc });
  }

  const daCo = new Set<string>();
  await Promise.all(
    [...nhom.values()].map(async ({ cap, mon }) => {
      for (let t = 0; t < SO_TRANG_DOC_TOI_DA; t++) {
        const { data } = await supabase
          .from("cau_hoi")
          .select("cap_hoc, chuong_trinh, mon_hoc, hoc_phan, bai_hoc, chu_de, dang_cau, noi_dung")
          .eq("cap_hoc", cap)
          .eq("mon_hoc", mon)
          .is("deleted_at", null)
          .order("id")
          .range(t * TRANG_DOC, (t + 1) * TRANG_DOC - 1);
        for (const r of data ?? []) {
          daCo.add(`${khoaViTri(r as CauHoiNhap)}|${khoaTrungNoiDung(r.noi_dung)}`);
        }
        if (!data || data.length < TRANG_DOC) break;
      }
    })
  );

  for (const d of hopLe) {
    const khoa = `${khoaViTri(d.cauHoi!)}|${khoaTrungNoiDung(d.cauHoi!.noi_dung)}`;
    if (daCo.has(khoa)) {
      d.trung = true;
      d.canhBao.push("Có thể trùng câu hỏi đã có trong ngân hàng (cùng vị trí và cùng nội dung).");
    }
  }
}

/** Đọc file đã upload, kiểm tra từng dòng và trả danh sách xem trước — CHƯA ghi gì vào DB. */
export async function xemTruocNhapCauHoi(formData: FormData): Promise<XemTruocResult> {
  const supabase = await createClient();
  const quyen = await kiemTraQuyenNhap(supabase);
  if ("error" in quyen) return quyen;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn file .xlsx hoặc .csv." };

  const doc = await docFileNhap(await file.arrayBuffer(), file.name);
  if ("error" in doc) return doc;

  let danhMuc;
  try {
    danhMuc = await layDanhMucNhap(supabase);
  } catch (e) {
    return { error: `Không tải được danh mục để đối chiếu: ${e instanceof Error ? e.message : "lỗi không rõ"}` };
  }

  // File zip ảnh (tuỳ chọn) — ghép với cột Ảnh đề/Ảnh lời giải/Ảnh lựa chọn theo tên file.
  let anhZip: Map<string, number> | null = null;
  let canhBaoZip: string[] = [];
  const zip = formData.get("zip_anh");
  if (zip instanceof File && zip.size > 0) {
    const docZip = await docZipAnh(await zip.arrayBuffer());
    if ("error" in docZip) return docZip;
    anhZip = docZip.anh;
    canhBaoZip = docZip.canhBao;
  }

  const dong = doc.dong.map((d) => kiemTraDong(d, danhMuc, anhZip));
  await danhDauTrung(supabase, dong);
  return { tenFile: file.name, dong, canhBaoZip, coZip: anhZip !== null };
}

/**
 * Nhập 1 lô câu hỏi đã được người dùng xác nhận ở bước xem trước. Server KHÔNG
 * tin dữ liệu client: kiểm lại cấu trúc từng câu, còn vị trí giáo án do RPC
 * cap_ma_cau_hoi() kiểm ở DB. Mỗi câu độc lập — lỗi 1 câu không chặn câu khác.
 * Câu mới luôn ở trạng thái Nháp (mặc định của cột trang_thai).
 */
export async function nhapCauHoiHangLoat(formData: FormData): Promise<NhapHangLoatResult> {
  const supabase = await createClient();
  const quyen = await kiemTraQuyenNhap(supabase);
  if ("error" in quyen) return quyen;

  // `danh_sach` = JSON mảng CauHoiNhap; ảnh đi kèm theo key `anh:<tên chữ thường>` (mỗi tên 1 lần/lô).
  let danhSach: CauHoiNhap[];
  try {
    danhSach = JSON.parse(String(formData.get("danh_sach") ?? "[]"));
  } catch {
    return { error: "Dữ liệu gửi lên không hợp lệ." };
  }
  const layTep = (khoa: string) => {
    const v = formData.get(`anh:${khoa}`);
    return v instanceof File && v.size > 0 ? v : null;
  };

  if (!Array.isArray(danhSach) || danhSach.length === 0) return { error: "Không có câu hỏi nào để nhập." };
  if (danhSach.length > SO_CAU_MOI_LO) return { error: `Mỗi lần chỉ nhập tối đa ${SO_CAU_MOI_LO} câu.` };

  const ketQua: KetQuaNhapDong[] = [];
  for (let i = 0; i < danhSach.length; i++) {
    const c = danhSach[i];
    const loiCauTruc = kiemTraCauTruc(c);
    if (loiCauTruc) {
      ketQua.push({ chiSo: i, error: loiCauTruc });
      continue;
    }
    // Chỉ lấy đúng các trường đã kiểm — bỏ mọi trường lạ client có thể gửi kèm.
    const sach: CauHoiNhap = {
      cap_hoc: c.cap_hoc,
      chuong_trinh: 0, // ADR-006: câu hỏi không gắn chương trình
      mon_hoc: c.mon_hoc,
      hoc_phan: c.hoc_phan,
      bai_hoc: c.bai_hoc,
      chu_de: c.chu_de,
      dang_cau: c.dang_cau,
      noi_dung: c.noi_dung.trim(),
      do_kho: c.do_kho,
      loi_giai: c.loi_giai?.trim() || null,
      dap_an_text: c.dap_an_text?.trim() || null,
      lua_chon: c.lua_chon.map((l) => ({ noi_dung: l.noi_dung.trim(), la_dap_an: l.la_dap_an })),
    };
    // Chuẩn bị + kiểm tra ảnh TRƯỚC khi tạo câu hỏi để không để lại câu hỏi thiếu ảnh.
    const dacTa = await dacTaTuTenAnh(c.hinh, layTep, mimeTheoByte);
    if ("error" in dacTa) {
      ketQua.push({ chiSo: i, error: dacTa.error });
      continue;
    }
    const kq = await luuCauHoi(supabase, quyen.userId, sach);
    if ("error" in kq) {
      ketQua.push({ chiSo: i, error: kq.error });
      continue;
    }
    if (dacTa.moi.length > 0) {
      const luuAnh = await luuHinhAnh(supabase, quyen.userId, kq.data.id, dacTa);
      if ("error" in luuAnh) {
        await donDepCauHoi(supabase, kq.data.id);
        ketQua.push({ chiSo: i, error: luuAnh.error });
        continue;
      }
    }
    ketQua.push({ chiSo: i, ma_cau_hoi: kq.data.ma_cau_hoi });
  }

  revalidatePath("/dashboard/ngan-hang-cau-hoi");
  return { ketQua };
}
