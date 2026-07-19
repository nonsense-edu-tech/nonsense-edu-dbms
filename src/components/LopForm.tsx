"use client";

import { useState, useTransition } from "react";
import { taoLop } from "@/app/dashboard/lop/actions";
import { TINH_TRANG_LOP_LABEL, TINH_TRANG_LOP_OPTIONS, danhSachNienKhoa } from "./lopOptions";
import styles from "./Form.module.css";

type MaTen = { ma: string | number; ten: string };

export default function LopForm({
  capHocList,
  chuongTrinhList,
}: {
  capHocList: MaTen[];
  chuongTrinhList: MaTen[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nienKhoaOptions = danhSachNienKhoa();

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

  if (capHocList.length === 0 || chuongTrinhList.length === 0) {
    return (
      <p className={styles.hint}>
        Chưa có dữ liệu bảng mã <strong>cấp học</strong> hoặc <strong>chương trình</strong>.
        Vào Supabase SQL Editor thêm trước, vd:
        <br />
        <code>insert into cap_hoc (ma, ten) values (3, &apos;THPT&apos;);</code>
        <br />
        <code>insert into chuong_trinh (ma, ten) values (&apos;012&apos;, &apos;V-ACT&apos;);</code>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="cap_hoc" className={styles.label}>Cấp học</label>
          <select
            id="cap_hoc"
            name="cap_hoc"
            required
            className={styles.select}
            disabled={isPending}
            defaultValue=""
          >
            <option value="" disabled>— Chọn cấp học —</option>
            {capHocList.map((c) => (
              <option key={c.ma} value={c.ma}>{c.ten}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="chuong_trinh" className={styles.label}>Chương trình</label>
          <select
            id="chuong_trinh"
            name="chuong_trinh"
            required
            className={styles.select}
            disabled={isPending}
            defaultValue=""
          >
            <option value="" disabled>— Chọn chương trình —</option>
            {chuongTrinhList.map((c) => (
              <option key={c.ma} value={c.ma}>{c.ten}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="nam_hoc" className={styles.label}>Niên khoá</label>
          <select id="nam_hoc" name="nam_hoc" required className={styles.select} disabled={isPending} defaultValue="">
            <option value="" disabled>— Chọn niên khoá —</option>
            {nienKhoaOptions.map((nk) => (
              <option key={nk.value} value={nk.value}>{nk.label}</option>
            ))}
          </select>
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

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ngay_khai_giang" className={styles.label}>Ngày khai giảng (tuỳ chọn)</label>
          <input id="ngay_khai_giang" name="ngay_khai_giang" type="date" className={styles.input} disabled={isPending} />
        </div>
        <div className={styles.field}>
          <label htmlFor="ngay_ket_thuc" className={styles.label}>Ngày kết thúc (tuỳ chọn)</label>
          <input id="ngay_ket_thuc" name="ngay_ket_thuc" type="date" className={styles.input} disabled={isPending} />
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Tình trạng (tuỳ chọn, chọn được nhiều)</span>
        <div className={styles.checkGroup}>
          {TINH_TRANG_LOP_OPTIONS.map((t) => (
            <label key={t} className={styles.checkItem}>
              <input type="checkbox" name="tinh_trang" value={t} disabled={isPending} />
              {TINH_TRANG_LOP_LABEL[t]}
            </label>
          ))}
        </div>
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo lớp"}
      </button>
    </form>
  );
}
