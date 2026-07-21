const KICH_THUOC_TOI_DA_PX = 1600;
const DUNG_LUONG_MUC_TIEU_BYTE = 400 * 1024;
const CAC_MUC_CHAT_LUONG = [0.75, 0.6, 0.45, 0.3];

const LOAI_ANH_NEN_DUOC = ["image/jpeg", "image/png"];

export type KetQuaNenAnh = {
  file: File;
  daNen: boolean;
};

/**
 * Nén ảnh jpg/png xuống dung lượng nhỏ nhất có thể trước khi upload làm biên lai.
 * HEIC và PDF không nén được bằng Canvas API của trình duyệt — trả về nguyên bản.
 */
export async function nenAnhBienLai(file: File): Promise<KetQuaNenAnh> {
  if (!LOAI_ANH_NEN_DUOC.includes(file.type)) {
    return { file, daNen: false };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const tiLe = Math.min(1, KICH_THUOC_TOI_DA_PX / Math.max(bitmap.width, bitmap.height));
    const rongMoi = Math.round(bitmap.width * tiLe);
    const caoMoi = Math.round(bitmap.height * tiLe);

    const canvas = document.createElement("canvas");
    canvas.width = rongMoi;
    canvas.height = caoMoi;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, daNen: false };
    ctx.drawImage(bitmap, 0, 0, rongMoi, caoMoi);

    let blobNhoNhat: Blob | null = null;
    for (const chatLuong of CAC_MUC_CHAT_LUONG) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", chatLuong)
      );
      if (!blob) continue;
      if (!blobNhoNhat || blob.size < blobNhoNhat.size) blobNhoNhat = blob;
      if (blob.size <= DUNG_LUONG_MUC_TIEU_BYTE) break;
    }

    if (!blobNhoNhat || blobNhoNhat.size >= file.size) {
      return { file, daNen: false };
    }

    const tenMoi = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return {
      file: new File([blobNhoNhat], tenMoi, { type: "image/jpeg" }),
      daNen: true,
    };
  } catch {
    return { file, daNen: false };
  }
}

export function dungLuongHienThi(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(0)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}
