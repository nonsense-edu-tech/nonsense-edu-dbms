// Đọc file nhập ngữ liệu (.xlsx, 2 sheet) thành các dòng thô — CHỈ chạy ở server.
// Chỉ nhận .xlsx (cần 2 sheet nên không hỗ trợ CSV). Chỉ đọc giá trị ô, không chạy công thức/macro.

import ExcelJS from "exceljs";
import { giaTriO } from "@/lib/cau-hoi-doc-file";
import {
  anhXaTieuDeCot,
  COT_CAU_CON,
  COT_NGU_LIEU,
  SO_CAU_CON_TOI_DA_MOI_FILE,
  SO_NGU_LIEU_TOI_DA,
  TEN_SHEET_CAU_CON,
  TEN_SHEET_NGU_LIEU,
  type DongThoNhom,
} from "@/lib/ngu-lieu-import";

export const KICH_THUOC_FILE_NGU_LIEU_TOI_DA = 5 * 1024 * 1024;

export type KetQuaDocNguLieu = { error: string } | { nguLieu: DongThoNhom[]; cau: DongThoNhom[] };

function docSheet(ws: ExcelJS.Worksheet, cot: typeof COT_NGU_LIEU, tenSheet: string, toiDa: number, ten: string): { error: string } | { dong: DongThoNhom[] } {
  const bang: string[][] = [];
  const soDongGoc: number[] = [];
  ws.eachRow({ includeEmpty: true }, (row, soDong) => {
    const hang: string[] = [];
    const soCot = Math.max(row.cellCount, cot.length);
    for (let c = 1; c <= soCot; c++) hang.push(giaTriO(row.getCell(c).value));
    bang.push(hang);
    soDongGoc.push(soDong);
  });
  const idxTieuDe = bang.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (idxTieuDe < 0) return { error: `Sheet "${tenSheet}" trống.` };
  const { chiSo, thieu } = anhXaTieuDeCot(bang[idxTieuDe], cot);
  if (thieu.length > 0) return { error: `Sheet "${tenSheet}" thiếu cột bắt buộc: ${thieu.join(", ")}. Hãy dùng đúng file mẫu.` };

  const dong: DongThoNhom[] = [];
  for (let i = idxTieuDe + 1; i < bang.length; i++) {
    const hang = bang[i];
    if (hang.every((c) => c.trim() === "")) continue;
    const o: Record<string, string> = {};
    for (const c of cot) {
      const j = chiSo[c.khoa];
      if (j !== undefined) o[c.khoa] = hang[j] ?? "";
    }
    dong.push({ soDong: soDongGoc[i], o });
    if (dong.length > toiDa) return { error: `Sheet "${tenSheet}" có hơn ${toiDa} ${ten} — vui lòng chia nhỏ file.` };
  }
  return { dong };
}

export async function docFileNguLieu(buf: ArrayBuffer, tenFile: string): Promise<KetQuaDocNguLieu> {
  if (buf.byteLength === 0) return { error: "File trống." };
  if (buf.byteLength > KICH_THUOC_FILE_NGU_LIEU_TOI_DA) {
    return { error: `File quá lớn (tối đa ${KICH_THUOC_FILE_NGU_LIEU_TOI_DA / 1024 / 1024}MB).` };
  }
  if (!tenFile.toLowerCase().endsWith(".xlsx")) return { error: "Nhập ngữ liệu chỉ hỗ trợ file .xlsx (cần 2 sheet — dùng nút \"Tải template\")." };

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    return { error: "Không đọc được file Excel (file hỏng hoặc không phải .xlsx)." };
  }
  const wsNL = wb.getWorksheet(TEN_SHEET_NGU_LIEU);
  const wsCau = wb.getWorksheet(TEN_SHEET_CAU_CON);
  if (!wsNL || !wsCau) return { error: `File phải có đủ 2 sheet "${TEN_SHEET_NGU_LIEU}" và "${TEN_SHEET_CAU_CON}". Hãy dùng đúng file mẫu.` };

  const nl = docSheet(wsNL, COT_NGU_LIEU, TEN_SHEET_NGU_LIEU, SO_NGU_LIEU_TOI_DA, "ngữ liệu");
  if ("error" in nl) return nl;
  const cau = docSheet(wsCau, COT_CAU_CON, TEN_SHEET_CAU_CON, SO_CAU_CON_TOI_DA_MOI_FILE, "câu hỏi con");
  if ("error" in cau) return cau;
  if (nl.dong.length === 0) return { error: `Sheet "${TEN_SHEET_NGU_LIEU}" chưa có dòng nào (chỉ có dòng tiêu đề).` };
  return { nguLieu: nl.dong, cau: cau.dong };
}
