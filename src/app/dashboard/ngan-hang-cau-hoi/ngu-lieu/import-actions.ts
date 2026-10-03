"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { kiemTraCauTruc, type CauHoiNhap } from "@/lib/cau-hoi-import";
import { laLoaiNguLieu, SO_CAU_CON_TOI_DA } from "@/lib/ngu-lieu";
import { docFileNguLieu } from "@/lib/ngu-lieu-doc-file";
import { dungNhom, type NguLieuNhap, type NhomXemTruoc } from "@/lib/ngu-lieu-import";
import { vanBanThanhHtml } from "@/lib/van-ban-dinh-dang";
import { luuCauHoi, mapDbError } from "../luu-cau-hoi";
import { kiemTraQuyenNhap, layDanhMucNhap } from "../nhap-ho-tro";

// Nhập NGỮ LIỆU + CÂU CON từ file — TÁCH RIÊNG với import-actions.ts (nhập câu hỏi lẻ).

export type XemTruocNguLieuResult =
  | { error: string }
  | { tenFile: string; nhom: NhomXemTruoc[]; dongMoCoi: { soDong: number; loi: string }[] };
export type NhapNguLieuResult = { error: string } | { data: { id: string; so_hieu: string; soCau: number; maCau: string[] } };

/** Đọc file, kiểm tra toàn bộ nhóm và trả bản xem trước — CHƯA ghi gì vào DB. */
export async function xemTruocNhapNguLieu(formData: FormData): Promise<XemTruocNguLieuResult> {
  const supabase = await createClient();
  const quyen = await kiemTraQuyenNhap(supabase);
  if ("error" in quyen) return quyen;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn file .xlsx." };
  const doc = await docFileNguLieu(await file.arrayBuffer(), file.name);
  if ("error" in doc) return doc;

  let danhMuc;
  try {
    danhMuc = await layDanhMucNhap(supabase);
  } catch (e) {
    return { error: `Không tải được danh mục để đối chiếu: ${e instanceof Error ? e.message : "lỗi không rõ"}` };
  }

  const { nhom, dongMoCoi } = dungNhom(doc.nguLieu, doc.cau, danhMuc);

  // Cảnh báo (không chặn): trùng tiêu đề + môn với ngữ liệu đã có hoặc với nhóm khác trong file.
  const tieuDe = [...new Set(nhom.map((n) => n.tieuDe).filter(Boolean))];
  const daCo = new Set<string>();
  if (tieuDe.length > 0) {
    const { data } = await supabase.from("ngu_lieu").select("tieu_de, cap_hoc_ma, mon_hoc_ma").in("tieu_de", tieuDe).is("deleted_at", null);
    for (const r of data ?? []) daCo.add(`${r.cap_hoc_ma}-${r.mon_hoc_ma}|${String(r.tieu_de).toLowerCase()}`);
  }
  const trongFile = new Map<string, string>();
  for (const n of nhom) {
    if (!n.nguLieu || !n.tieuDe) continue;
    const khoa = `${n.nguLieu.cap_hoc}-${n.nguLieu.mon_hoc}|${n.tieuDe.toLowerCase()}`;
    if (daCo.has(khoa)) n.canhBao.push("Đã có ngữ liệu cùng môn và cùng tiêu đề trong hệ thống — kiểm tra kẻo nhập trùng.");
    const truoc = trongFile.get(khoa);
    if (truoc) n.canhBao.push(`Trùng tiêu đề + môn với nhóm "${truoc}" trong cùng file.`);
    else trongFile.set(khoa, n.nhom);
  }

  return { tenFile: file.name, nhom, dongMoCoi };
}

function kiemTraNguLieuCauTruc(n: NguLieuNhap): string | null {
  const so = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
  if (!laLoaiNguLieu(n?.loai)) return "Loại ngữ liệu không hợp lệ.";
  if (typeof n.noi_dung !== "string" || n.noi_dung.trim() === "") return "Nội dung ngữ liệu không được để trống.";
  if (n.tieu_de !== null && (typeof n.tieu_de !== "string" || n.tieu_de.length > 200)) return "Tiêu đề không hợp lệ.";
  if (!so(n.cap_hoc, 1, 9) || !so(n.mon_hoc, 1, 99) || !so(n.hoc_phan, 0, 99) || !so(n.bai_hoc, 0, 99) || !so(n.chu_de, 0, 99)) {
    return "Vị trí ngữ liệu không hợp lệ.";
  }
  if (n.bai_hoc !== 0 && n.hoc_phan === 0) return "Có bài học thì phải có học phần.";
  return null;
}

/**
 * Nhập MỘT ngữ liệu cùng toàn bộ câu con (client gọi lần lượt từng nhóm). Server không tin dữ liệu client:
 * kiểm lại cấu trúc, tự tra id vị trí từ mã. Có lỗi ở bất kỳ câu con nào → dọn sạch phần đã tạo của nhóm này
 * (không để lại ngữ liệu dở dang), các nhóm khác không bị ảnh hưởng.
 */
export async function nhapMotNguLieu(formData: FormData): Promise<NhapNguLieuResult> {
  const supabase = await createClient();
  const quyen = await kiemTraQuyenNhap(supabase);
  if ("error" in quyen) return quyen;

  let goi: { nguLieu: NguLieuNhap; cau: CauHoiNhap[] };
  try {
    goi = JSON.parse(String(formData.get("du_lieu") ?? "null"));
  } catch {
    return { error: "Dữ liệu gửi lên không hợp lệ." };
  }
  const n = goi?.nguLieu;
  const cau = goi?.cau;
  const loiNL = n ? kiemTraNguLieuCauTruc(n) : "Thiếu dữ liệu ngữ liệu.";
  if (loiNL) return { error: loiNL };
  if (!Array.isArray(cau) || cau.length < 1) return { error: "Ngữ liệu chưa có câu hỏi con." };
  if (cau.length > SO_CAU_CON_TOI_DA) return { error: `Tối đa ${SO_CAU_CON_TOI_DA} câu hỏi con mỗi ngữ liệu.` };

  const cauSach: CauHoiNhap[] = [];
  for (let i = 0; i < cau.length; i++) {
    const c = cau[i];
    const loi = kiemTraCauTruc(c);
    if (loi) return { error: `Câu con thứ ${i + 1}: ${loi}` };
    if (c.cap_hoc !== n.cap_hoc || c.mon_hoc !== n.mon_hoc || c.hoc_phan !== n.hoc_phan || c.bai_hoc !== n.bai_hoc || c.chu_de !== n.chu_de) {
      return { error: `Câu con thứ ${i + 1} không cùng vị trí với ngữ liệu.` };
    }
    cauSach.push({
      cap_hoc: n.cap_hoc,
      chuong_trinh: 0, // ADR-006
      mon_hoc: n.mon_hoc,
      hoc_phan: n.hoc_phan,
      bai_hoc: n.bai_hoc,
      chu_de: n.chu_de,
      dang_cau: c.dang_cau,
      noi_dung: vanBanThanhHtml(c.noi_dung),
      do_kho: c.do_kho,
      loi_giai: vanBanThanhHtml(c.loi_giai) || null,
      dap_an_text: vanBanThanhHtml(c.dap_an_text) || null,
      lua_chon: c.lua_chon.map((l) => ({ noi_dung: vanBanThanhHtml(l.noi_dung), la_dap_an: l.la_dap_an })),
    });
  }

  // Tra id vị trí từ mã (đúng cha, còn hiệu lực).
  const { data: mon } = await supabase.from("mon_hoc").select("id").eq("cap_hoc_ma", n.cap_hoc).eq("ma", n.mon_hoc).is("deleted_at", null).maybeSingle();
  if (!mon) return { error: "Môn học không tồn tại." };
  let hocPhanId: string | null = null;
  let baiHocId: string | null = null;
  let chuDeId: string | null = null;
  if (n.hoc_phan !== 0) {
    const { data } = await supabase.from("hoc_phan").select("id").eq("mon_hoc_id", mon.id).eq("ma", n.hoc_phan).is("deleted_at", null).maybeSingle();
    if (!data) return { error: "Học phần không thuộc môn học đã chọn." };
    hocPhanId = data.id;
  }
  if (n.bai_hoc !== 0 && hocPhanId) {
    const { data } = await supabase.from("bai_hoc").select("id").eq("hoc_phan_id", hocPhanId).eq("ma", n.bai_hoc).is("deleted_at", null).maybeSingle();
    if (!data) return { error: "Bài học không thuộc học phần đã chọn." };
    baiHocId = data.id;
  }
  if (n.chu_de !== 0) {
    const { data } = await supabase.from("chu_de").select("id").eq("mon_hoc_id", mon.id).eq("ma", n.chu_de).is("deleted_at", null).maybeSingle();
    if (!data) return { error: "Chủ đề không thuộc môn học đã chọn." };
    chuDeId = data.id;
  }

  const { data: nl, error: nlError } = await supabase
    .from("ngu_lieu")
    .insert({
      loai: n.loai,
      tieu_de: n.tieu_de,
      noi_dung: vanBanThanhHtml(n.noi_dung),
      mon_hoc_id: mon.id,
      cap_hoc_ma: n.cap_hoc,
      mon_hoc_ma: n.mon_hoc,
      hoc_phan_id: hocPhanId,
      bai_hoc_id: baiHocId,
      chu_de_id: chuDeId,
      nguoi_tao: quyen.userId,
    })
    .select("id, so_hieu")
    .single();
  if (nlError) return { error: mapDbError(nlError.message) };

  const daTao: { id: string; ma: string }[] = [];
  for (let i = 0; i < cauSach.length; i++) {
    const kq = await luuCauHoi(supabase, quyen.userId, cauSach[i], nl.id);
    if ("error" in kq) {
      // Dọn lại phần đã tạo của nhóm này (câu con + ngữ liệu) — chưa có đề nào tham chiếu nên xóa cứng an toàn.
      if (daTao.length > 0) await supabase.from("cau_hoi").delete().in("id", daTao.map((c) => c.id));
      await supabase.from("ngu_lieu").delete().eq("id", nl.id);
      return { error: `Câu con thứ ${i + 1}: ${kq.error}` };
    }
    daTao.push({ id: kq.data.id, ma: kq.data.ma_cau_hoi });
  }

  revalidatePath("/dashboard/ngan-hang-cau-hoi/ngu-lieu");
  revalidatePath("/dashboard/ngan-hang-cau-hoi");
  return { data: { id: nl.id, so_hieu: nl.so_hieu, soCau: daTao.length, maCau: daTao.map((c) => c.ma) } };
}
