// Đọc kích thước PNG/JPEG (không cần thư viện) + chuyển webp → png bằng sharp nếu có.
export type AnhDocx = { buf: Buffer; ext: "png" | "jpeg"; w: number; h: number };

function kichThuocPng(b: Buffer): [number, number] | null {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

function kichThuocJpeg(b: Buffer): [number, number] | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

export async function chuanBiAnh(buf: Buffer, mime: string): Promise<AnhDocx | null> {
  let data = buf;
  let loai = mime;
  if (mime === "image/webp") {
    try {
      const sharp = (await import("sharp")).default;
      data = await sharp(buf).png().toBuffer();
      loai = "image/png";
    } catch {
      return null;
    }
  }
  const png = loai === "image/png";
  const kt = png ? kichThuocPng(data) : kichThuocJpeg(data);
  if (!kt || !kt[0] || !kt[1]) return null;
  return { buf: data, ext: png ? "png" : "jpeg", w: kt[0], h: kt[1] };
}
