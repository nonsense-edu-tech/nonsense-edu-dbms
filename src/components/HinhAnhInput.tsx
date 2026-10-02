"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

export type HinhAnhCu = { id: string; url: string };

const MIME_CHO_PHEP = ["image/jpeg", "image/png", "image/webp"];
const TOI_DA_BYTE = 2 * 1024 * 1024;

// Ô đính kèm ảnh cho 1 vị trí (đề / lời giải / 1 lựa chọn). Các file chọn được gắn
// thẳng vào <input type="file" name={ten}> nên đi theo FormData của form chứa nó;
// ảnh cũ giữ lại gửi qua input ẩn `giu_${ten}` (xem hinh-anh.ts ở server).
export default function HinhAnhInput({
  ten,
  nhan,
  toiDa,
  disabled,
  anhCu,
  onLoi,
}: {
  ten: string;
  nhan: string;
  toiDa: number;
  disabled: boolean;
  anhCu?: HinhAnhCu[];
  onLoi?: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tep, setTep] = useState<File[]>([]);
  const [cu, setCu] = useState<HinhAnhCu[]>(anhCu ?? []);
  const [loi, setLoi] = useState<string | null>(null);

  const xemTruoc = useMemo(() => tep.map((f) => URL.createObjectURL(f)), [tep]);
  useEffect(() => () => xemTruoc.forEach((u) => URL.revokeObjectURL(u)), [xemTruoc]);

  function dongBoInput(danhSach: File[]) {
    const dt = new DataTransfer();
    danhSach.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
  }

  function baoLoi(msg: string | null) {
    setLoi(msg);
    if (msg) onLoi?.(msg);
  }

  function handleChon(e: React.ChangeEvent<HTMLInputElement>) {
    const chon = Array.from(e.target.files ?? []);
    const hopLe: File[] = [];
    let thongBao: string | null = null;
    for (const f of chon) {
      if (!MIME_CHO_PHEP.includes(f.type)) thongBao = `"${f.name}" không đúng định dạng — chỉ nhận JPG, PNG, WebP.`;
      else if (f.size > TOI_DA_BYTE) thongBao = `"${f.name}" vượt quá 2MB.`;
      else hopLe.push(f);
    }
    // Gộp với ảnh đã chọn trước đó (input chỉ giữ lần chọn gần nhất).
    const gop = [...tep, ...hopLe];
    if (cu.length + gop.length > toiDa) {
      thongBao = `Tối đa ${toiDa} ảnh cho ${nhan}.`;
      gop.splice(Math.max(0, toiDa - cu.length));
    }
    setTep(gop);
    dongBoInput(gop);
    baoLoi(thongBao);
  }

  function xoaMoi(idx: number) {
    const con = tep.filter((_, i) => i !== idx);
    setTep(con);
    dongBoInput(con);
    baoLoi(null);
  }

  const daDay = cu.length + tep.length >= toiDa;

  return (
    <div className={styles.hinhAnhBox}>
      <div className={styles.hinhAnhLuoi}>
        {cu.map((a) => (
          <div key={a.id} className={styles.hinhAnhOCu}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.url} alt={nhan} className={styles.hinhAnhThumb} />
            <input type="hidden" name={`giu_${ten}`} value={a.id} />
            <button
              type="button"
              className={styles.hinhAnhXoa}
              onClick={() => setCu((ds) => ds.filter((x) => x.id !== a.id))}
              disabled={disabled}
              aria-label="Xoá ảnh"
            >
              ✕
            </button>
          </div>
        ))}
        {tep.map((f, i) => (
          <div key={`${f.name}-${i}`} className={styles.hinhAnhOCu}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={xemTruoc[i]} alt={f.name} className={styles.hinhAnhThumb} />
            <button
              type="button"
              className={styles.hinhAnhXoa}
              onClick={() => xoaMoi(i)}
              disabled={disabled}
              aria-label="Bỏ ảnh"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={ten}
        accept={MIME_CHO_PHEP.join(",")}
        multiple={toiDa > 1}
        onChange={handleChon}
        disabled={disabled || daDay}
        className={styles.fileInput}
        aria-label={`Thêm ảnh cho ${nhan}`}
      />
      {loi && <p className={styles.ghiChuLoi}>{loi}</p>}
    </div>
  );
}
