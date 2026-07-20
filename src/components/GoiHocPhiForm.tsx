"use client";

import { useState, useTransition } from "react";
import { taoGoiHocPhi } from "@/app/dashboard/hoc-phi/goi/actions";
import { HINH_THUC_DONG_LABEL, HINH_THUC_DONG_OPTIONS } from "./hocPhiOptions";
import styles from "./Form.module.css";

type MaTen = { ma: string; ten: string };

export default function GoiHocPhiForm({ chuongTrinhList }: { chuongTrinhList: MaTen[] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await taoGoiHocPhi(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess("Đã tạo gói học phí.");
        form.reset();
      }
    });
  }

  if (chuongTrinhList.length === 0) {
    return <p className={styles.hint}>Chưa có dữ liệu bảng mã <strong>chương trình</strong>.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="chuong_trinh_ma" className={styles.label}>Chương trình</label>
          <select id="chuong_trinh_ma" name="chuong_trinh_ma" required className={styles.select} disabled={isPending} defaultValue="">
            <option value="" disabled>— Chọn chương trình —</option>
            {chuongTrinhList.map((c) => (
              <option key={c.ma} value={c.ma}>{c.ten}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="hinh_thuc_dong" className={styles.label}>Hình thức đóng</label>
          <select id="hinh_thuc_dong" name="hinh_thuc_dong" required className={styles.select} disabled={isPending} defaultValue="">
            <option value="" disabled>— Chọn hình thức —</option>
            {HINH_THUC_DONG_OPTIONS.map((h) => (
              <option key={h} value={h}>{HINH_THUC_DONG_LABEL[h]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="ten" className={styles.label}>Tên gói</label>
        <input id="ten" name="ten" type="text" required className={styles.input} disabled={isPending} placeholder="vd V-ACT trọn khoá 2026" />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="gia_niem_yet" className={styles.label}>Giá niêm yết (VNĐ)</label>
          <input id="gia_niem_yet" name="gia_niem_yet" type="number" min="0" step="1000" required className={styles.input} disabled={isPending} placeholder="vd 12000000" />
        </div>
        <div className={styles.field}>
          <label htmlFor="hieu_luc_tu" className={styles.label}>Hiệu lực từ (tuỳ chọn, mặc định hôm nay)</label>
          <input id="hieu_luc_tu" name="hieu_luc_tu" type="date" className={styles.input} disabled={isPending} />
        </div>
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo gói học phí"}
      </button>
    </form>
  );
}
