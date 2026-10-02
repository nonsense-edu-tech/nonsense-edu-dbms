// Văn bản có định dạng (in đậm/nghiêng/gạch chân) cho câu hỏi — lưu dưới dạng
// HTML tối giản, CHỈ cho phép <b> <i> <u> <br>. Mọi thứ khác bị escape/loại bỏ,
// nên chuỗi qua `lamSachHtml` an toàn để render bằng dangerouslySetInnerHTML.
// Dữ liệu cũ (văn bản thuần, có thể có xuống dòng "\n") cũng đi qua cùng hàm này
// và hiển thị đúng — không cần migration.

const THE_CHO_PHEP = new Set(["b", "i", "u"]);
const THE_DOI_TEN: Record<string, string> = { strong: "b", em: "i" };
const THE_NGAT_DONG = new Set(["div", "p"]);
const ENTITY_HOP_LE = /^&(?:amp|lt|gt|quot|#39);/;

function escapeKyTu(c: string): string {
  return c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c;
}

/** Làm sạch: giữ b/i/u/br (đổi strong→b, em→i), escape phần còn lại, cân bằng thẻ. */
export function lamSachHtml(raw: string | null | undefined): string {
  const s = (raw ?? "").replace(/\r\n?/g, "\n");
  let out = "";
  const ngan: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "<") {
      const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*?(\/?)>/.exec(s.slice(i));
      if (m) {
        const dong = m[1] === "/";
        let ten = m[2].toLowerCase();
        ten = THE_DOI_TEN[ten] ?? ten;
        if (ten === "br") {
          out += "<br>";
        } else if (THE_CHO_PHEP.has(ten)) {
          if (!dong) {
            if (!m[3]) {
              out += `<${ten}>`;
              ngan.push(ten);
            }
          } else {
            const idx = ngan.lastIndexOf(ten);
            if (idx !== -1) {
              // Đóng các thẻ đang mở phía trong trước, rồi mở lại để lồng đúng.
              const trong = ngan.splice(idx + 1);
              for (const t of [...trong].reverse()) out += `</${t}>`;
              out += `</${ten}>`;
              ngan.pop();
              for (const t of trong) {
                out += `<${t}>`;
                ngan.push(t);
              }
            }
          }
        } else if (THE_NGAT_DONG.has(ten) && dong) {
          out += "<br>";
        }
        // Thẻ khác: bỏ thẻ, giữ nội dung bên trong.
        i += m[0].length;
        continue;
      }
      out += "&lt;";
      i += 1;
      continue;
    }
    if (c === "&") {
      const m = ENTITY_HOP_LE.exec(s.slice(i));
      if (m) {
        out += m[0];
        i += m[0].length;
      } else {
        out += "&amp;";
        i += 1;
      }
      continue;
    }
    if (c === "\n") {
      out += "<br>";
    } else {
      out += escapeKyTu(c);
    }
    i += 1;
  }
  for (const t of ngan.reverse()) out += `</${t}>`;
  return out
    .replace(/<(b|i|u)><\/\1>/g, "")
    .replace(/^(?:<br>)+|(?:<br>)+$/g, "")
    .replace(/ /g, " ")
    .trim();
}

/** Văn bản thuần → HTML an toàn (escape + xuống dòng thành <br>). */
export function vanBanThanhHtml(plain: string | null | undefined): string {
  return (plain ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[<>&]/g, escapeKyTu)
    .replace(/\n/g, "<br>")
    .trim();
}

/** HTML (đã hoặc chưa làm sạch) → văn bản thuần; dùng để kiểm tra rỗng/so trùng/tìm kiếm. */
export function htmlThanhVanBan(html: string | null | undefined): string {
  return lamSachHtml(html)
    .replace(/<br>/g, "\n")
    .replace(/<\/?[biu]>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Rỗng (không có chữ) sau khi bỏ định dạng? */
export function htmlRong(html: string | null | undefined): boolean {
  return htmlThanhVanBan(html).trim() === "";
}
