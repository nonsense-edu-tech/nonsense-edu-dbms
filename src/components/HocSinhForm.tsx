"use client";

import { useState, useTransition } from "react";
import { taoHocSinh } from "@/app/dashboard/hoc-sinh/actions";
import { GIOI_TINH_LABEL, GIOI_TINH_OPTIONS, TINH_TRANG_DANG_KY_LABEL, TINH_TRANG_DANG_KY_OPTIONS } from "./hocSinhOptions";
import styles from "./Form.module.css";

type LopOption = { id: string; ma_lop: string; ten_lop: string | null };

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

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ngay_sinh" className={styles.label}>Ngày sinh (tuỳ chọn)</label>
          <input id="ngay_sinh" name="ngay_sinh" type="date" className={styles.input} disabled={isPending} />
        </div>
        <div className={styles.field}>
          <label htmlFor="gioi_tinh" className={styles.label}>Giới tính (tuỳ chọn)</label>
          <select id="gioi_tinh" name="gioi_tinh" className={styles.select} disabled={isPending} defaultValue="">
            <option value="">— Chưa chọn —</option>
            {GIOI_TINH_OPTIONS.map((g) => (
              <option key={g} value={g}>{GIOI_TINH_LABEL[g]}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="cccd" className={styles.label}>Số CCCD (tuỳ chọn)</label>
          <input id="cccd" name="cccd" type="text" className={styles.input} disabled={isPending} placeholder="0xxxxxxxxxxx" />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ten_phu_huynh" className={styles.label}>Tên phụ huynh (tuỳ chọn)</label>
          <input id="ten_phu_huynh" name="ten_phu_huynh" type="text" className={styles.input} disabled={isPending} />
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
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="sdt_hoc_sinh" className={styles.label}>SĐT học sinh (tuỳ chọn)</label>
          <input id="sdt_hoc_sinh" name="sdt_hoc_sinh" type="tel" className={styles.input} disabled={isPending} placeholder="09xxxxxxxx" />
        </div>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email học sinh (tuỳ chọn)</label>
          <input id="email" name="email" type="email" className={styles.input} disabled={isPending} placeholder="hocsinh@email.com" />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="dia_chi" className={styles.label}>Địa chỉ nhà ở (tuỳ chọn)</label>
        <input id="dia_chi" name="dia_chi" type="text" className={styles.input} disabled={isPending} />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Tình trạng đăng ký (tuỳ chọn, chọn được nhiều)</span>
        <div className={styles.checkGroup}>
          {TINH_TRANG_DANG_KY_OPTIONS.map((t) => (
            <label key={t} className={styles.checkItem}>
              <input type="checkbox" name="tinh_trang_dang_ky" value={t} disabled={isPending} />
              {TINH_TRANG_DANG_KY_LABEL[t]}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="truong_thpt" className={styles.label}>Trường THPT (tuỳ chọn)</label>
        <input id="truong_thpt" name="truong_thpt" type="text" className={styles.input} disabled={isPending} />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="khoi_thi" className={styles.label}>Khối thi (tuỳ chọn)</label>
          <input id="khoi_thi" name="khoi_thi" type="text" className={styles.input} disabled={isPending} placeholder="vd A00, D01" />
        </div>
        <div className={styles.field}>
          <label htmlFor="nv1" className={styles.label}>Nguyện vọng 1 (tuỳ chọn)</label>
          <input id="nv1" name="nv1" type="text" className={styles.input} disabled={isPending} />
        </div>
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo học sinh"}
      </button>
    </form>
  );
}
