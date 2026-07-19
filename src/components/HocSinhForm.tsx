"use client";

import { useState, useTransition } from "react";
import { taoHocSinh } from "@/app/dashboard/hoc-sinh/actions";
import styles from "./Form.module.css";

type LopOption = { id: number; ma_lop: string; ten_lop: string | null };

export default function HocSinhForm({ lopList }: { lopList: LopOption[] }) {
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
      const result = await taoHocSinh(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(`Đã tạo học sinh "${result.data.ho_ten}" — ID: ${result.data.ma_hoc_sinh}`);
        form.reset();
      }
    });
  }

  if (lopList.length === 0) {
    return (
      <p className={styles.hint}>
        Chưa có lớp nào. Vào mục <strong>Lớp học</strong> để tạo lớp trước khi tạo học sinh.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="lop_id" className={styles.label}>Lớp</label>
        <select
          id="lop_id"
          name="lop_id"
          required
          className={styles.select}
          disabled={isPending}
          defaultValue=""
        >
          <option value="" disabled>— Chọn lớp —</option>
          {lopList.map((lop) => (
            <option key={lop.id} value={lop.id}>
              {lop.ma_lop}
              {lop.ten_lop ? ` — ${lop.ten_lop}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="ho_ten" className={styles.label}>Họ tên học sinh</label>
        <input
          id="ho_ten"
          name="ho_ten"
          type="text"
          required
          className={styles.input}
          disabled={isPending}
          placeholder="Nguyễn Văn A"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="sdt_phu_huynh" className={styles.label}>SĐT phụ huynh (tuỳ chọn)</label>
        <input
          id="sdt_phu_huynh"
          name="sdt_phu_huynh"
          type="tel"
          className={styles.input}
          disabled={isPending}
          placeholder="09xxxxxxxx"
        />
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo học sinh"}
      </button>
    </form>
  );
}
