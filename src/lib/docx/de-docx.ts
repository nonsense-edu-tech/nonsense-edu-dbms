// Dựng file .docx đề thi bằng OOXML thuần + JSZip (không thêm thư viện docx).
import JSZip from "jszip";
import { escXml, htmlThanhRuns, para, run } from "./noi-dung";
import type { AnhDocx } from "./anh";

export type LoaiTep = "de" | "dap-an" | "loi-giai";

export type LuaChonDocx = { id: string; noiDung: string; laDapAn: boolean; anh?: AnhDocx[] };
export type CauDocx = {
  stt: number;
  dangCau: number | null;
  noiDung: string;
  dapAnText: string | null;
  loiGiai: string | null;
  luaChon: LuaChonDocx[]; // ĐÃ theo thứ tự hiển thị của mã đề
  anhDe: AnhDocx[];
  anhLoiGiai: AnhDocx[];
  diem: number | null;
  phan: { id: string; nhan: string | null };
  nguLieu: { id: string; tieuDe: string | null; noiDung: string } | null;
};
export type DeDocx = {
  tenDe: string;
  tenMon: string;
  maDe: string; // mã đề (101…) hoặc nhãn
  thoiGianPhut: number | null;
  tenTrungTam: string;
  cau: CauDocx[];
};

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

const CHU = "ABCDEFGH";
const EMU_CM = 360000;
const MAX_RONG_CM = 14;
const MAX_CAO_CM = 9;

type Media = { name: string; buf: Buffer; ext: string };

class Ctx {
  media: Media[] = [];
  rels: string[] = [];
  anh(a: AnhDocx): string {
    const n = this.media.length + 1;
    const name = `image${n}.${a.ext === "jpeg" ? "jpg" : "png"}`;
    this.media.push({ name, buf: a.buf, ext: a.ext });
    const rid = `rIdImg${n}`;
    this.rels.push(
      `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`
    );
    const tiLe = Math.min(MAX_RONG_CM / (a.w / 37.8), MAX_CAO_CM / (a.h / 37.8), 1); // 96dpi ≈ 37.8 px/cm
    const cx = Math.round((a.w / 37.8) * tiLe * EMU_CM);
    const cy = Math.round((a.h / 37.8) * tiLe * EMU_CM);
    return (
      `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
      `<wp:docPr id="${n}" name="Hình ${n}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
      `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
    );
  }
}

function dsAnh(ctx: Ctx, list: AnhDocx[] | undefined, ind = 0): string {
  return (list ?? []).map((a) => para(ctx.anh(a), { ind, after: 80 })).join("");
}

function dapAnChuoi(c: CauDocx): string {
  if (c.dangCau === 3) {
    return c.luaChon.map((l, i) => `${String.fromCharCode(97 + i)}) ${l.laDapAn ? "Đúng" : "Sai"}`).join("; ");
  }
  if (c.luaChon.length > 0 && (c.dangCau === 1 || c.dangCau === 2 || c.dangCau === null)) {
    const ds = c.luaChon.map((l, i) => (l.laDapAn ? CHU[i] : null)).filter(Boolean);
    if (ds.length) return ds.join(", ");
  }
  return c.dapAnText ? c.dapAnText : "—";
}

function dauTrang(d: DeDocx, loai: LoaiTep): string {
  const tieuDe = loai === "de" ? "ĐỀ THI" : loai === "dap-an" ? "ĐÁP ÁN" : "ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT";
  let s =
    para(run(d.tenTrungTam.toUpperCase(), { b: true, i: false, u: false }), { jc: "center", after: 40 }) +
    para(run(tieuDe, { b: true, i: false, u: false }, '<w:sz w:val="30"/>'), { jc: "center", after: 40 }) +
    para(run(d.tenDe, { b: true, i: false, u: false }), { jc: "center", after: 40 }) +
    para(
      run(`Môn: ${d.tenMon}` + (d.thoiGianPhut ? `   —   Thời gian: ${d.thoiGianPhut} phút` : "") + `   —   Mã đề: `) +
        run(d.maDe, { b: true, i: false, u: false }),
      { jc: "center", after: 120 }
    );
  if (loai === "de") {
    s += para(run("Họ và tên thí sinh: ………………………………………………   Lớp: …………………"), { after: 160 });
  }
  return s;
}

function thanDe(ctx: Ctx, d: DeDocx): string {
  let s = "";
  let phanHienTai: string | null = null;
  let cumHienTai: string | null = null;
  for (const c of d.cau) {
    if (c.phan.id !== phanHienTai) {
      phanHienTai = c.phan.id;
      cumHienTai = null;
      if (c.phan.nhan) {
        s += para(run(c.phan.nhan, { b: true, i: false, u: false }), { before: 160, after: 80, keepNext: true });
      }
    }
    if (c.nguLieu && c.nguLieu.id !== cumHienTai) {
      cumHienTai = c.nguLieu.id;
      if (c.nguLieu.tieuDe) {
        s += para(run(c.nguLieu.tieuDe, { b: true, i: true, u: false }), { before: 120, after: 40, keepNext: true });
      }
      s += para(htmlThanhRuns(c.nguLieu.noiDung), { after: 100, jc: "left" });
    } else if (!c.nguLieu) {
      cumHienTai = null;
    }
    s += para(run(`Câu ${c.stt}. `, { b: true, i: false, u: false }) + htmlThanhRuns(c.noiDung) + (c.diem ? run(`  (${c.diem} điểm)`, { b: false, i: true, u: false }) : ""), {
      before: 80,
      after: 40,
      keepNext: c.luaChon.length > 0,
    });
    s += dsAnh(ctx, c.anhDe);
    c.luaChon.forEach((l, i) => {
      const nhan = c.dangCau === 3 ? `${String.fromCharCode(97 + i)}) ` : `${CHU[i]}. `;
      s += para(run(nhan, { b: true, i: false, u: false }) + htmlThanhRuns(l.noiDung), { ind: 567, hanging: 340, after: 20 });
      s += dsAnh(ctx, l.anh, 567);
    });
  }
  return s;
}

function thanDapAn(d: DeDocx): string {
  const hang = (a: string, b: string, dam = false) =>
    `<w:tr><w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr>${para(run(a, { b: dam, i: false, u: false }), { jc: "center", after: 20 })}</w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="7800" w:type="dxa"/></w:tcPr>${para(run(b, { b: dam, i: false, u: false }), { after: 20 })}</w:tc></w:tr>`;
  const borders = ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`)
    .join("");
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="1200"/><w:gridCol w:w="7800"/></w:tblGrid>` +
    hang("Câu", "Đáp án", true) +
    d.cau.map((c) => hang(String(c.stt), dapAnChuoi(c))).join("") +
    `</w:tbl>` +
    para("", { after: 0 })
  );
}

function thanLoiGiai(ctx: Ctx, d: DeDocx): string {
  let s = "";
  for (const c of d.cau) {
    s += para(run(`Câu ${c.stt}. `, { b: true, i: false, u: false }) + run("Đáp án: ", { b: true, i: false, u: false }) + run(dapAnChuoi(c)), { before: 100, after: 40, keepNext: true });
    if (c.loiGiai && c.loiGiai.trim()) {
      s += para(run("Lời giải: ", { b: false, i: true, u: false }) + htmlThanhRuns(c.loiGiai), { ind: 284, after: 40 });
      s += dsAnh(ctx, c.anhLoiGiai, 284);
    } else {
      s += para(run("(Chưa có lời giải)", { b: false, i: true, u: false }), { ind: 284, after: 40 });
    }
  }
  return s;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`;

export async function taoDocx(d: DeDocx, loai: LoaiTep): Promise<Buffer> {
  const ctx = new Ctx();
  const than = loai === "de" ? thanDe(ctx, d) : loai === "dap-an" ? thanDapAn(d) : thanLoiGiai(ctx, d);
  const dau = dauTrang(d, loai);

  const footer =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>` +
    para(
      run(`Mã đề ${d.maDe} — Trang `) +
        `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`,
      { jc: "center", after: 0 }
    ) +
    `</w:ftr>`;

  const doc =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>` +
    dau +
    than +
    `<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter1"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>` +
    `</w:body></w:document>`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
      `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>` +
      ctx.rels.join("") +
      `</Relationships>`
  );
  zip.file("word/document.xml", doc);
  zip.file("word/styles.xml", STYLES);
  zip.file("word/footer1.xml", footer);
  for (const m of ctx.media) zip.file(`word/media/${m.name}`, m.buf);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export { escXml };
