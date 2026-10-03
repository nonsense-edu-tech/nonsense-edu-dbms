// Dựng file mẫu nhập ngữ liệu + câu hỏi con (.xlsx) — CHỈ chạy ở server.
// Danh mục mã lấy từ DB lúc tải nên luôn khớp dữ liệu thật.

import ExcelJS from "exceljs";
import { TIEN_TO_DONG_VI_DU, type DanhMucNhap } from "@/lib/cau-hoi-import";
import { themSheetDanhMuc } from "@/lib/cau-hoi-template";
import { LOAI_NGU_LIEU } from "@/lib/ngu-lieu";
import { COT_CAU_CON, COT_NGU_LIEU, TEN_SHEET_CAU_CON, TEN_SHEET_NGU_LIEU } from "@/lib/ngu-lieu-import";

const HUONG_DAN = [
  "HƯỚNG DẪN NHẬP NGỮ LIỆU + CÂU HỎI CON TỪ FILE",
  "",
  "1. File có 2 sheet nối nhau bằng cột \"Nhóm\": sheet \"Ngữ liệu\" (mỗi dòng = 1 ngữ liệu) và sheet \"Câu hỏi con\" (mỗi dòng = 1 câu con, ghi Nhóm của ngữ liệu chứa nó). Mã Nhóm tự đặt (vd NL1, NL2), chỉ có ý nghĩa trong file này.",
  "2. Một ngữ liệu = MỘT vị trí giáo án. Cấp học + Môn học BẮT BUỘC; Học phần, Bài học, Chủ đề tuỳ chọn (trống = \"Chung\"). Tra mã ở các sheet \"Mã ...\". Câu con KHÔNG khai vị trí — tự theo ngữ liệu.",
  `3. Loại ngữ liệu (mã): ${LOAI_NGU_LIEU.map((l, i) => `${i + 1} = ${l.ten}`).join(", ")}.`,
  "4. Sheet \"Câu hỏi con\": cách điền Dạng câu, Lựa chọn A..H, Đáp án, Độ khó, Lời giải GIỐNG HỆT file nhập câu hỏi lẻ (Dạng 1: 1 chữ cái đúng, vd B; Dạng 2: nhiều chữ cái, vd A,C; Dạng 3: các mệnh đề ĐÚNG; Dạng 4: đáp án từng chỗ trống ngăn cách bằng |; Dạng 7, 8: văn bản). Dạng 5, 6 chưa hỗ trợ nhập.",
  "5. Thứ tự câu con trong ngữ liệu = thứ tự dòng trong sheet \"Câu hỏi con\" (các dòng cùng Nhóm không cần nằm liền nhau).",
  "6. Công thức viết trong dấu $...$ (vd $\\frac{a}{b}$). Xoá các dòng ví dụ (bắt đầu bằng \"[Ví dụ]\") trước khi nhập — dòng ví dụ bị chặn.",
  "7. Chưa hỗ trợ ảnh/biểu đồ trong file này (kể cả ảnh của câu con). Cần ảnh → tạo ngữ liệu bằng form nhập tay hoặc nhập câu lẻ kèm zip ảnh.",
  "8. Tối đa 100 ngữ liệu, mỗi ngữ liệu tối đa 30 câu con, tối đa 500 câu con mỗi file. Ngữ liệu và câu hỏi nhập vào luôn ở trạng thái NHÁP (câu hỏi chờ nộp duyệt).",
];

function chonViTriViDu(dm: DanhMucNhap): Record<"cap_hoc" | "mon_hoc" | "hoc_phan" | "bai_hoc" | "chu_de", string> {
  const mon = dm.monHoc[0];
  return { cap_hoc: String(mon?.cap_hoc_ma ?? 1), mon_hoc: String(mon?.ma ?? 1), hoc_phan: "", bai_hoc: "", chu_de: "" };
}

export async function taoTemplateNguLieuXlsx(dm: DanhMucNhap): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nonsense Edu";
  const vt = chonViTriViDu(dm);
  const p = TIEN_TO_DONG_VI_DU;

  const themSheet = (ten: string, cot: typeof COT_NGU_LIEU, dong: Record<string, string>[], dongToiDa: number) => {
    const ws = wb.addWorksheet(ten);
    ws.columns = cot.map((c) => ({ width: c.rong }));
    const hang1 = ws.addRow(cot.map((c) => c.nhan));
    hang1.font = { bold: true };
    hang1.eachCell((cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cot[col - 1].batBuoc ? "FFFDE9C4" : "FFEAEAEA" } };
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const d of dong) ws.addRow(cot.map((c) => d[c.khoa] ?? "")).alignment = { vertical: "top", wrapText: true };
    return { ws, dongToiDa };
  };

  const { ws: wsNL } = themSheet(
    TEN_SHEET_NGU_LIEU,
    COT_NGU_LIEU,
    [{ nhom: "NL1", loai: "1", tieu_de: `${p} Quang hợp ở thực vật`, ...vt, noi_dung: `${p} Quang hợp là quá trình cây xanh hấp thụ ánh sáng để tổng hợp chất hữu cơ…` }],
    100
  );
  const cotLoai = COT_NGU_LIEU.findIndex((c) => c.khoa === "loai") + 1;
  for (let r = 2; r <= 101; r++) wsNL.getCell(r, cotLoai).dataValidation = { type: "list", allowBlank: true, formulae: ['"1,2,3,4"'] };

  const { ws: wsCau } = themSheet(
    TEN_SHEET_CAU_CON,
    COT_CAU_CON,
    [
      { nhom: "NL1", dang_cau: "1", noi_dung: `${p} Theo đoạn văn, quang hợp diễn ra chủ yếu ở đâu?`, lua_chon_a: "Rễ", lua_chon_b: "Lá", lua_chon_c: "Thân", lua_chon_d: "Hoa", dap_an: "B", do_kho: "1" },
      { nhom: "NL1", dang_cau: "3", noi_dung: `${p} Xét các nhận định sau về đoạn văn:`, lua_chon_a: "Cây cần ánh sáng", lua_chon_b: "Cây không cần nước", dap_an: "A", do_kho: "2" },
    ],
    501
  );
  const cotDang = COT_CAU_CON.findIndex((c) => c.khoa === "dang_cau") + 1;
  const cotKho = COT_CAU_CON.findIndex((c) => c.khoa === "do_kho") + 1;
  for (let r = 2; r <= 501; r++) {
    wsCau.getCell(r, cotDang).dataValidation = { type: "list", allowBlank: true, formulae: ['"1,2,3,4,7,8"'] };
    wsCau.getCell(r, cotKho).dataValidation = { type: "list", allowBlank: true, formulae: ['"1,2,3,4,5"'] };
  }

  const hd = wb.addWorksheet("Hướng dẫn");
  hd.columns = [{ width: 140 }];
  HUONG_DAN.forEach((t, i) => {
    const r = hd.addRow([t]);
    r.alignment = { wrapText: true, vertical: "top" };
    if (i === 0) r.font = { bold: true, size: 13 };
  });

  themSheetDanhMuc(wb, dm);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
