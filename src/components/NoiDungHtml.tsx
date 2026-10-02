import { lamSachHtml } from "@/lib/van-ban-dinh-dang";

// Hiển thị văn bản câu hỏi có định dạng (b/i/u). Luôn làm sạch lại trước khi
// render nên an toàn kể cả khi dữ liệu trong DB bị chèn thẻ lạ.
export default function NoiDungHtml({
  html,
  className,
  as: Tag = "span",
}: {
  html: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: lamSachHtml(html) }} />;
}
