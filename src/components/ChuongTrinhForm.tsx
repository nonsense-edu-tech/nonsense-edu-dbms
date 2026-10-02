"use client";

import { useState, useTransition } from "react";
import { taoChuongTrinh } from "@/app/dashboard/hoc-lieu/chuong-trinh/actions";
import { useToast } from "./ToastProvider";
import styles from "./Form.module.css";

export default function ChuongTrinhForm() {
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
      const result = await taoChuongTrinh(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Tạo chương trình thất bại: ${result.error}` });
      } else {
        setSuccess(`Đã tạo chương trình "${result.ten}"`);
        showToast({ type: "success", message: `Đã tạo chương trình "${result.ten}" thành công.` });
        form.reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ma" className={styles.label}>Mã chương trình (1-999, tự đệm thành 3 số)</label>
          <input id="ma" name="ma" type="number" min={1} max={999} required className={styles.input} disabled={isPending} />
        </div>
        <div className={styles.field}>
          <label htmlFor="ten" className={styles.label}>Tên chương trình</label>
          <input id="ten" name="ten" type="text" required className={styles.input} disabled={isPending} placeholder="vd V-ACT" />
        </div>
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo chương trình"}
      </button>
    </form>
  );
}
