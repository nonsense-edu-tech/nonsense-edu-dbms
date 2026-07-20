"use client";

import { useState, useTransition } from "react";
import { taoPhieuThu } from "@/app/dashboard/hoc-phi/thu-tien/actions";
import { HINH_THUC_THU_LABEL } from "./hocPhiOptions";
import { tienHienThi } from "@/lib/formatCurrency";
import styles from "./Form.module.css";

export type HopDongDangHoatDong = {
  id: number;
  ho_ten: string;
  ma_hoc_sinh: string;
  chuong_trinh_ten: string;
  con_phai_thu: number;
};

export default function PhieuThuForm({ hopDongList }: { hopDongList: HopDongDangHoatDong[] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hopDongId, setHopDongId] = useState("");

  const hopDongChon = hopDongList.find((h) => String(h.id) === hopDongId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (hopDongChon) {
      const confirmed = window.confirm(
        `Xác nhận thu học phí\n\nHọc sinh: ${hopDongChon.ho_ten} (${hopDongChon.ma_hoc_sinh})\n` +
          `Chương trình: ${hopDongChon.chuong_trinh_ten}\n` +
          `Số thực nhận: ${tienHienThi(Number(formData.get("so_tien")) || 0)}\n\n` +
          `Xác nhận lưu phiếu thu?`
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      const result = await taoPhieuThu(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(`Đã ghi phiếu thu — mã ${result.data.ma_phieu_thu}`);
        form.reset();
        setHopDongId("");
      }
    });
  }

  if (hopDongList.length === 0) {
    return <p className={styles.hint}>Chưa có hợp đồng nào đang hoạt động để thu tiền.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="hop_dong_id" className={styles.label}>Hợp đồng</label>
        <select
          id="hop_dong_id" name="hop_dong_id" required className={styles.select} disabled={isPending}
          value={hopDongId}
          onChange={(e) => setHopDongId(e.target.value)}
        >
          <option value="" disabled>— Chọn hợp đồng —</option>
          {hopDongList.map((h) => (
            <option key={h.id} value={h.id}>
              {h.ho_ten} ({h.ma_hoc_sinh}) — {h.chuong_trinh_ten} — còn phải thu {tienHienThi(h.con_phai_thu)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="so_tien" className={styles.label}>Số tiền thực nhận (VNĐ)</label>
          <input
            id="so_tien" name="so_tien" type="number" min="1" step="1000" required
            className={styles.input} disabled={isPending}
            defaultValue={hopDongChon ? String(Math.max(hopDongChon.con_phai_thu, 0)) : undefined}
            key={hopDongId}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="ngay_thu" className={styles.label}>Ngày nhận</label>
          <input
            id="ngay_thu" name="ngay_thu" type="date" required className={styles.input} disabled={isPending}
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="hinh_thuc" className={styles.label}>Hình thức</label>
          <select id="hinh_thuc" name="hinh_thuc" required className={styles.select} disabled={isPending} defaultValue="chuyen_khoan">
            {Object.entries(HINH_THUC_THU_LABEL).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="ghi_chu" className={styles.label}>Ghi chú (tuỳ chọn)</label>
        <input id="ghi_chu" name="ghi_chu" type="text" className={styles.input} disabled={isPending} />
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang lưu…" : "Ghi phiếu thu"}
      </button>
    </form>
  );
}
