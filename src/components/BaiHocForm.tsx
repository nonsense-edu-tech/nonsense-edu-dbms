"use client";

import { useState, useTransition } from "react";
import { taoBaiHoc } from "@/app/dashboard/hoc-lieu/bai-hoc/actions";
import { useToast } from "./ToastProvider";
import styles from "./Form.module.css";

type HocPhanOption = { id: string; ma: number; ten: string; mon_hoc_ten: string; cap_hoc_ten: string };

export default function BaiHocForm({ hocPhanList }: { hocPhanList: HocPhanOption[] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await taoBaiHoc(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Tạo bài học thất bại: ${result.error}` });
      } else {
        setSuccess(`Đã tạo bài học "${result.data.ten}"`);
        showToast({ type: "success", message: `Đã tạo bài học "${result.data.ten}" thành công.` });
        form.reset();
      }
    });
  }

  if (hocPhanList.length === 0) {
    return (
      <p className={styles.hint}>
        Chưa có học phần nào. Vào mục <strong>Học liệu → Học phần</strong> để tạo học phần trước.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="hoc_phan_id" className={styles.label}>Học phần</label>
          <select id="hoc_phan_id" name="hoc_phan_id" required className={styles.select} disabled={isPending} defaultValue="">
            <option value="" disabled>— Chọn học phần —</option>
            {hocPhanList.map((hp) => (
              <option key={hp.id} value={hp.id}>{hp.cap_hoc_ten} — {hp.mon_hoc_ten} — {hp.ten}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="ma" className={styles.label}>Mã bài học (1-99)</label>
          <input id="ma" name="ma" type="number" min={1} max={99} required className={styles.input} disabled={isPending} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="ten" className={styles.label}>Tên bài học</label>
        <input id="ten" name="ten" type="text" required className={styles.input} disabled={isPending} placeholder="vd Phương trình bậc hai" />
      </div>

      <div className={styles.field}>
        <label htmlFor="mo_ta" className={styles.label}>Mô tả (tuỳ chọn)</label>
        <textarea id="mo_ta" name="mo_ta" className={styles.textarea} disabled={isPending} rows={2} />
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo bài học"}
      </button>
    </form>
  );
}
