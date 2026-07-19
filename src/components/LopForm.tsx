"use client";

import { useState, useTransition } from "react";
import { taoLop } from "@/app/dashboard/lop/actions";
import styles from "./Form.module.css";

export default function LopForm() {
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
      const result = await taoLop(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(`Đã tạo lớp — ID: ${result.data.ma_lop}`);
        form.reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="cap_hoc" className={styles.label}>Cấp học (1 số)</label>
          <input
            id="cap_hoc"
            name="cap_hoc"
            type="number"
            min={1}
            max={9}
            required
            className={styles.input}
            disabled={isPending}
            placeholder="vd 3"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="chuong_trinh" className={styles.label}>Chương trình (3 số)</label>
          <input
            id="chuong_trinh"
            name="chuong_trinh"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{3}"
            maxLength={3}
            required
            className={styles.input}
            disabled={isPending}
            placeholder="vd 012"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="nam_hoc" className={styles.label}>Năm học (2 số)</label>
          <input
            id="nam_hoc"
            name="nam_hoc"
            type="number"
            min={0}
            max={99}
            required
            className={styles.input}
            disabled={isPending}
            placeholder="vd 25"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="ten_lop" className={styles.label}>Tên lớp (tuỳ chọn)</label>
        <input
          id="ten_lop"
          name="ten_lop"
          type="text"
          className={styles.input}
          disabled={isPending}
          placeholder="vd V-ACT 12A1"
        />
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo lớp"}
      </button>
    </form>
  );
}
