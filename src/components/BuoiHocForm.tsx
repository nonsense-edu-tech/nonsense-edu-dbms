"use client";

import { useMemo, useState, useTransition } from "react";
import { taoBuoiHoc } from "@/app/dashboard/van-hanh/buoi-hoc/actions";
import styles from "./Form.module.css";

export type LopOption = { id: number; nhan: string; cap_hoc_ma: number };
export type MonHocOption = { ma: number; cap_hoc_ma: number; ten: string };
export type GvOption = { id: string; ho_ten: string };
export type PhongHocOption = { id: number; ten: string };

export default function BuoiHocForm({
  lopList,
  monHocList,
  gvList,
  phongHocList,
  fixedGvId,
}: {
  lopList: LopOption[];
  monHocList: MonHocOption[];
  gvList: GvOption[];
  phongHocList: PhongHocOption[];
  fixedGvId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lopId, setLopId] = useState("");

  const capHocMaCuaLop = lopList.find((l) => String(l.id) === lopId)?.cap_hoc_ma;
  const monHocKhaDung = useMemo(
    () => monHocList.filter((m) => m.cap_hoc_ma === capHocMaCuaLop),
    [monHocList, capHocMaCuaLop]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    if (fixedGvId) formData.set("gv_id", fixedGvId);

    startTransition(async () => {
      const result = await taoBuoiHoc(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(`Đã tạo buổi học — ID ${result.data.id}`);
        form.reset();
        setLopId("");
      }
    });
  }

  if (lopList.length === 0) {
    return <p className={styles.hint}>Không có lớp nào trong phạm vi của bạn để tạo buổi học.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="lop_id" className={styles.label}>Lớp</label>
          <select
            id="lop_id"
            name="lop_id"
            required
            className={styles.select}
            disabled={isPending}
            value={lopId}
            onChange={(e) => setLopId(e.target.value)}
          >
            <option value="" disabled>— Chọn lớp —</option>
            {lopList.map((l) => (
              <option key={l.id} value={l.id}>{l.nhan}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="mon_hoc_ma" className={styles.label}>Môn học</label>
          <select id="mon_hoc_ma" name="mon_hoc_ma" required className={styles.select} disabled={isPending || !lopId} defaultValue="">
            <option value="" disabled>{lopId ? "— Chọn môn học —" : "— Chọn lớp trước —"}</option>
            {monHocKhaDung.map((m) => (
              <option key={m.ma} value={m.ma}>{m.ten}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="ngay" className={styles.label}>Ngày học</label>
          <input id="ngay" name="ngay" type="date" required className={styles.input} disabled={isPending} />
        </div>
      </div>

      <div className={styles.row}>
        {fixedGvId ? (
          <div className={styles.field}>
            <span className={styles.label}>Giáo viên</span>
            <p className={styles.hint}>Buổi học sẽ được gán cho chính bạn.</p>
          </div>
        ) : (
          <div className={styles.field}>
            <label htmlFor="gv_id" className={styles.label}>Giáo viên (tuỳ chọn)</label>
            <select id="gv_id" name="gv_id" className={styles.select} disabled={isPending} defaultValue="">
              <option value="">— Chưa gán —</option>
              {gvList.map((g) => (
                <option key={g.id} value={g.id}>{g.ho_ten}</option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.field}>
          <label htmlFor="phong_hoc_id" className={styles.label}>Phòng học (tuỳ chọn)</label>
          <select id="phong_hoc_id" name="phong_hoc_id" className={styles.select} disabled={isPending} defaultValue="">
            <option value="">— Chưa chọn —</option>
            {phongHocList.map((p) => (
              <option key={p.id} value={p.id}>{p.ten}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="gio_bat_dau" className={styles.label}>Giờ bắt đầu (tuỳ chọn)</label>
          <input id="gio_bat_dau" name="gio_bat_dau" type="time" className={styles.input} disabled={isPending} />
        </div>
        <div className={styles.field}>
          <label htmlFor="gio_ket_thuc" className={styles.label}>Giờ kết thúc (tuỳ chọn)</label>
          <input id="gio_ket_thuc" name="gio_ket_thuc" type="time" className={styles.input} disabled={isPending} />
        </div>
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo buổi học"}
      </button>
    </form>
  );
}
