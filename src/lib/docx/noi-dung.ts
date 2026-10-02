// Nội dung câu hỏi (HTML tối giản b/i/u/br + công thức LaTeX) → OOXML (run + OMML).
import { mml2omml } from "mathml2omml";
import { lamSachHtml } from "@/lib/van-ban-dinh-dang";
import { latexSangMathML, latexTuHtml, tachToan } from "@/lib/toan";

export function escXml(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function giaiEntity(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

type DinhDang = { b: boolean; i: boolean; u: boolean };

function rPr(f: DinhDang, extra = ""): string {
  const p = `${f.b ? "<w:b/>" : ""}${f.i ? "<w:i/>" : ""}${f.u ? '<w:u w:val="single"/>' : ""}${extra}`;
  return p ? `<w:rPr>${p}</w:rPr>` : "";
}

export function run(text: string, f: DinhDang = { b: false, i: false, u: false }, extra = ""): string {
  return `<w:r>${rPr(f, extra)}<w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}

function omml(latex: string, hienThi: boolean): string | null {
  const mml = latexSangMathML(latex, hienThi, true);
  if (!mml) return null;
  try {
    return mml2omml(mml);
  } catch {
    return null;
  }
}

/** HTML nội dung → chuỗi run/oMath nằm trong 1 <w:p>. `dam` ép in đậm toàn bộ. */
export function htmlThanhRuns(html: string | null | undefined, dam = false): string {
  const sach = lamSachHtml(html);
  const f: DinhDang = { b: dam, i: false, u: false };
  let out = "";
  for (const d of tachToan(sach)) {
    if (d.loai === "toan") {
      const latex = latexTuHtml(d.v);
      out += omml(latex, d.hienThi) ?? run(`$${latex}$`, f);
      continue;
    }
    // Đoạn chữ: tách theo thẻ b/i/u/br, giữ trạng thái định dạng xuyên các đoạn.
    for (const tok of d.v.split(/(<\/?[biu]>|<br>)/)) {
      if (!tok) continue;
      if (tok === "<br>") out += "<w:r><w:br/></w:r>";
      else if (tok === "<b>") f.b = true;
      else if (tok === "</b>") f.b = dam;
      else if (tok === "<i>") f.i = true;
      else if (tok === "</i>") f.i = false;
      else if (tok === "<u>") f.u = true;
      else if (tok === "</u>") f.u = false;
      else out += run(giaiEntity(tok), f);
    }
  }
  return out;
}

export function para(inner: string, opts: { ind?: number; hanging?: number; jc?: "left" | "center" | "right"; before?: number; after?: number; keepNext?: boolean } = {}): string {
  const p =
    (opts.keepNext ? "<w:keepNext/>" : "") +
    (opts.before !== undefined || opts.after !== undefined
      ? `<w:spacing w:before="${opts.before ?? 0}" w:after="${opts.after ?? 60}"/>`
      : "") +
    (opts.ind !== undefined ? `<w:ind w:left="${opts.ind}"${opts.hanging ? ` w:hanging="${opts.hanging}"` : ""}/>` : "") +
    (opts.jc ? `<w:jc w:val="${opts.jc}"/>` : "");
  return `<w:p>${p ? `<w:pPr>${p}</w:pPr>` : ""}${inner}</w:p>`;
}
