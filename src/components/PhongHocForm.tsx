"use client";

import { useState, useTransition } from "react";
import { taoPhongHoc } from "@/app/dashboard/van-hanh/phong-hoc/actions";
import styles from "./Form.module.css";

type MaTen = { ma: string | number; ten: string };

export default function PhongHocForm({
  chiNhanhList,
  loaiPhongList,
}: {
  chiNhanhList: MaTen[];
  loaiPhongList: MaTen[];
}) {
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
      const result = await taoPhongHoc(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(`Đã tạo phòng "${result.data.ten}"`);
        form.reset();
      }
    });
  }

  if (chiNhanhList.length === 0 || loaiPhongList.length === 0) {
    return (
      <p className={styles.hint}>
        Cần có ít nhất 1 <strong>chi nhánh</strong> và 1 <strong>loại phòng</strong> trước khi tạo phòng học. Vào{" "}
        trang Chi nhánh / Loại phòng để thêm.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ten" className={styles.label}>Tên phòng</label>
          <input id="ten" name="ten" type="text" required className={styles.input} disabled={isPending} placeholder="vd Phòng 301" />
        </div>
        <div className={styles.field}>
          <label htmlFor="chi_nhanh_id" className={styles.label}>Chi nhánh</label>
          <select id="chi_nhanh_id" name="chi_nhanh_id" required className={styles.select} disabled={isPending} defaultValue="">
            <option value="" disabled>— Chọn chi nhánh —</option>
            {chiNhanhList.map((c) => (
              <option key={c.ma} value={c.ma}>{c.ten}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="loai_phong_id" className={styles.label}>Loại phòng</label>
          <select id="loai_phong_id" name="loai_phong_id" required className={styles.select} disabled={isPending} defaultValue="">
            <option value="" disabled>— Chọn loại phòng —</option>
            {loaiPhongList.map((l) => (
              <option key={l.ma} value={l.ma}>{l.ten}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo phòng học"}
      </button>
    </form>
  );
}
