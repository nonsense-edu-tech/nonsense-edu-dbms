"use client";

import { useMemo, useState, useTransition } from "react";
import { ganMonVaoChuongTrinh } from "@/app/dashboard/hoc-lieu/chuong-trinh/actions";
import { useToast } from "./ToastProvider";
import styles from "./Form.module.css";

type ChuongTrinh = { ma: string; ten: string };
type CapHoc = { ma: number; ten: string };
type MonHoc = { ma: number; cap_hoc_ma: number; ten: string };

export default function ChuongTrinhMonHocForm({
  chuongTrinhList,
  capHocList,
  monHocList,
}: {
  chuongTrinhList: ChuongTrinh[];
  capHocList: CapHoc[];
  monHocList: MonHoc[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [capHocMa, setCapHocMa] = useState("");
  const showToast = useToast();

  const monHocKhaDung = useMemo(
    () => monHocList.filter((m) => String(m.cap_hoc_ma) === capHocMa),
    [monHocList, capHocMa]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await ganMonVaoChuongTrinh(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Gán môn học thất bại: ${result.error}` });
      } else {
        setSuccess("Đã gán môn học vào chương trình.");
        showToast({ type: "success", message: "Đã gán môn học vào chương trình thành công." });
        form.reset();
        setCapHocMa("");
      }
    });
  }

  if (chuongTrinhList.length === 0 || capHocList.length === 0 || monHocList.length === 0) {
    return (
      <p className={styles.hint}>
        Cần có dữ liệu <strong>chương trình</strong>, <strong>cấp học</strong>, <strong>môn học</strong> trước (tạo ở các tab Chương trình / Cấp học / Môn học).
      </p>
    );
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
          <label htmlFor="cap_hoc_ma" className={styles.label}>Cấp học</label>
          <select
            id="cap_hoc_ma"
            name="cap_hoc_ma"
            required
            className={styles.select}
            disabled={isPending}
            value={capHocMa}
            onChange={(e) => setCapHocMa(e.target.value)}
          >
            <option value="" disabled>— Chọn cấp học —</option>
            {capHocList.map((c) => (
              <option key={c.ma} value={c.ma}>{c.ten}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="mon_hoc_ma" className={styles.label}>Môn học</label>
          <select id="mon_hoc_ma" name="mon_hoc_ma" required className={styles.select} disabled={isPending || !capHocMa} defaultValue="">
            <option value="" disabled>{capHocMa ? "— Chọn môn học —" : "— Chọn cấp học trước —"}</option>
            {monHocKhaDung.map((m) => (
              <option key={m.ma} value={m.ma}>{m.ten}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang gán…" : "Gán vào chương trình"}
      </button>
    </form>
  );
}
