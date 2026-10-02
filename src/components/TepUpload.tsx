"use client";

import { useId, useState, type RefObject } from "react";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

function dinhDangDungLuong(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(0)} KB`;
  return `${(byte / 1024 / 1024).toFixed(1)} MB`;
}

// Ô tải file trực quan: bấm hoặc kéo-thả file vào khung (thay cho nút "Choose File" mặc
// định của trình duyệt). Vẫn dùng <input type="file"> thật (ẩn) để cha đọc qua `inputRef`.
export default function TepUpload({
  inputRef,
  accept,
  tieuDe,
  moTa,
  disabled,
  tuyChon,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  accept: string; // vd ".xlsx,.csv"
  tieuDe: string;
  moTa: string;
  disabled?: boolean;
  tuyChon?: boolean;
}) {
  const [tep, setTep] = useState<File | null>(null);
  const [keoVao, setKeoVao] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const inputId = useId();

  const duoiHopLe = accept.split(",").map((d) => d.trim().toLowerCase());

  function datTep(f: File | null) {
    setLoi(null);
    if (f) {
      const duoi = "." + (f.name.split(".").pop() ?? "").toLowerCase();
      if (!duoiHopLe.includes(duoi)) {
        setLoi(`File "${f.name}" không đúng định dạng — chỉ nhận ${accept.replace(/,/g, ", ")}.`);
        if (inputRef.current) inputRef.current.value = "";
        setTep(null);
        return;
      }
    }
    setTep(f);
  }

  function handleChon(e: React.ChangeEvent<HTMLInputElement>) {
    datTep(e.target.files?.[0] ?? null);
  }

  function handleTha(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setKeoVao(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (!f || !inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    inputRef.current.files = dt.files;
    datTep(f);
  }

  function handleBo() {
    if (inputRef.current) inputRef.current.value = "";
    datTep(null);
  }

  return (
    <div className={styles.tepUploadWrap}>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChon}
        disabled={disabled}
        className={styles.tepUploadInput}
      />
      {tep ? (
        <div className={styles.tepUploadDaChon}>
          <span aria-hidden="true">📄</span>
          <span className={styles.tepUploadTen}>{tep.name}</span>
          <span className={styles.tepUploadDungLuong}>{dinhDangDungLuong(tep.size)}</span>
          <label htmlFor={inputId} className={styles.tepUploadDoi}>Đổi file</label>
          <button type="button" className={styles.tepUploadBo} onClick={handleBo} disabled={disabled} aria-label="Bỏ file đã chọn">
            ✕
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`${styles.tepUploadKhung} ${keoVao ? styles.tepUploadKeoVao : ""} ${disabled ? styles.tepUploadTat : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setKeoVao(true);
          }}
          onDragLeave={() => setKeoVao(false)}
          onDrop={handleTha}
        >
          <span className={styles.tepUploadIcon} aria-hidden="true">⬆</span>
          <span className={styles.tepUploadTieuDe}>
            {tieuDe}
            {tuyChon && <em> (tuỳ chọn)</em>}
          </span>
          <span className={styles.tepUploadMoTa}>{moTa}</span>
        </label>
      )}
      {loi && <p className={styles.ghiChuLoi}>{loi}</p>}
    </div>
  );
}
