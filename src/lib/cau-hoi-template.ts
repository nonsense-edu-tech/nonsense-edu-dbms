// Dựng file mẫu nhập câu hỏi (.xlsx / .csv) — CHỈ chạy ở server.
// Danh mục mã (cấp học, chương trình, môn, học phần, bài học, chủ đề, dạng câu)
// lấy từ DB lúc tải nên luôn khớp dữ liệu thật; dòng ví dụ dùng mã có thật để
// người dùng thấy đúng hình dạng dữ liệu.

import ExcelJS from "exceljs";
import { COT_TEMPLATE, TIEN_TO_DONG_VI_DU, type DanhMucNhap, type KhoaCot } from "@/lib/cau-hoi-import";
import { TEN_SHEET_CAU_HOI } from "@/lib/cau-hoi-doc-file";

const DANG_CAU_HO_TRO_NHAP = [1, 2, 3, 4, 7, 8];

type DongViDu = Partial<Record<KhoaCot, string>>;

/** Chọn bộ mã có thật (chương trình → môn → học phần → bài học + chủ đề) để làm ví dụ. */
function chonViTriViDu(dm: DanhMucNhap): Record<"cap_hoc" | "chuong_trinh" | "mon_hoc" | "hoc_phan" | "bai_hoc" | "chu_de", string> {
  for (const x of dm.chuongTrinhMonHoc) {
    const mon = dm.monHoc.find((m) => m.cap_hoc_ma === x.cap_hoc_ma && m.ma === x.mon_hoc_ma);
    if (!mon) continue;
    const hp = dm.hocPhan.find((h) => h.mon_hoc_id === mon.id && dm.baiHoc.some((b) => b.hoc_phan_id === h.id));
    const cd = dm.chuDe.find((c) => c.mon_hoc_id === mon.id);
    if (!hp || !cd) continue;
    const bh = dm.baiHoc.find((b) => b.hoc_phan_id === hp.id)!;
    return {
      cap_hoc: String(x.cap_hoc_ma),
      chuong_trinh: x.chuong_trinh_ma,
      mon_hoc: String(mon.ma),
      hoc_phan: String(hp.ma),
      bai_hoc: String(bh.ma),
      chu_de: String(cd.ma),
    };
  }
  return { cap_hoc: "1", chuong_trinh: "001", mon_hoc: "1", hoc_phan: "1", bai_hoc: "1", chu_de: "1" };
}

export function dongViDu(dm: DanhMucNhap): DongViDu[] {
  const vt = chonViTriViDu(dm);
  const p = TIEN_TO_DONG_VI_DU;
  return [
    { ...vt, dang_cau: "1", noi_dung: `${p} 2 + 3 bằng bao nhiêu?`, lua_chon_a: "4", lua_chon_b: "5", lua_chon_c: "6", lua_chon_d: "7", dap_an: "B", do_kho: "1", loi_giai: "2 + 3 = 5" },
    { ...vt, dang_cau: "2", noi_dung: `${p} Những số nào là số nguyên tố?`, lua_chon_a: "2", lua_chon_b: "4", lua_chon_c: "7", lua_chon_d: "9", dap_an: "A,C", do_kho: "2" },
    { ...vt, dang_cau: "3", noi_dung: `${p} Xét các mệnh đề sau:`, lua_chon_a: "5 là số lẻ", lua_chon_b: "6 là số nguyên tố", dap_an: "A", do_kho: "2" },
    { ...vt, dang_cau: "4", noi_dung: `${p} 3 + ___ = 10 và 4 x ___ = 20`, dap_an: "7 | 5", do_kho: "3" },
    { ...vt, dang_cau: "7", noi_dung: `${p} Thủ đô của Việt Nam là gì?`, dap_an: "Hà Nội", do_kho: "1" },
  ];
}

const HUONG_DAN: string[] = [
  "HƯỚNG DẪN NHẬP CÂU HỎI TỪ FILE",
  "",
  "1. Mỗi DÒNG = 1 CÂU HỎI. Điền ở sheet \"Câu hỏi\", giữ nguyên dòng tiêu đề (dòng 1). Xoá 5 dòng ví dụ (bắt đầu bằng \"[Ví dụ]\") trước khi nhập — dòng ví dụ bị chặn khi import.",
  "2. Vị trí giáo án nhập bằng MÃ SỐ: Cấp học, Chương trình, Môn học, Học phần, Bài học, Chủ đề. Tra mã ở các sheet \"Mã ...\" (có thể gõ 1 hoặc 001 đều được).",
  "   - Môn học phải đã được gán vào chương trình (tab Chương trình trong Học liệu).",
  "   - Học phần/Chủ đề phải thuộc đúng môn; Bài học phải thuộc đúng học phần.",
  "3. Dạng câu (mã): 1 = Trắc nghiệm 1 đáp án, 2 = Trắc nghiệm nhiều đáp án, 3 = Đúng/Sai (từng ý), 4 = Điền khuyết, 7 = Trả lời ngắn, 8 = Tự luận.",
  "   (Dạng 5 Nối cặp và 6 Sắp xếp chưa hỗ trợ nhập.)",
  "4. Cột \"Đáp án\" tuỳ theo dạng câu:",
  "   - Dạng 1: 1 chữ cái lựa chọn đúng, vd B.   Dạng 2: nhiều chữ cái, vd A,C.",
  "   - Dạng 3: các chữ cái của MỆNH ĐỀ ĐÚNG (các mệnh đề còn lại là sai), vd A.",
  "   - Dạng 4: đáp án từng chỗ trống theo thứ tự, ngăn cách bằng dấu |, vd 7 | 5. Đánh dấu chỗ trống trong Nội dung bằng ___.",
  "   - Dạng 7, 8: văn bản đáp án (tự luận có thể để trống).",
  "5. Lựa chọn A..H: dạng 1, 2, 3 điền các lựa chọn/mệnh đề (tối thiểu 2 lựa chọn với dạng 1, 2). Dạng 4, 7, 8 để trống các cột này.",
  "6. Độ khó: 1 đến 5 (có thể để trống). Lời giải: tuỳ chọn.",
  "7. Tối đa 500 câu hỏi mỗi file. Sau khi tải lên, hệ thống hiển thị danh sách xem trước; câu hỏi nhập vào luôn ở trạng thái NHÁP, chờ nộp duyệt.",
];

function themSheetBang(wb: ExcelJS.Workbook, ten: string, tieuDe: string[], dong: (string | number)[][], rong: number[]) {
  const ws = wb.addWorksheet(ten);
  ws.addRow(tieuDe).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.columns = rong.map((width) => ({ width }));
  for (const d of dong) ws.addRow(d);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: tieuDe.length } };
}

export async function taoTemplateXlsx(dm: DanhMucNhap): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nonsense Edu";

  // --- Sheet nhập liệu
  const ws = wb.addWorksheet(TEN_SHEET_CAU_HOI);
  ws.columns = COT_TEMPLATE.map((c) => ({ width: c.rong }));
  const hang1 = ws.addRow(COT_TEMPLATE.map((c) => c.nhan));
  hang1.font = { bold: true };
  hang1.alignment = { vertical: "middle", wrapText: true };
  hang1.eachCell((cell, col) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COT_TEMPLATE[col - 1].batBuoc ? "FFFDE9C4" : "FFEAEAEA" } };
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const d of dongViDu(dm)) {
    const r = ws.addRow(COT_TEMPLATE.map((c) => d[c.khoa] ?? ""));
    r.alignment = { vertical: "top", wrapText: true };
  }
  const cotDang = COT_TEMPLATE.findIndex((c) => c.khoa === "dang_cau") + 1;
  const cotKho = COT_TEMPLATE.findIndex((c) => c.khoa === "do_kho") + 1;
  for (let r = 2; r <= 501; r++) {
    ws.getCell(r, cotDang).dataValidation = { type: "list", allowBlank: true, formulae: [`"${DANG_CAU_HO_TRO_NHAP.join(",")}"`] };
    ws.getCell(r, cotKho).dataValidation = { type: "list", allowBlank: true, formulae: ['"1,2,3,4,5"'] };
  }

  // --- Hướng dẫn
  const hd = wb.addWorksheet("Hướng dẫn");
  hd.columns = [{ width: 140 }];
  HUONG_DAN.forEach((t, i) => {
    const r = hd.addRow([t]);
    r.alignment = { wrapText: true, vertical: "top" };
    if (i === 0) r.font = { bold: true, size: 13 };
  });

  // --- Danh mục mã
  const capTen = new Map(dm.capHoc.map((c) => [c.ma, c.ten]));
  const ctTen = new Map(dm.chuongTrinh.map((c) => [c.ma, c.ten]));
  themSheetBang(
    wb,
    "Mã cấp-chương trình-môn",
    ["Cấp học (mã)", "Tên cấp học", "Chương trình (mã)", "Tên chương trình", "Môn học (mã)", "Tên môn học"],
    dm.chuongTrinhMonHoc
      .map((x) => {
        const mon = dm.monHoc.find((m) => m.cap_hoc_ma === x.cap_hoc_ma && m.ma === x.mon_hoc_ma);
        return [x.cap_hoc_ma, capTen.get(x.cap_hoc_ma) ?? "", x.chuong_trinh_ma, ctTen.get(x.chuong_trinh_ma) ?? "", x.mon_hoc_ma, mon?.ten ?? ""] as (string | number)[];
      })
      .sort((a, b) => String(a[2]).localeCompare(String(b[2])) || Number(a[0]) - Number(b[0]) || Number(a[4]) - Number(b[4])),
    [14, 18, 18, 24, 14, 28]
  );

  const monDe = (id: string) => dm.monHoc.find((m) => m.id === id);
  const dongHocPhan: (string | number)[][] = [];
  for (const hp of dm.hocPhan) {
    const mon = monDe(hp.mon_hoc_id);
    if (!mon) continue;
    const bais = dm.baiHoc.filter((b) => b.hoc_phan_id === hp.id).sort((a, b) => a.ma - b.ma);
    const base = [capTen.get(mon.cap_hoc_ma) ?? "", mon.ma, mon.ten, hp.ma, hp.ten];
    if (bais.length === 0) dongHocPhan.push([...base, "", ""]);
    for (const b of bais) dongHocPhan.push([...base, b.ma, b.ten]);
  }
  dongHocPhan.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || Number(a[1]) - Number(b[1]) || Number(a[3]) - Number(b[3]));
  themSheetBang(wb, "Mã học phần-bài học", ["Cấp học", "Môn học (mã)", "Tên môn học", "Học phần (mã)", "Tên học phần", "Bài học (mã)", "Tên bài học"], dongHocPhan, [14, 14, 24, 14, 28, 14, 32]);

  const dongChuDe: (string | number)[][] = [];
  for (const cd of dm.chuDe) {
    const mon = monDe(cd.mon_hoc_id);
    if (mon) dongChuDe.push([capTen.get(mon.cap_hoc_ma) ?? "", mon.ma, mon.ten, cd.ma, cd.ten]);
  }
  dongChuDe.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || Number(a[1]) - Number(b[1]) || Number(a[3]) - Number(b[3]));
  themSheetBang(wb, "Mã chủ đề", ["Cấp học", "Môn học (mã)", "Tên môn học", "Chủ đề (mã)", "Tên chủ đề"], dongChuDe, [14, 14, 24, 14, 32]);

  themSheetBang(
    wb,
    "Mã dạng câu",
    ["Dạng câu (mã)", "Tên dạng câu", "Hỗ trợ nhập từ file"],
    dm.dangCau.map((d) => [d.ma, d.ten, DANG_CAU_HO_TRO_NHAP.includes(d.ma) ? "Có" : "Chưa"]),
    [16, 36, 22]
  );

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function oCsv(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

/** CSV mẫu (UTF-8 có BOM để Excel mở đúng tiếng Việt). Không có danh mục mã — dùng bản Excel để tra mã. */
export function taoTemplateCsv(dm: DanhMucNhap): string {
  const dong = [COT_TEMPLATE.map((c) => oCsv(c.nhan)).join(",")];
  for (const d of dongViDu(dm)) dong.push(COT_TEMPLATE.map((c) => oCsv(d[c.khoa] ?? "")).join(","));
  return "\uFEFF" + dong.join("\r\n") + "\r\n";
}
