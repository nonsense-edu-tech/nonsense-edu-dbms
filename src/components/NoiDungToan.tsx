import { lamSachHtml } from "@/lib/van-ban-dinh-dang";
import { htmlCoToan } from "@/lib/toan";

// Như NoiDungHtml nhưng có render công thức LaTeX ($...$, $$...$$) thành MathML phía server.
// Luôn làm sạch HTML trước; MathML do thư viện sinh ra từ mã LaTeX đã giải entity nên an toàn.
export default function NoiDungToan({
  html,
  className,
  as: Tag = "span",
}: {
  html: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: htmlCoToan(lamSachHtml(html)) }} />;
}
