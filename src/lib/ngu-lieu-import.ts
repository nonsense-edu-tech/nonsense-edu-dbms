// Nhập NGỮ LIỆU + CÂU HỎI CON từ file Excel — phần THUẦN (cột, kiểm tra, dựng nhóm).
// TÁCH RIÊNG với nhập câu hỏi lẻ (cau-hoi-import.ts): file có 2 sheet nối nhau bằng cột "Nhóm":
//   - sheet "Ngữ liệu": mỗi dòng = 1 ngữ liệu (1 vị trí giáo án + nội dung dẫn);
//   - sheet "Câu hỏi con": mỗi dòng = 1 câu con, ghi "Nhóm" của ngữ liệu chứa nó.
// Câu con KHÔNG khai vị trí — thừa hưởng vị trí của ngữ liệu (một ngữ liệu một vị trí).
// Việc kiểm tra từng câu con tái dùng kiemTraDong() của nhập câu hỏi lẻ để hai đường luôn cùng luật.

import {
  chuanHoaTieuDe,
  chuoi,
  docMaSo,
  docMaSoTuyChon,
  kiemTraDong,
  TIEN_TO_DONG_VI_DU,
  type DanhMucNhap,
  type DongXemTruoc,
} from "@/lib/cau-hoi-import";
import { LOAI_NGU_LIEU, SO_CAU_CON_TOI_DA, type LoaiNguLieu } from "@/lib/ngu-lieu";

export const TEN_SHEET_NGU_LIEU = "Ngữ liệu";
export const TEN_SHEET_CAU_CON = "Câu hỏi con";
export const SO_NGU_LIEU_TOI_DA = 100;
export const SO_CAU_CON_TOI_DA_MOI_FILE = 500;

type Cot = { khoa: string; nhan: string; batBuoc: boolean; rong: number };

export const COT_NGU_LIEU: Cot[] = [
  { khoa: "nhom", nhan: "Nhóm", batBuoc: true, rong: 10 },
  { khoa: "loai", nhan: "Loại (mã)", batBuoc: true, rong: 12 },
  { khoa: "tieu_de", nhan: "Tiêu đề", batBuoc: false, rong: 28 },
  { khoa: "cap_hoc", nhan: "Cấp học (mã)", batBuoc: true, rong: 12 },
  { khoa: "mon_hoc", nhan: "Môn học (mã)", batBuoc: true, rong: 12 },
  { khoa: "hoc_phan", nhan: "Học phần (mã)", batBuoc: false, rong: 13 },
  { khoa: "bai_hoc", nhan: "Bài học (mã)", batBuoc: false, rong: 12 },
  { khoa: "chu_de", nhan: "Chủ đề (mã)", batBuoc: false, rong: 12 },
  { khoa: "noi_dung", nhan: "Nội dung ngữ liệu", batBuoc: true, rong: 80 },
];

const CHU = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const COT_CAU_CON: Cot[] = [
  { khoa: "nhom", nhan: "Nhóm", batBuoc: true, rong: 10 },
  { khoa: "dang_cau", nhan: "Dạng câu (mã)", batBuoc: true, rong: 13 },
  { khoa: "noi_dung", nhan: "Nội dung", batBuoc: true, rong: 60 },
  ...CHU.map((c) => ({ khoa: `lua_chon_${c}`, nhan: `Lựa chọn ${c.toUpperCase()}`, batBuoc: false, rong: 28 })),
  { khoa: "dap_an", nhan: "Đáp án", batBuoc: false, rong: 24 },
  { khoa: "do_kho", nhan: "Độ khó (1-5)", batBuoc: false, rong: 12 },
  { khoa: "loi_giai", nhan: "Lời giải", batBuoc: false, rong: 40 },
];

/** Dòng thô: số dòng trong sheet (để báo lỗi) + giá trị ô theo khoá cột. */
export type DongThoNhom = { soDong: number; o: Record<string, string> };

const BI_DANH: Record<string, string> = {
  noi_dung_ngu_lieu: "noi_dung",
  ngu_lieu: "noi_dung",
  loai_ngu_lieu: "loai",
  nhom_ngu_lieu: "nhom",
  noi_dung_cau_hoi: "noi_dung",
  cau_hoi: "noi_dung",
  dap_an_dung: "dap_an",
};

export function anhXaTieuDeCot(tieuDe: string[], cot: Cot[]): { chiSo: Record<string, number>; thieu: string[] } {
  const hopLe = new Set(cot.map((c) => c.khoa));
  const chiSo: Record<string, number> = {};
  tieuDe.forEach((raw, i) => {
    const k = chuanHoaTieuDe(raw);
    const khoa = hopLe.has(k) ? k : BI_DANH[k];
    if (khoa && hopLe.has(khoa) && chiSo[khoa] === undefined) chiSo[khoa] = i;
  });
  return { chiSo, thieu: cot.filter((c) => c.batBuoc && chiSo[c.khoa] === undefined).map((c) => c.nhan) };
}

/** Ô "Loại": nhận mã (doc_core), số thứ tự 1-4, hoặc tên loại (không phân biệt dấu/hoa thường). */
export function docLoai(raw: string, loi: string[]): LoaiNguLieu | null {
  const v = chuoi(raw);
  if (v === "") {
    loi.push("Thiếu Loại ngữ liệu.");
    return null;
  }
  const k = chuanHoaTieuDe(v);
  const theoSo = /^[1-4]$/.test(v) ? LOAI_NGU_LIEU[Number(v) - 1] : undefined;
  const loai = theoSo ?? LOAI_NGU_LIEU.find((l) => l.ma === k || chuanHoaTieuDe(l.ten) === k);
  if (!loai) {
    loi.push(`Loại ngữ liệu "${v.slice(0, 30)}" không hợp lệ (dùng 1-${LOAI_NGU_LIEU.length}: ${LOAI_NGU_LIEU.map((l, i) => `${i + 1}=${l.ten}`).join(", ")}).`);
    return null;
  }
  return loai.ma;
}

/** Ngữ liệu đã chuẩn hoá — đúng cấu trúc server cần để lưu. */
export type NguLieuNhap = {
  loai: LoaiNguLieu;
  tieu_de: string | null;
  noi_dung: string;
  cap_hoc: number;
  mon_hoc: number;
  hoc_phan: number;
  bai_hoc: number;
  chu_de: number;
};

export type NhomXemTruoc = {
  nhom: string;
  /** Số dòng của ngữ liệu trong sheet "Ngữ liệu". */
  soDong: number;
  hopLe: boolean;
  loi: string[];
  canhBao: string[];
  tieuDe: string;
  loai: string;
  viTri: string;
  nguLieu: NguLieuNhap | null;
  /** Các câu con theo thứ tự xuất hiện trong sheet (cauHoi chỉ có khi câu hợp lệ). */
  cau: DongXemTruoc[];
};

export type KetQuaDungNhom = { nhom: NhomXemTruoc[]; dongMoCoi: { soDong: number; loi: string }[] };

type ViTriKiem = { nguLieu: Pick<NguLieuNhap, "cap_hoc" | "mon_hoc" | "hoc_phan" | "bai_hoc" | "chu_de"> | null; hienThi: string };

/** Kiểm vị trí của ngữ liệu với danh mục thật (cùng luật với kiemTraDong của câu hỏi lẻ). */
function kiemTraViTri(o: Record<string, string>, dm: DanhMucNhap, loi: string[]): ViTriKiem {
  const so = loi.length;
  const cap = docMaSo(o.cap_hoc ?? "", "Cấp học", 1, 9, loi);
  const mon = docMaSo(o.mon_hoc ?? "", "Môn học", 1, 99, loi);
  const hp = docMaSoTuyChon(o.hoc_phan ?? "", "Học phần", 99, loi);
  const bh = docMaSoTuyChon(o.bai_hoc ?? "", "Bài học", 99, loi);
  const cd = docMaSoTuyChon(o.chu_de ?? "", "Chủ đề", 99, loi);
  if (bh != null && bh !== 0 && hp === 0) loi.push("Có Bài học thì phải điền Học phần chứa nó.");

  const ten: string[] = [];
  const capHoc = cap != null ? dm.capHoc.find((c) => c.ma === cap) : undefined;
  if (cap != null) {
    if (capHoc) ten.push(capHoc.ten);
    else loi.push(`Không có cấp học mã ${cap}.`);
  }
  let monHoc: DanhMucNhap["monHoc"][number] | undefined;
  if (mon != null && capHoc) {
    monHoc = dm.monHoc.find((m) => m.cap_hoc_ma === cap && m.ma === mon);
    if (!monHoc) loi.push(`Không có môn học mã ${mon} ở cấp ${capHoc.ten}.`);
    else ten.push(monHoc.ten);
  }
  let hocPhan: DanhMucNhap["hocPhan"][number] | undefined;
  if (hp === 0) ten.push("Chung");
  else if (monHoc && hp != null) {
    hocPhan = dm.hocPhan.find((h) => h.mon_hoc_id === monHoc!.id && h.ma === hp);
    if (!hocPhan) loi.push(`Không có học phần mã ${hp} trong môn "${monHoc.ten}".`);
    else ten.push(hocPhan.ten);
  }
  if (bh === 0) ten.push("Chung");
  else if (hocPhan && bh != null) {
    const b = dm.baiHoc.find((x) => x.hoc_phan_id === hocPhan!.id && x.ma === bh);
    if (!b) loi.push(`Không có bài học mã ${bh} trong học phần "${hocPhan.ten}".`);
    else ten.push(b.ten);
  }
  if (cd === 0) ten.push("Chung");
  else if (monHoc && cd != null) {
    const c = dm.chuDe.find((x) => x.mon_hoc_id === monHoc!.id && x.ma === cd);
    if (!c) loi.push(`Không có chủ đề mã ${cd} trong môn "${monHoc.ten}".`);
    else ten.push(c.ten);
  }

  const sach = loi.length === so && cap != null && mon != null && hp != null && bh != null && cd != null;
  return { nguLieu: sach ? { cap_hoc: cap!, mon_hoc: mon!, hoc_phan: hp!, bai_hoc: bh!, chu_de: cd! } : null, hienThi: ten.join(" › ") };
}

const khoaNhom = (v: string | undefined) => chuoi(v).toLowerCase();

/** Dựng các nhóm (ngữ liệu + câu con) từ hai sheet thô và kiểm tra toàn bộ. Không chạm DB. */
export function dungNhom(nguLieuTho: DongThoNhom[], cauTho: DongThoNhom[], dm: DanhMucNhap): KetQuaDungNhom {
  const nhomTheoKhoa = new Map<string, NhomXemTruoc>();
  const thoTheoKhoa = new Map<string, DongThoNhom>();
  const ketQua: NhomXemTruoc[] = [];

  for (const d of nguLieuTho) {
    const loi: string[] = [];
    const canhBao: string[] = [];
    const o = d.o;
    const ten = chuoi(o.nhom);
    const khoa = khoaNhom(o.nhom);
    if (!ten) loi.push("Thiếu Nhóm — mã nhóm nối ngữ liệu với các câu con (vd NL1).");
    else if (nhomTheoKhoa.has(khoa)) loi.push(`Nhóm "${ten}" bị trùng với ngữ liệu ở dòng ${nhomTheoKhoa.get(khoa)!.soDong}.`);

    const loai = docLoai(o.loai ?? "", loi);
    const noiDung = chuoi(o.noi_dung);
    if (!noiDung) loi.push("Nội dung ngữ liệu không được để trống.");
    else if (noiDung.startsWith(TIEN_TO_DONG_VI_DU)) {
      loi.push(`Đây là dòng ví dụ của file mẫu (bắt đầu bằng "${TIEN_TO_DONG_VI_DU}") — xoá dòng hoặc thay bằng ngữ liệu thật.`);
    }
    const tieuDe = chuoi(o.tieu_de);
    if (tieuDe.length > 200) loi.push("Tiêu đề tối đa 200 ký tự.");
    const vt = kiemTraViTri(o, dm, loi);

    const nhom: NhomXemTruoc = {
      nhom: ten,
      soDong: d.soDong,
      hopLe: false,
      loi,
      canhBao,
      tieuDe,
      loai: loai ? LOAI_NGU_LIEU.find((l) => l.ma === loai)!.ten : "",
      viTri: vt.hienThi,
      nguLieu: null,
      cau: [],
    };
    if (loi.length === 0 && loai && vt.nguLieu) {
      nhom.nguLieu = { loai, tieu_de: tieuDe || null, noi_dung: noiDung, ...vt.nguLieu };
    }
    ketQua.push(nhom);
    if (ten && !nhomTheoKhoa.has(khoa)) {
      nhomTheoKhoa.set(khoa, nhom);
      thoTheoKhoa.set(khoa, d);
    }
  }

  const dongMoCoi: KetQuaDungNhom["dongMoCoi"] = [];
  for (const d of cauTho) {
    const khoa = khoaNhom(d.o.nhom);
    if (!khoa) {
      dongMoCoi.push({ soDong: d.soDong, loi: "Thiếu Nhóm — không biết câu này thuộc ngữ liệu nào." });
      continue;
    }
    const nhom = nhomTheoKhoa.get(khoa);
    if (!nhom) {
      dongMoCoi.push({ soDong: d.soDong, loi: `Nhóm "${chuoi(d.o.nhom).slice(0, 30)}" không có trong sheet "${TEN_SHEET_NGU_LIEU}".` });
      continue;
    }
    const goc = thoTheoKhoa.get(khoa)!.o;
    // Câu con thừa hưởng vị trí của ngữ liệu: chép các ô vị trí từ dòng ngữ liệu rồi dùng chung luật câu hỏi lẻ.
    const o: Record<string, string> = { ...d.o, cap_hoc: goc.cap_hoc ?? "", mon_hoc: goc.mon_hoc ?? "", hoc_phan: goc.hoc_phan ?? "", bai_hoc: goc.bai_hoc ?? "", chu_de: goc.chu_de ?? "" };
    if (nhom.nguLieu === null && nhom.loi.some((l) => /cấp học|môn học|học phần|bài học|chủ đề/i.test(l))) {
      // Vị trí ngữ liệu đã sai: không lặp lại lỗi vị trí cho từng câu con.
      nhom.cau.push({
        soDong: d.soDong,
        hopLe: false,
        loi: ["Chưa kiểm được câu này vì vị trí của ngữ liệu có lỗi — sửa ngữ liệu trước."],
        canhBao: [],
        trung: false,
        cauHoi: null,
        viTri: { cap_hoc: "", chuong_trinh: "", mon_hoc: "", hoc_phan: "", bai_hoc: "", chu_de: "", dang_cau: "" },
      });
      continue;
    }
    nhom.cau.push(kiemTraDong({ soDong: d.soDong, o: o as never }, dm, null));
  }

  for (const nhom of ketQua) {
    if (nhom.cau.length === 0) nhom.loi.push("Ngữ liệu chưa có câu hỏi con nào (ghi Nhóm của ngữ liệu ở sheet \"Câu hỏi con\").");
    if (nhom.cau.length > SO_CAU_CON_TOI_DA) nhom.loi.push(`Ngữ liệu có ${nhom.cau.length} câu con — tối đa ${SO_CAU_CON_TOI_DA}.`);
    if (nhom.cau.length === 1) nhom.canhBao.push("Ngữ liệu chỉ có 1 câu con.");
    nhom.hopLe = nhom.loi.length === 0 && nhom.nguLieu !== null && nhom.cau.every((c) => c.hopLe);
  }
  return { nhom: ketQua, dongMoCoi };
}
