// Đọc file nhập câu hỏi (.xlsx / .csv) thành các dòng thô — CHỈ chạy ở server.
// Chỉ đọc GIÁ TRỊ ô (không tính công thức, không chạy macro): công thức lấy kết
// quả đã lưu sẵn trong file.

import ExcelJS from "exceljs";
import Papa from "papaparse";
import { anhXaTieuDe, COT_TEMPLATE, SO_DONG_TOI_DA, type DongTho, type KhoaCot } from "@/lib/cau-hoi-import";

export const KICH_THUOC_FILE_TOI_DA = 5 * 1024 * 1024; // 5MB — đủ cho vài trăm câu hỏi
export const TEN_SHEET_CAU_HOI = "Câu hỏi";

export type KetQuaDocFile = { error: string } | { dong: DongTho[] };

export function giaTriO(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if ("result" in v && v.result != null) return giaTriO(v.result as ExcelJS.CellValue);
    if ("text" in v && v.text != null) return giaTriO(v.text as ExcelJS.CellValue);
    if ("error" in v) return "";
  }
  return "";
}

function bangThanhDong(bang: string[][], soDongGoc: number[]): KetQuaDocFile {
  // Dòng tiêu đề = dòng không rỗng đầu tiên.
  const idxTieuDe = bang.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (idxTieuDe < 0) return { error: "File trống." };

  const { chiSo, thieu } = anhXaTieuDe(bang[idxTieuDe]);
  if (thieu.length > 0) {
    return { error: `File thiếu cột bắt buộc: ${thieu.join(", ")}. Hãy dùng đúng file mẫu (nút "Tải template").` };
  }

  const dong: DongTho[] = [];
  for (let i = idxTieuDe + 1; i < bang.length; i++) {
    const hang = bang[i];
    if (hang.every((c) => c.trim() === "")) continue;
    const o: Partial<Record<KhoaCot, string>> = {};
    for (const cot of COT_TEMPLATE) {
      const j = chiSo[cot.khoa];
      if (j !== undefined) o[cot.khoa] = hang[j] ?? "";
    }
    dong.push({ soDong: soDongGoc[i], o });
    if (dong.length > SO_DONG_TOI_DA) {
      return { error: `File có hơn ${SO_DONG_TOI_DA} câu hỏi — vui lòng chia nhỏ file (tối đa ${SO_DONG_TOI_DA} câu mỗi lần).` };
    }
  }
  if (dong.length === 0) return { error: "File chưa có dòng câu hỏi nào (chỉ có dòng tiêu đề)." };
  return { dong };
}

async function docXlsx(buf: ArrayBuffer): Promise<KetQuaDocFile> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    return { error: "Không đọc được file Excel (file hỏng hoặc không phải .xlsx)." };
  }
  const ws = wb.getWorksheet(TEN_SHEET_CAU_HOI) ?? wb.worksheets[0];
  if (!ws) return { error: "File Excel không có sheet nào." };

  const bang: string[][] = [];
  const soDongGoc: number[] = [];
  ws.eachRow({ includeEmpty: true }, (row, soDong) => {
    const hang: string[] = [];
    const soCot = Math.max(row.cellCount, COT_TEMPLATE.length);
    for (let c = 1; c <= soCot; c++) hang.push(giaTriO(row.getCell(c).value));
    bang.push(hang);
    soDongGoc.push(soDong);
  });
  return bangThanhDong(bang, soDongGoc);
}

function docCsv(buf: ArrayBuffer): KetQuaDocFile {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return { error: "File CSV phải lưu dạng UTF-8 (Excel: Save As → CSV UTF-8) để không lỗi tiếng Việt." };
  }
  text = text.replace(/^\uFEFF/, "");
  // Tự nhận dấu phân cách (, ; hoặc tab) — Excel tiếng Việt thường xuất dấu ";".
  const kq = Papa.parse<string[]>(text, { skipEmptyLines: false, delimitersToGuess: [",", ";", "\t"] });
  if (kq.errors.some((e) => e.type === "Quotes")) return { error: "File CSV bị lỗi dấu ngoặc kép — kiểm tra lại các ô có xuống dòng/dấu phẩy." };
  const bang = kq.data.map((r) => r.map((c) => String(c ?? "")));
  return bangThanhDong(bang, bang.map((_, i) => i + 1));
}

export async function docFileNhap(buf: ArrayBuffer, tenFile: string): Promise<KetQuaDocFile> {
  if (buf.byteLength === 0) return { error: "File trống." };
  if (buf.byteLength > KICH_THUOC_FILE_TOI_DA) {
    return { error: `File quá lớn (tối đa ${KICH_THUOC_FILE_TOI_DA / 1024 / 1024}MB).` };
  }
  const ten = tenFile.toLowerCase();
  if (ten.endsWith(".xlsx")) return docXlsx(buf);
  if (ten.endsWith(".csv")) return docCsv(buf);
  return { error: "Chỉ hỗ trợ file .xlsx hoặc .csv (file .xls cũ: mở bằng Excel rồi Save As .xlsx)." };
}
