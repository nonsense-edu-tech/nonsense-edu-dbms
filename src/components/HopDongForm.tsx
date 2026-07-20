"use client";

import { useMemo, useState, useTransition } from "react";
import { taoHopDong } from "@/app/dashboard/hoc-phi/hop-dong/actions";
import { LOAI_GIAM_GIA_LABEL, tinhDoanhThuThuan } from "./hocPhiOptions";
import { tienHienThi } from "@/lib/formatCurrency";
import styles from "./Form.module.css";

export type GhiDanhOption = {
  id: number;
  ho_ten: string;
  ma_hoc_sinh: string;
  ten_lop: string | null;
  chuong_trinh_ma: string;
  chuong_trinh_ten: string;
};

export type GoiOption = {
  id: number;
  ten: string;
  chuong_trinh_ma: string;
  gia_niem_yet: number;
};

export default function HopDongForm({
  ghiDanhList,
  goiList,
}: {
  ghiDanhList: GhiDanhOption[];
  goiList: GoiOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [ghiDanhId, setGhiDanhId] = useState("");
  const [goiId, setGoiId] = useState("");
  const [loaiGiamGia, setLoaiGiamGia] = useState("khong");
  const [giaTriGiamGia, setGiaTriGiamGia] = useState("0");

  const ghiDanhChon = ghiDanhList.find((g) => String(g.id) === ghiDanhId);
  const goiKhaDung = useMemo(
    () => (ghiDanhChon ? goiList.filter((g) => g.chuong_trinh_ma === ghiDanhChon.chuong_trinh_ma) : []),
    [ghiDanhChon, goiList]
  );
  const goiChon = goiKhaDung.find((g) => String(g.id) === goiId);

  const xemTruoc = goiChon
    ? tinhDoanhThuThuan(goiChon.gia_niem_yet, loaiGiamGia, Number(giaTriGiamGia) || 0)
    : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await taoHopDong(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess("Đã tạo hợp đồng (trạng thái nháp).");
        form.reset();
        setGhiDanhId("");
        setGoiId("");
        setLoaiGiamGia("khong");
        setGiaTriGiamGia("0");
      }
    });
  }

  if (ghiDanhList.length === 0) {
    return (
      <p className={styles.hint}>
        Không còn lượt ghi danh nào chưa có hợp đồng học phí (hoặc chưa có ghi danh nào). Tạo ghi danh ở trang{" "}
        <strong>Học sinh</strong> trước.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="ghi_danh_id" className={styles.label}>Học sinh — lượt ghi danh</label>
        <select
          id="ghi_danh_id" name="ghi_danh_id" required className={styles.select} disabled={isPending}
          value={ghiDanhId}
          onChange={(e) => {
            setGhiDanhId(e.target.value);
            setGoiId("");
          }}
        >
          <option value="" disabled>— Chọn học sinh —</option>
          {ghiDanhList.map((g) => (
            <option key={g.id} value={g.id}>
              {g.ho_ten} ({g.ma_hoc_sinh}) — {g.ten_lop ?? "?"} — {g.chuong_trinh_ten}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="goi_hoc_phi_id" className={styles.label}>Gói học phí</label>
        <select
          id="goi_hoc_phi_id" name="goi_hoc_phi_id" required className={styles.select}
          disabled={isPending || !ghiDanhChon}
          value={goiId}
          onChange={(e) => setGoiId(e.target.value)}
        >
          <option value="" disabled>{ghiDanhChon ? "— Chọn gói học phí —" : "— Chọn học sinh trước —"}</option>
          {goiKhaDung.map((g) => (
            <option key={g.id} value={g.id}>{g.ten} — {tienHienThi(g.gia_niem_yet)}</option>
          ))}
        </select>
        {ghiDanhChon && goiKhaDung.length === 0 && (
          <span className={styles.hint}>Chương trình &quot;{ghiDanhChon.chuong_trinh_ten}&quot; chưa có gói học phí đang áp dụng.</span>
        )}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="loai_giam_gia" className={styles.label}>Giảm giá</label>
          <select
            id="loai_giam_gia" name="loai_giam_gia" className={styles.select} disabled={isPending}
            value={loaiGiamGia}
            onChange={(e) => setLoaiGiamGia(e.target.value)}
          >
            {Object.entries(LOAI_GIAM_GIA_LABEL).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
        {loaiGiamGia !== "khong" && (
          <div className={styles.field}>
            <label htmlFor="gia_tri_giam_gia" className={styles.label}>
              {loaiGiamGia === "phan_tram" ? "Phần trăm giảm (%)" : "Số tiền giảm (VNĐ)"}
            </label>
            <input
              id="gia_tri_giam_gia" name="gia_tri_giam_gia" type="number" min="0"
              max={loaiGiamGia === "phan_tram" ? 100 : undefined}
              className={styles.input} disabled={isPending}
              value={giaTriGiamGia}
              onChange={(e) => setGiaTriGiamGia(e.target.value)}
            />
          </div>
        )}
      </div>

      {goiChon && xemTruoc && (
        <div className={styles.hint} style={{ lineHeight: 1.8 }}>
          Giá niêm yết: <strong>{tienHienThi(goiChon.gia_niem_yet)}</strong>
          {" · "}Giảm: <strong>{tienHienThi(xemTruoc.soTienGiam)}</strong>
          {" · "}Doanh thu thuần: <strong>{tienHienThi(xemTruoc.doanhThuThuan)}</strong>
        </div>
      )}

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo hợp đồng (nháp)"}
      </button>
    </form>
  );
}
