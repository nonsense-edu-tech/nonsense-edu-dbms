// Công thức LaTeX trong nội dung câu hỏi.
// Quy ước: $...$ (trong dòng), $$...$$ (đứng riêng), \(...\) và \[...\] cũng được chấp nhận;
// \$ = ký tự đô-la thật. Nội dung câu hỏi vẫn là HTML tối giản (b/i/u/br) — công thức
// là văn bản nằm trong đó, nên dữ liệu cũ không cần migration.
import temml from "temml";

export type DoanVanBan = { loai: "chu"; v: string } | { loai: "toan"; v: string; hienThi: boolean };

const MAU_TOAN = /\\\$|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;

/** Chuỗi (đã qua lamSachHtml) → các đoạn chữ / công thức. */
export function tachToan(s: string): DoanVanBan[] {
  const out: DoanVanBan[] = [];
  let cuoi = 0;
  const them = (v: string) => {
    if (!v) return;
    const last = out[out.length - 1];
    if (last && last.loai === "chu") last.v += v;
    else out.push({ loai: "chu", v });
  };
  for (const m of s.matchAll(MAU_TOAN)) {
    them(s.slice(cuoi, m.index));
    cuoi = m.index + m[0].length;
    if (m[0] === "\\$") {
      them("$");
      continue;
    }
    const latex = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "";
    out.push({ loai: "toan", v: latex, hienThi: m[1] !== undefined || m[4] !== undefined });
  }
  them(s.slice(cuoi));
  return out;
}

/** Công thức lấy từ chuỗi HTML đã làm sạch: bỏ thẻ định dạng/br, giải entity. */
export function latexTuHtml(v: string): string {
  return v
    .replace(/<br>/g, " ")
    .replace(/<\/?[biu]>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** LaTeX → MathML (chuỗi). Lỗi cú pháp → null. */
export function latexSangMathML(latex: string, hienThi: boolean, xml = false): string | null {
  try {
    return temml.renderToString(latex, { displayMode: hienThi, throwOnError: true, xml });
  } catch {
    return null;
  }
}

/** HTML đã làm sạch → HTML có MathML (hiển thị phía server). Công thức lỗi hiện nguyên mã, tô đỏ. */
export function htmlCoToan(htmlSach: string): string {
  return tachToan(htmlSach)
    .map((d) => {
      if (d.loai === "chu") return d.v;
      const latex = latexTuHtml(d.v);
      const mml = latexSangMathML(latex, d.hienThi);
      return mml ?? `<span class="toan-loi" title="Công thức lỗi">${escHtml(latex)}</span>`;
    })
    .join("");
}
