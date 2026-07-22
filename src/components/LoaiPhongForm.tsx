"use client";

import { useState, useTransition } from "react";
import { taoLoaiPhong } from "@/app/dashboard/van-hanh/loai-phong/actions";
import styles from "./Form.module.css";

export default function LoaiPhongForm() {
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
      const result = await taoLoaiPhong(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(`Đã tạo loại phòng "${result.data.ten}"`);
        form.reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="ten" className={styles.label}>Tên loại phòng</label>
        <input id="ten" name="ten" type="text" required className={styles.input} disabled={isPending} placeholder="vd Phòng chuẩn, Phòng VIP" />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="don_gia_thue_gio" className={styles.label}>Đơn giá thuê / giờ (đ)</label>
          <input id="don_gia_thue_gio" name="don_gia_thue_gio" type="number" min={0} step={1000} required className={styles.input} disabled={isPending} />
        </div>
        <div className={styles.field}>
          <label htmlFor="don_gia_dien_nuoc_gio" className={styles.label}>Đơn giá điện nước / giờ (đ)</label>
          <input id="don_gia_dien_nuoc_gio" name="don_gia_dien_nuoc_gio" type="number" min={0} step={1000} required className={styles.input} disabled={isPending} />
        </div>
        <div className={styles.field}>
          <label htmlFor="don_gia_khau_hao_gio" className={styles.label}>Đơn giá khấu hao / giờ (đ, tuỳ chọn)</label>
          <input id="don_gia_khau_hao_gio" name="don_gia_khau_hao_gio" type="number" min={0} step={1000} className={styles.input} disabled={isPending} placeholder="0" />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="hieu_luc_tu" className={styles.label}>Hiệu lực từ</label>
          <input id="hieu_luc_tu" name="hieu_luc_tu" type="date" required className={styles.input} disabled={isPending} />
        </div>
        <div className={styles.field}>
          <label htmlFor="hieu_luc_den" className={styles.label}>Hiệu lực đến (tuỳ chọn)</label>
          <input id="hieu_luc_den" name="hieu_luc_den" type="date" className={styles.input} disabled={isPending} />
        </div>
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo loại phòng"}
      </button>
    </form>
  );
}
