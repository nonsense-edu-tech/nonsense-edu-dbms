"use client";

import { useMemo, useState, useTransition } from "react";
import { taoHocPhan } from "@/app/dashboard/hoc-lieu/hoc-phan/actions";
import { useToast } from "./ToastProvider";
import styles from "./Form.module.css";

type MonHocOption = { id: string; ma: number; cap_hoc_ma: number; ten: string; cap_hoc_ten: string };

export default function HocPhanForm({ monHocList }: { monHocList: MonHocOption[] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [monHocId, setMonHocId] = useState("");
  const showToast = useToast();

  const monHocChon = useMemo(
    () => monHocList.find((m) => m.id === monHocId) ?? null,
    [monHocList, monHocId]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await taoHocPhan(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Tạo học phần thất bại: ${result.error}` });
      } else {
        setSuccess(`Đã tạo học phần "${result.data.ten}"`);
        showToast({ type: "success", message: `Đã tạo học phần "${result.data.ten}" thành công.` });
        form.reset();
        setMonHocId("");
      }
    });
  }

  if (monHocList.length === 0) {
    return (
      <p className={styles.hint}>
        Chưa có môn học nào. Vào mục <strong>Vận hành → Chương trình - Môn học</strong> để tạo môn học trước.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="mon_hoc_id" className={styles.label}>Môn học</label>
          <select
            id="mon_hoc_id"
            name="mon_hoc_id"
            required
            className={styles.select}
            disabled={isPending}
            value={monHocId}
            onChange={(e) => setMonHocId(e.target.value)}
          >
            <option value="" disabled>— Chọn môn học —</option>
            {monHocList.map((m) => (
              <option key={m.id} value={m.id}>{m.cap_hoc_ten} — {m.ten}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="ma" className={styles.label}>Mã học phần (1-99)</label>
          <input id="ma" name="ma" type="number" min={1} max={99} required className={styles.input} disabled={isPending} />
        </div>
      </div>

      <input type="hidden" name="cap_hoc_ma" value={monHocChon?.cap_hoc_ma ?? ""} />
      <input type="hidden" name="mon_hoc_ma" value={monHocChon?.ma ?? ""} />

      <div className={styles.field}>
        <label htmlFor="ten" className={styles.label}>Tên học phần</label>
        <input id="ten" name="ten" type="text" required className={styles.input} disabled={isPending} placeholder="vd Đại số" />
      </div>

      <div className={styles.field}>
        <label htmlFor="mo_ta" className={styles.label}>Mô tả (tuỳ chọn)</label>
        <textarea id="mo_ta" name="mo_ta" className={styles.textarea} disabled={isPending} rows={2} />
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo học phần"}
      </button>
    </form>
  );
}
