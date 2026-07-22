"use client";

import { useState, useTransition } from "react";
import { taoChiNhanh } from "@/app/dashboard/chi-nhanh/actions";
import styles from "./Form.module.css";

export default function ChiNhanhForm() {
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
      const result = await taoChiNhanh(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(`Đã tạo chi nhánh — ${result.data.ma}`);
        form.reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ma" className={styles.label}>Mã chi nhánh</label>
          <input
            id="ma"
            name="ma"
            type="text"
            required
            className={styles.input}
            disabled={isPending}
            placeholder="vd Q1, TD, HCM-01"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="ten" className={styles.label}>Tên chi nhánh</label>
          <input
            id="ten"
            name="ten"
            type="text"
            required
            className={styles.input}
            disabled={isPending}
            placeholder="vd Chi nhánh Quận 1"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="dia_chi" className={styles.label}>Địa chỉ (tuỳ chọn)</label>
        <input
          id="dia_chi"
          name="dia_chi"
          type="text"
          className={styles.input}
          disabled={isPending}
          placeholder="vd 123 Nguyễn Huệ, Q1, TP.HCM"
        />
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo chi nhánh"}
      </button>
    </form>
  );
}
