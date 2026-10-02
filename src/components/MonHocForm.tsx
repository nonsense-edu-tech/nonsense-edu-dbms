"use client";

import { useState, useTransition } from "react";
import { taoMonHoc } from "@/app/dashboard/hoc-lieu/mon-hoc/actions";
import { useToast } from "./ToastProvider";
import styles from "./Form.module.css";

type CapHocOption = { ma: number; ten: string };

export default function MonHocForm({ capHocList }: { capHocList: CapHocOption[] }) {
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
      const result = await taoMonHoc(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Tạo môn học thất bại: ${result.error}` });
      } else {
        setSuccess(`Đã tạo môn học "${result.ten}"`);
        showToast({ type: "success", message: `Đã tạo môn học "${result.ten}" thành công.` });
        form.reset();
      }
    });
  }

  if (capHocList.length === 0) {
    return (
      <p className={styles.hint}>
        Chưa có cấp học nào. Vào tab <strong>Cấp học</strong> để tạo cấp học trước.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="cap_hoc_ma" className={styles.label}>Cấp học</label>
          <select id="cap_hoc_ma" name="cap_hoc_ma" required defaultValue="" className={styles.select} disabled={isPending}>
            <option value="" disabled>— Chọn cấp học —</option>
            {capHocList.map((c) => (
              <option key={c.ma} value={c.ma}>{c.ten}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="ma" className={styles.label}>Mã môn học (1-99)</label>
          <input id="ma" name="ma" type="number" min={1} max={99} required className={styles.input} disabled={isPending} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="ten" className={styles.label}>Tên môn học</label>
        <input id="ten" name="ten" type="text" required className={styles.input} disabled={isPending} placeholder="vd Toán" />
      </div>

      <div className={styles.field}>
        <label htmlFor="mo_ta" className={styles.label}>Mô tả (tuỳ chọn)</label>
        <textarea id="mo_ta" name="mo_ta" className={styles.textarea} disabled={isPending} rows={2} />
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo môn học"}
      </button>
    </form>
  );
}
