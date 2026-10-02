"use client";

import { useEffect, useRef, useState } from "react";
import { lamSachHtml, vanBanThanhHtml } from "@/lib/van-ban-dinh-dang";
import formStyles from "./Form.module.css";
import styles from "./RichTextEditor.module.css";

// Ô soạn thảo có định dạng in đậm / in nghiêng / gạch chân. Giá trị gửi lên form
// qua <input type="hidden" name={name}> dưới dạng HTML tối giản (xem
// src/lib/van-ban-dinh-dang.ts); server làm sạch lại lần nữa.
export default function RichTextEditor({
  name,
  id,
  defaultValue = "",
  disabled = false,
  nhieuDong = true,
  soDong = 3,
  placeholder,
  nhan,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  disabled?: boolean;
  nhieuDong?: boolean;
  soDong?: number;
  placeholder?: string;
  nhan?: string;
}) {
  const refVung = useRef<HTMLDivElement>(null);
  const [giaTri, setGiaTri] = useState(() => lamSachHtml(defaultValue));
  const [rong, setRong] = useState(() => lamSachHtml(defaultValue) === "");

  // Nạp nội dung ban đầu một lần (uncontrolled để không nhảy con trỏ khi gõ).
  useEffect(() => {
    if (refVung.current) refVung.current.innerHTML = lamSachHtml(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dongBo() {
    const el = refVung.current;
    if (!el) return;
    const sach = lamSachHtml(el.innerHTML);
    setGiaTri(sach);
    setRong(sach === "");
  }

  function dinhDang(lenh: "bold" | "italic" | "underline") {
    if (disabled) return;
    refVung.current?.focus();
    document.execCommand(lenh);
    dongBo();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nhieuDong) {
        document.execCommand("insertLineBreak");
        dongBo();
      }
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    // Dán dưới dạng văn bản thuần để không kéo theo font/màu/thẻ lạ từ Word, web…
    e.preventDefault();
    let text = e.clipboardData.getData("text/plain");
    if (!nhieuDong) text = text.replace(/\s*\n\s*/g, " ");
    document.execCommand("insertHTML", false, vanBanThanhHtml(text));
    dongBo();
  }

  return (
    <div className={styles.khung} data-disabled={disabled || undefined}>
      <div className={styles.thanhCongCu} role="toolbar" aria-label="Định dạng văn bản">
        <button type="button" className={styles.nut} onMouseDown={(e) => e.preventDefault()} onClick={() => dinhDang("bold")} disabled={disabled} title="In đậm (Ctrl+B)" aria-label="In đậm"><b>B</b></button>
        <button type="button" className={styles.nut} onMouseDown={(e) => e.preventDefault()} onClick={() => dinhDang("italic")} disabled={disabled} title="In nghiêng (Ctrl+I)" aria-label="In nghiêng"><i>I</i></button>
        <button type="button" className={styles.nut} onMouseDown={(e) => e.preventDefault()} onClick={() => dinhDang("underline")} disabled={disabled} title="Gạch chân (Ctrl+U)" aria-label="Gạch chân"><u>U</u></button>
      </div>
      <div
        ref={refVung}
        id={id}
        role="textbox"
        aria-multiline={nhieuDong}
        aria-label={nhan}
        contentEditable={!disabled}
        suppressContentEditableWarning
        className={`${formStyles.input} ${styles.vung}`}
        style={{ minHeight: nhieuDong ? `${soDong * 1.5 + 1.2}em` : undefined }}
        data-placeholder={placeholder}
        data-rong={rong || undefined}
        onInput={dongBo}
        onBlur={dongBo}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
      <input type="hidden" name={name} value={giaTri} />
    </div>
  );
}
