// Nhập câu hỏi từ file (CSV / Excel) — phần THUẦN: định nghĩa cột template,
// chuẩn hoá tiêu đề, và kiểm tra/chuyển 1 dòng thô thành câu hỏi chuẩn hoá.
// Không import next/* hay thư viện đọc file nên dùng được ở server lẫn client
// và chạy test được độc lập.
//
// Quy ước template: MỖI DÒNG = 1 CÂU HỎI. Vị trí giáo án nhập bằng MÃ SỐ (xem
// các sheet "Mã ..." trong file mẫu). Đáp án nhập ở cột "Đáp án":
//   - Trắc nghiệm 1/nhiều đáp án, Đúng/Sai: chữ cái lựa chọn đúng (vd "B" hoặc "A,C")
//   - Điền khuyết: đáp án từng chỗ trống, ngăn cách bằng dấu |  (vd "5 | 7")
//   - Trả lời ngắn / Tự luận: văn bản đáp án (tuỳ chọn)

import { DANG_CAU_CHUA_HO_TRO, layLoaiDangCau, type LoaiDangCau } from "@/components/dangCauOptions";

export const SO_LUA_CHON_TOI_DA = 8; // A..H
export const SO_DONG_TOI_DA = 500;
/** Số câu tối đa mỗi lần gọi nhập — client chia file lớn thành nhiều lô để không quá thời gian chạy của server. */
export const SO_CAU_MOI_LO = 20;
export const TIEN_TO_DONG_VI_DU = "[Ví dụ]";

export const CHU_LUA_CHON = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export type KhoaCot =
  | "cap_hoc"
  | "chuong_trinh"
  | "mon_hoc"
  | "hoc_phan"
  | "bai_hoc"
  | "chu_de"
  | "dang_cau"
  | "noi_dung"
  | "lua_chon_a"
  | "lua_chon_b"
  | "lua_chon_c"
  | "lua_chon_d"
  | "lua_chon_e"
  | "lua_chon_f"
  | "lua_chon_g"
  | "lua_chon_h"
  | "dap_an"
  | "do_kho"
  | "loi_giai"
  | "anh_de"
  | "anh_loi_giai"
  | "anh_lua_chon";

export const COT_TEMPLATE: { khoa: KhoaCot; nhan: string; batBuoc: boolean; rong: number }[] = [
  { khoa: "cap_hoc", nhan: "Cấp học (mã)", batBuoc: true, rong: 12 },
  { khoa: "chuong_trinh", nhan: "Chương trình (mã)", batBuoc: true, rong: 16 },
  { khoa: "mon_hoc", nhan: "Môn học (mã)", batBuoc: true, rong: 12 },
  { khoa: "hoc_phan", nhan: "Học phần (mã)", batBuoc: true, rong: 13 },
  { khoa: "bai_hoc", nhan: "Bài học (mã)", batBuoc: true, rong: 12 },
  { khoa: "chu_de", nhan: "Chủ đề (mã)", batBuoc: true, rong: 12 },
  { khoa: "dang_cau", nhan: "Dạng câu (mã)", batBuoc: true, rong: 13 },
  { khoa: "noi_dung", nhan: "Nội dung", batBuoc: true, rong: 60 },
  ...CHU_LUA_CHON.map((c) => ({
    khoa: `lua_chon_${c.toLowerCase()}` as KhoaCot,
    nhan: `Lựa chọn ${c}`,
    batBuoc: false,
    rong: 28,
  })),
  { khoa: "dap_an", nhan: "Đáp án", batBuoc: false, rong: 24 },
  { khoa: "do_kho", nhan: "Độ khó (1-5)", batBuoc: false, rong: 12 },
  { khoa: "loi_giai", nhan: "Lời giải", batBuoc: false, rong: 40 },
  { khoa: "anh_de", nhan: "Ảnh đề", batBuoc: false, rong: 24 },
  { khoa: "anh_loi_giai", nhan: "Ảnh lời giải", batBuoc: false, rong: 24 },
  { khoa: "anh_lua_chon", nhan: "Ảnh lựa chọn", batBuoc: false, rong: 28 },
];

// ---- Ảnh đính kèm (đi kèm file zip chứa ảnh, ghép theo TÊN FILE) ----
export const HINH_TOI_DA_MOI_DE = 5;
export const HINH_TOI_DA_MOI_LOI_GIAI = 5;
export const HINH_TOI_DA_BYTE_MOI_ANH = 2 * 1024 * 1024;
/** Tổng dung lượng ảnh của 1 câu — để 1 câu luôn lọt trong giới hạn body của server action. */
export const HINH_TOI_DA_BYTE_MOI_CAU = 15 * 1024 * 1024;
export const DUOI_ANH_CHO_PHEP = ["jpg", "jpeg", "png", "webp"];

/** Tên file ảnh mỗi câu tham chiếu (lưu theo tên GỐC trong ô; so khớp zip không phân biệt hoa/thường). */
export type HinhNhap = {
  de: string[];
  loi_giai: string[];
  /** thu_tu = vị trí lựa chọn trong danh sách lựa chọn đã lưu (bắt đầu từ 1). */
  lua_chon: { thu_tu: number; ten: string }[];
};

export const khoaTenAnh = (ten: string) => ten.trim().toLowerCase();

function tenAnhHopLe(ten: string): boolean {
  if (ten === "" || ten.length > 150 || /[\\/:*?"<>\u0000]/.test(ten)) return false;
  const duoi = ten.split(".").pop()?.toLowerCase() ?? "";
  return ten.includes(".") && DUOI_ANH_CHO_PHEP.includes(duoi);
}

export const COT_BAT_BUOC: KhoaCot[] = COT_TEMPLATE.filter((c) => c.batBuoc).map((c) => c.khoa);

/** "Cấp học (mã)" → "cap_hoc"; "Lựa chọn A" → "lua_chon_a"; "Độ khó (1-5)" → "do_kho". */
export function chuanHoaTieuDe(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const BI_DANH_TIEU_DE: Record<string, KhoaCot> = {
  noi_dung_cau_hoi: "noi_dung",
  cau_hoi: "noi_dung",
  dap_an_dung: "dap_an",
};

/** Ánh xạ tiêu đề cột trong file → khoá cột chuẩn; tiêu đề lạ bị bỏ qua. */
export function anhXaTieuDe(tieuDe: string[]): { chiSo: Partial<Record<KhoaCot, number>>; thieu: string[] } {
  const hopLe = new Set<string>(COT_TEMPLATE.map((c) => c.khoa));
  const chiSo: Partial<Record<KhoaCot, number>> = {};
  tieuDe.forEach((raw, i) => {
    const k = chuanHoaTieuDe(raw);
    const khoa = (hopLe.has(k) ? k : BI_DANH_TIEU_DE[k]) as KhoaCot | undefined;
    if (khoa && chiSo[khoa] === undefined) chiSo[khoa] = i;
  });
  const thieu = COT_TEMPLATE.filter((c) => c.batBuoc && chiSo[c.khoa] === undefined).map((c) => c.nhan);
  return { chiSo, thieu };
}

/** Dòng thô đọc từ file: số dòng trong file (để báo lỗi) + giá trị ô theo khoá cột. */
export type DongTho = { soDong: number; o: Partial<Record<KhoaCot, string>> };

export type DanhMucNhap = {
  capHoc: { ma: number; ten: string }[];
  chuongTrinh: { ma: string; ten: string }[];
  chuongTrinhMonHoc: { chuong_trinh_ma: string; cap_hoc_ma: number; mon_hoc_ma: number }[];
  monHoc: { id: string; ma: number; cap_hoc_ma: number; ten: string }[];
  hocPhan: { id: string; mon_hoc_id: string; ma: number; ten: string }[];
  baiHoc: { id: string; hoc_phan_id: string; ma: number; ten: string }[];
  chuDe: { id: string; mon_hoc_id: string; ma: number; ten: string }[];
  dangCau: { ma: number; ten: string }[];
};

/** Câu hỏi đã chuẩn hoá — đúng cấu trúc server cần để lưu (không còn dữ liệu thô). */
export type CauHoiNhap = {
  cap_hoc: number;
  chuong_trinh: number;
  mon_hoc: number;
  hoc_phan: number;
  bai_hoc: number;
  chu_de: number;
  dang_cau: number;
  noi_dung: string;
  do_kho: number | null;
  loi_giai: string | null;
  dap_an_text: string | null;
  lua_chon: { noi_dung: string; la_dap_an: boolean }[];
  /** Ảnh đính kèm (tuỳ chọn) — chỉ có khi file import kèm zip ảnh. */
  hinh?: HinhNhap;
};

export type HienThiViTri = {
  cap_hoc: string;
  chuong_trinh: string;
  mon_hoc: string;
  hoc_phan: string;
  bai_hoc: string;
  chu_de: string;
  dang_cau: string;
};

export type DongXemTruoc = {
  soDong: number;
  /** Có dùng được để nhập không (không có lỗi). */
  hopLe: boolean;
  loi: string[];
  canhBao: string[];
  /** Có khả năng trùng câu đã có trong ngân hàng / trùng dòng khác trong file. */
  trung: boolean;
  cauHoi: CauHoiNhap | null;
  viTri: HienThiViTri;
};

function chuoi(v: string | undefined): string {
  return (v ?? "").replace(/\r\n/g, "\n").trim();
}

/** Ô mã số: chấp nhận "1", "01", "001", "1.0" (Excel); từ chối chữ, số âm, số thập phân khác. */
function docMaSo(raw: string, ten: string, min: number, max: number, loi: string[]): number | null {
  const v = chuoi(raw);
  if (v === "") {
    loi.push(`Thiếu ${ten}.`);
    return null;
  }
  if (!/^\d+(\.0+)?$/.test(v)) {
    loi.push(`${ten} phải là mã số (vd 1), đang là "${v.slice(0, 20)}".`);
    return null;
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    loi.push(`${ten} phải từ ${min} đến ${max}, đang là ${v}.`);
    return null;
  }
  return n;
}

function demChoTrong(noiDung: string): number {
  return (noiDung.match(/_{3,}/g) ?? []).length;
}

/** Quy tắc đáp án theo dạng câu — GIỐNG docDapAn() của form tạo câu hỏi (actions.ts). */
export function kiemTraDapAn(
  loai: LoaiDangCau,
  noiDung: string,
  luaChon: { noi_dung: string; la_dap_an: boolean }[],
  dapAnText: string | null,
  loi: string[],
  canhBao: string[]
): void {
  if (loai === "single" || loai === "multi") {
    if (luaChon.length < 2) loi.push("Trắc nghiệm cần ít nhất 2 lựa chọn.");
    const soDung = luaChon.filter((l) => l.la_dap_an).length;
    if (loai === "single" && soDung !== 1) loi.push("Trắc nghiệm 1 đáp án phải có đúng 1 đáp án đúng (cột Đáp án).");
    if (loai === "multi" && soDung < 1) loi.push("Trắc nghiệm nhiều đáp án cần ít nhất 1 đáp án đúng (cột Đáp án).");
  } else if (loai === "dung_sai") {
    if (luaChon.length < 1) loi.push("Câu Đúng/Sai cần ít nhất 1 mệnh đề.");
    else if (luaChon.every((l) => !l.la_dap_an)) canhBao.push("Không có mệnh đề nào được đánh dấu đúng.");
  } else if (loai === "dien_khuyet") {
    if (!dapAnText) loi.push("Điền khuyết cần ít nhất 1 đáp án cho chỗ trống (cột Đáp án).");
    else {
      const soDapAn = dapAnText.split(" | ").length;
      const soCho = demChoTrong(noiDung);
      if (soCho > 0 && soCho !== soDapAn) {
        canhBao.push(`Nội dung có ${soCho} chỗ trống (___) nhưng có ${soDapAn} đáp án.`);
      }
    }
  }
}

/** Tách danh sách tên file trong 1 ô: ngăn cách bằng | hoặc xuống dòng. */
function tachTenAnh(raw: string | undefined): string[] {
  return chuoi(raw).split(/[|\n]/).map((t) => t.trim()).filter(Boolean);
}

/**
 * Đọc 3 cột ảnh. Cột "Ảnh lựa chọn" có dạng `A:hinh1.png | C:hinh3.png` (chữ cái lựa chọn : tên file).
 * Trả undefined nếu dòng không tham chiếu ảnh nào. Mọi lỗi được đẩy vào `loi`.
 */
function docHinhTuO(
  o: Partial<Record<KhoaCot, string>>,
  luaChonChu: string[],
  anhZip: Map<string, number> | null,
  loi: string[]
): HinhNhap | undefined {
  const de = tachTenAnh(o.anh_de);
  const loiGiai = tachTenAnh(o.anh_loi_giai);
  const luaChonTho = tachTenAnh(o.anh_lua_chon);
  if (de.length + loiGiai.length + luaChonTho.length === 0) return undefined;

  const luaChon: HinhNhap["lua_chon"] = [];
  const daCoChu = new Set<string>();
  for (const t of luaChonTho) {
    const m = /^([A-Ha-h])\s*[:：]\s*(.+)$/.exec(t);
    if (!m) {
      loi.push(`Cột Ảnh lựa chọn phải có dạng "A:ten-file.png" (vd "A:a.png | C:c.png"), đang là "${t.slice(0, 40)}".`);
      continue;
    }
    const chu = m[1].toUpperCase();
    const viTri = luaChonChu.indexOf(chu);
    if (viTri < 0) {
      loi.push(`Ảnh lựa chọn ${chu}: lựa chọn ${chu} bỏ trống hoặc không tồn tại.`);
      continue;
    }
    if (daCoChu.has(chu)) {
      loi.push(`Lựa chọn ${chu} chỉ được 1 ảnh.`);
      continue;
    }
    daCoChu.add(chu);
    luaChon.push({ thu_tu: viTri + 1, ten: m[2].trim() });
  }
  if (de.length > HINH_TOI_DA_MOI_DE) loi.push(`Ảnh đề tối đa ${HINH_TOI_DA_MOI_DE} ảnh.`);
  if (loiGiai.length > HINH_TOI_DA_MOI_LOI_GIAI) loi.push(`Ảnh lời giải tối đa ${HINH_TOI_DA_MOI_LOI_GIAI} ảnh.`);

  const tatCa = [...de, ...loiGiai, ...luaChon.map((l) => l.ten)];
  const daBao = new Set<string>();
  let tong = 0;
  const daTinh = new Set<string>();
  for (const ten of tatCa) {
    if (!tenAnhHopLe(ten)) {
      if (!daBao.has(ten)) loi.push(`Tên file ảnh "${ten.slice(0, 40)}" không hợp lệ (chỉ nhận .jpg, .jpeg, .png, .webp, không có đường dẫn).`);
      daBao.add(ten);
      continue;
    }
    if (anhZip === null) {
      if (!daBao.has("zip")) loi.push("Dòng này có ảnh đính kèm nhưng chưa tải file zip chứa ảnh.");
      daBao.add("zip");
      continue;
    }
    const kichThuoc = anhZip.get(khoaTenAnh(ten));
    if (kichThuoc === undefined) {
      if (!daBao.has(ten)) loi.push(`Không tìm thấy ảnh "${ten}" trong file zip.`);
      daBao.add(ten);
      continue;
    }
    if (!daTinh.has(khoaTenAnh(ten))) {
      daTinh.add(khoaTenAnh(ten));
      tong += kichThuoc;
    }
  }
  if (tong > HINH_TOI_DA_BYTE_MOI_CAU) loi.push("Tổng dung lượng ảnh của câu này vượt 15MB.");

  return { de, loi_giai: loiGiai, lua_chon: luaChon };
}

/** Chuẩn hoá 1 dòng thô → câu hỏi + danh sách lỗi/cảnh báo, đối chiếu với danh mục thật. */
export function kiemTraDong(
  dong: DongTho,
  dm: DanhMucNhap,
  /** tên ảnh (chữ thường) → dung lượng byte, từ file zip; null = người dùng không tải zip. */
  anhZip: Map<string, number> | null = null
): DongXemTruoc {
  const loi: string[] = [];
  const canhBao: string[] = [];
  const o = dong.o;
  const viTri: HienThiViTri = { cap_hoc: "", chuong_trinh: "", mon_hoc: "", hoc_phan: "", bai_hoc: "", chu_de: "", dang_cau: "" };

  const cap = docMaSo(o.cap_hoc ?? "", "Cấp học", 1, 9, loi);
  const ct = docMaSo(o.chuong_trinh ?? "", "Chương trình", 0, 999, loi);
  const mon = docMaSo(o.mon_hoc ?? "", "Môn học", 1, 99, loi);
  const hp = docMaSo(o.hoc_phan ?? "", "Học phần", 1, 99, loi);
  const bh = docMaSo(o.bai_hoc ?? "", "Bài học", 1, 99, loi);
  const cd = docMaSo(o.chu_de ?? "", "Chủ đề", 1, 99, loi);
  const dang = docMaSo(o.dang_cau ?? "", "Dạng câu", 1, 9, loi);

  // --- Vị trí giáo án: đối chiếu từng cấp với danh mục (chỉ khi các mã đều đọc được)
  const capHoc = cap != null ? dm.capHoc.find((c) => c.ma === cap) : undefined;
  if (cap != null) {
    if (capHoc) viTri.cap_hoc = capHoc.ten;
    else loi.push(`Không có cấp học mã ${cap}.`);
  }
  const chuongTrinh = ct != null ? dm.chuongTrinh.find((c) => Number(c.ma) === ct) : undefined;
  if (ct != null) {
    if (chuongTrinh) viTri.chuong_trinh = chuongTrinh.ten;
    else loi.push(`Không có chương trình mã ${String(ct).padStart(3, "0")}.`);
  }
  let monHoc: DanhMucNhap["monHoc"][number] | undefined;
  if (mon != null && cap != null && capHoc) {
    monHoc = dm.monHoc.find((m) => m.cap_hoc_ma === cap && m.ma === mon);
    if (!monHoc) loi.push(`Không có môn học mã ${mon} ở cấp ${capHoc.ten}.`);
    else {
      viTri.mon_hoc = monHoc.ten;
      if (chuongTrinh && !dm.chuongTrinhMonHoc.some((x) => Number(x.chuong_trinh_ma) === ct && x.cap_hoc_ma === cap && x.mon_hoc_ma === mon)) {
        loi.push(`Môn "${monHoc.ten}" chưa được gán vào chương trình "${chuongTrinh.ten}" (tab Chương trình trong Học liệu).`);
      }
    }
  }
  let hocPhan: DanhMucNhap["hocPhan"][number] | undefined;
  if (monHoc && hp != null) {
    hocPhan = dm.hocPhan.find((h) => h.mon_hoc_id === monHoc!.id && h.ma === hp);
    if (!hocPhan) loi.push(`Không có học phần mã ${hp} trong môn "${monHoc.ten}".`);
    else viTri.hoc_phan = hocPhan.ten;
  }
  if (hocPhan && bh != null) {
    const baiHoc = dm.baiHoc.find((b) => b.hoc_phan_id === hocPhan!.id && b.ma === bh);
    if (!baiHoc) loi.push(`Không có bài học mã ${bh} trong học phần "${hocPhan.ten}".`);
    else viTri.bai_hoc = baiHoc.ten;
  }
  if (monHoc && cd != null) {
    const chuDe = dm.chuDe.find((c) => c.mon_hoc_id === monHoc!.id && c.ma === cd);
    if (!chuDe) loi.push(`Không có chủ đề mã ${cd} trong môn "${monHoc.ten}".`);
    else viTri.chu_de = chuDe.ten;
  }

  // --- Dạng câu
  if (dang != null) {
    const dc = dm.dangCau.find((d) => d.ma === dang);
    if (!dc) loi.push(`Không có dạng câu mã ${dang}.`);
    else {
      viTri.dang_cau = dc.ten;
      if (DANG_CAU_CHUA_HO_TRO.includes(dang)) loi.push(`Dạng câu "${dc.ten}" chưa hỗ trợ nhập.`);
    }
  }
  const loai = layLoaiDangCau(dang);
  if (dang != null && loai === "khong_xac_dinh" && !DANG_CAU_CHUA_HO_TRO.includes(dang) && dm.dangCau.some((d) => d.ma === dang)) {
    loi.push("Dạng câu này chưa hỗ trợ nhập.");
  }

  // --- Nội dung / độ khó / lời giải
  const noiDung = chuoi(o.noi_dung);
  if (!noiDung) loi.push("Nội dung câu hỏi không được để trống.");
  else if (noiDung.startsWith(TIEN_TO_DONG_VI_DU)) {
    loi.push(`Đây là dòng ví dụ của file mẫu (bắt đầu bằng "${TIEN_TO_DONG_VI_DU}") — xoá dòng hoặc thay bằng câu hỏi thật.`);
  }

  const doKhoRaw = chuoi(o.do_kho);
  let doKho: number | null = null;
  if (doKhoRaw !== "") {
    if (/^[1-5](\.0+)?$/.test(doKhoRaw)) doKho = Number(doKhoRaw);
    else loi.push(`Độ khó phải từ 1 đến 5, đang là "${doKhoRaw.slice(0, 20)}".`);
  }
  const loiGiai = chuoi(o.loi_giai) || null;

  // --- Đáp án theo dạng câu
  const dapAnRaw = chuoi(o.dap_an);
  let luaChon: CauHoiNhap["lua_chon"] = [];
  let luaChonChu: string[] = []; // chữ cái của từng lựa chọn còn lại (theo thứ tự lưu)
  let dapAnText: string | null = null;

  if (loai === "single" || loai === "multi" || loai === "dung_sai") {
    const noiDungLuaChon = CHU_LUA_CHON.map((c) => ({ chu: c, nd: chuoi(o[`lua_chon_${c.toLowerCase()}` as KhoaCot]) }));
    const coNoiDung = noiDungLuaChon.filter((l) => l.nd !== "");
    const chuDung = new Set<string>();
    for (const t of dapAnRaw.split(/[\s,;|/]+/).filter(Boolean)) {
      const chu = t.toUpperCase();
      if (!/^[A-H]$/.test(chu)) {
        loi.push(`Cột Đáp án phải là chữ cái lựa chọn (vd "B" hoặc "A,C"), đang là "${t.slice(0, 20)}".`);
        break;
      }
      if (!coNoiDung.some((l) => l.chu === chu)) {
        loi.push(`Đáp án "${chu}" trỏ tới lựa chọn bỏ trống.`);
        continue;
      }
      chuDung.add(chu);
    }
    luaChon = coNoiDung.map((l) => ({ noi_dung: l.nd, la_dap_an: chuDung.has(l.chu) }));
    luaChonChu = coNoiDung.map((l) => l.chu);
  } else if (loai === "dien_khuyet") {
    const ds = dapAnRaw.split("|").map((s) => s.trim()).filter((s) => s !== "");
    dapAnText = ds.length > 0 ? ds.join(" | ") : null;
  } else if (loai === "text") {
    dapAnText = dapAnRaw || null;
  }

  if (loai === "dien_khuyet" || loai === "text") {
    if (CHU_LUA_CHON.some((c) => chuoi(o[`lua_chon_${c.toLowerCase()}` as KhoaCot]) !== "")) {
      canhBao.push("Dạng câu này không dùng cột Lựa chọn — các lựa chọn bị bỏ qua.");
    }
  }

  if (loai !== "khong_xac_dinh") kiemTraDapAn(loai, noiDung, luaChon, dapAnText, loi, canhBao);

  const hinh = docHinhTuO(o, luaChonChu, anhZip, loi);

  const hopLe = loi.length === 0;
  const cauHoi: CauHoiNhap | null = hopLe
    ? {
        cap_hoc: cap!,
        chuong_trinh: ct!,
        mon_hoc: mon!,
        hoc_phan: hp!,
        bai_hoc: bh!,
        chu_de: cd!,
        dang_cau: dang!,
        noi_dung: noiDung,
        do_kho: doKho,
        loi_giai: loiGiai,
        dap_an_text: dapAnText,
        lua_chon: luaChon,
        ...(hinh ? { hinh } : {}),
      }
    : null;

  return { soDong: dong.soDong, hopLe, loi, canhBao, trung: false, cauHoi, viTri };
}

/** Kiểm cấu trúc phần `hinh` (client gửi lên) — chỉ tên file, không tin gì khác. */
function kiemTraCauTrucHinh(c: CauHoiNhap): string | null {
  if (c.hinh === undefined) return null;
  const h = c.hinh;
  if (!h || !Array.isArray(h.de) || !Array.isArray(h.loi_giai) || !Array.isArray(h.lua_chon)) return "Ảnh đính kèm không hợp lệ.";
  if (h.de.length > HINH_TOI_DA_MOI_DE || h.loi_giai.length > HINH_TOI_DA_MOI_LOI_GIAI) return "Số ảnh vượt giới hạn.";
  const ten = [...h.de, ...h.loi_giai, ...h.lua_chon.map((l) => l?.ten)];
  if (ten.some((t) => typeof t !== "string" || !tenAnhHopLe(t))) return "Tên file ảnh không hợp lệ.";
  const thuTu = h.lua_chon.map((l) => l.thu_tu);
  if (thuTu.some((t) => !Number.isInteger(t) || t < 1 || t > c.lua_chon.length) || new Set(thuTu).size !== thuTu.length) {
    return "Ảnh lựa chọn không hợp lệ.";
  }
  return null;
}

/**
 * Kiểm tra cấu trúc 1 câu hỏi đã chuẩn hoá — server chạy lại khi nhận dữ liệu
 * từ client để xác nhận nhập (không tin dữ liệu client gửi lên). Việc học
 * phần/bài học/chủ đề có thật và đúng cha do RPC cap_ma_cau_hoi() kiểm ở DB.
 */
export function kiemTraCauTruc(c: CauHoiNhap): string | null {
  const so = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
  if (!so(c.cap_hoc, 1, 9)) return "Cấp học không hợp lệ.";
  if (!so(c.chuong_trinh, 0, 999)) return "Chương trình không hợp lệ.";
  if (!so(c.mon_hoc, 1, 99)) return "Môn học không hợp lệ.";
  if (!so(c.hoc_phan, 1, 99)) return "Học phần không hợp lệ.";
  if (!so(c.bai_hoc, 1, 99)) return "Bài học không hợp lệ.";
  if (!so(c.chu_de, 1, 99)) return "Chủ đề không hợp lệ.";
  if (!so(c.dang_cau, 1, 9)) return "Dạng câu không hợp lệ.";
  if (DANG_CAU_CHUA_HO_TRO.includes(c.dang_cau)) return "Dạng câu này chưa hỗ trợ nhập.";
  if (typeof c.noi_dung !== "string" || c.noi_dung.trim() === "") return "Nội dung câu hỏi không được để trống.";
  if (c.do_kho !== null && !so(c.do_kho, 1, 5)) return "Độ khó phải từ 1 đến 5.";
  if (!Array.isArray(c.lua_chon) || c.lua_chon.length > SO_LUA_CHON_TOI_DA) return "Danh sách lựa chọn không hợp lệ.";
  if (c.lua_chon.some((l) => typeof l?.noi_dung !== "string" || l.noi_dung.trim() === "" || typeof l.la_dap_an !== "boolean")) {
    return "Lựa chọn không hợp lệ.";
  }
  const loiHinh = kiemTraCauTrucHinh(c);
  if (loiHinh) return loiHinh;
  const loai = layLoaiDangCau(c.dang_cau);
  if (loai === "khong_xac_dinh") return "Dạng câu này chưa hỗ trợ nhập.";
  if (loai === "dien_khuyet" || loai === "text") {
    if (c.lua_chon.length > 0) return "Dạng câu này không có lựa chọn.";
  } else if (c.dap_an_text) {
    return "Dạng câu này không dùng đáp án dạng văn bản.";
  }
  const loi: string[] = [];
  kiemTraDapAn(loai, c.noi_dung, c.lua_chon, c.dap_an_text, loi, []);
  return loi[0] ?? null;
}

/** Khoá so trùng nội dung: không phân biệt hoa/thường và khoảng trắng thừa. */
export function khoaTrungNoiDung(noiDung: string): string {
  return noiDung.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Khoá vị trí (7 mã) — dùng gom nhóm khi kiểm tra trùng. */
export function khoaViTri(c: Pick<CauHoiNhap, "cap_hoc" | "chuong_trinh" | "mon_hoc" | "hoc_phan" | "bai_hoc" | "chu_de" | "dang_cau">): string {
  return [c.cap_hoc, c.chuong_trinh, c.mon_hoc, c.hoc_phan, c.bai_hoc, c.chu_de, c.dang_cau].join("-");
}
