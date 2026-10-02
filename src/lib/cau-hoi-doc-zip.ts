// Đọc file zip chứa ảnh đi kèm file import câu hỏi (server). Chỉ lập danh mục
// tên ảnh → dung lượng để kiểm tra; ảnh thật được client giải nén & gửi theo từng lô.
import JSZip from "jszip";
import { DUOI_ANH_CHO_PHEP, HINH_TOI_DA_BYTE_MOI_ANH, khoaTenAnh } from "./cau-hoi-import";

export const ZIP_TOI_DA_BYTE = 20 * 1024 * 1024;
export const ZIP_TOI_DA_SO_ANH = 300;

/** Nhận diện định dạng thật theo byte đầu (không tin đuôi file). */
export function mimeTheoByte(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function docZipAnh(buf: ArrayBuffer): Promise<{ error: string } | { anh: Map<string, number>; canhBao: string[] }> {
  if (buf.byteLength > ZIP_TOI_DA_BYTE) return { error: "File zip ảnh vượt quá 20MB — hãy chia nhỏ thành nhiều lần nhập." };

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    return { error: "Không đọc được file zip ảnh (file hỏng hoặc không phải .zip)." };
  }

  const anh = new Map<string, number>();
  const canhBao: string[] = [];
  const trung = new Set<string>();
  let boQua = 0;

  const muc = Object.values(zip.files).filter((f) => !f.dir);
  if (muc.length > ZIP_TOI_DA_SO_ANH * 2) return { error: `File zip có quá nhiều file (tối đa ${ZIP_TOI_DA_SO_ANH} ảnh).` };

  for (const f of muc) {
    const ten = f.name.split("/").pop() ?? "";
    if (f.name.startsWith("__MACOSX/") || ten.startsWith(".") || ten === "") continue; // rác của macOS/Windows
    const duoi = ten.split(".").pop()?.toLowerCase() ?? "";
    if (!ten.includes(".") || !DUOI_ANH_CHO_PHEP.includes(duoi)) {
      boQua++;
      continue;
    }
    const bytes = await f.async("uint8array");
    if (bytes.length > HINH_TOI_DA_BYTE_MOI_ANH) {
      canhBao.push(`Ảnh "${ten}" vượt 2MB — không dùng được.`);
      continue;
    }
    if (!mimeTheoByte(bytes)) {
      canhBao.push(`"${ten}" không phải ảnh JPG/PNG/WebP thật — không dùng được.`);
      continue;
    }
    const khoa = khoaTenAnh(ten);
    if (anh.has(khoa) || trung.has(khoa)) {
      // Trùng tên ở 2 thư mục khác nhau → không biết lấy ảnh nào, loại cả hai để buộc người dùng đổi tên.
      anh.delete(khoa);
      if (!trung.has(khoa)) canhBao.push(`Tên ảnh "${ten}" xuất hiện nhiều lần trong zip — hãy đặt tên khác nhau.`);
      trung.add(khoa);
      continue;
    }
    anh.set(khoa, bytes.length);
  }
  if (anh.size > ZIP_TOI_DA_SO_ANH) return { error: `File zip có quá nhiều ảnh (tối đa ${ZIP_TOI_DA_SO_ANH}).` };
  if (boQua > 0) canhBao.push(`Bỏ qua ${boQua} file không phải ảnh trong zip.`);
  return { anh, canhBao };
}
