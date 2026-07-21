"use client";

import { useRef, useState, useTransition } from "react";
import { taoPhieuThu } from "@/app/dashboard/hoc-phi/thu-tien/actions";
import { HINH_THUC_THU_LABEL } from "./hocPhiOptions";
import { tienHienThi } from "@/lib/formatCurrency";
import { nenAnhBienLai, dungLuongHienThi } from "@/lib/resizeImage";
import styles from "./Form.module.css";

export type HopDongDangHoatDong = {
  id: number;
  ho_ten: string;
  ma_hoc_sinh: string;
  chuong_trinh_ten: string;
  con_phai_thu: number;
};

const MIME_HOP_LE = ["image/jpeg", "image/png", "image/heic", "application/pdf"];
const DUNG_LUONG_GOC_TOI_DA = 20 * 1024 * 1024;
const SO_TEP_TOI_DA = 2;

type BienLaiDaChon = { file: File; dungLuongGoc: number; daNen: boolean };

export default function PhieuThuForm({
  hopDongList,
  nguoiDungHienTai,
}: {
  hopDongList: HopDongDangHoatDong[];
  nguoiDungHienTai: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hopDongId, setHopDongId] = useState("");
  const [bienLaiList, setBienLaiList] = useState<BienLaiDaChon[]>([]);
  const [dangNen, setDangNen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hopDongChon = hopDongList.find((h) => String(h.id) === hopDongId);

  async function handleChonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);

    const conCho = SO_TEP_TOI_DA - bienLaiList.length;
    if (conCho <= 0) {
      setError(`Chỉ được đính kèm tối đa ${SO_TEP_TOI_DA} file biên lai.`);
      return;
    }
    const chonDuoc = files.slice(0, conCho);
    if (files.length > conCho) {
      setError(`Chỉ được đính kèm tối đa ${SO_TEP_TOI_DA} file — đã lấy ${conCho} file đầu.`);
    }

    for (const f of chonDuoc) {
      if (!MIME_HOP_LE.includes(f.type)) {
        setError(`File "${f.name}" sai định dạng. Chỉ nhận jpg/png/heic/pdf.`);
        return;
      }
      if (f.size > DUNG_LUONG_GOC_TOI_DA) {
        setError(`File "${f.name}" quá lớn (>20MB).`);
        return;
      }
    }

    setDangNen(true);
    try {
      const ketQua: BienLaiDaChon[] = [];
      for (const f of chonDuoc) {
        const { file, daNen } = await nenAnhBienLai(f);
        ketQua.push({ file, dungLuongGoc: f.size, daNen });
      }
      setBienLaiList((cur) => [...cur, ...ketQua]);
    } finally {
      setDangNen(false);
    }
  }

  function xoaBienLai(index: number) {
    setBienLaiList((cur) => cur.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    for (const bienLai of bienLaiList) {
      formData.append("tep_dinh_kem", bienLai.file);
    }

    if (hopDongChon) {
      const confirmed = window.confirm(
        `Xác nhận thu học phí\n\nNgười thu: ${nguoiDungHienTai}\n` +
          `Học sinh: ${hopDongChon.ho_ten} (${hopDongChon.ma_hoc_sinh})\n` +
          `Chương trình: ${hopDongChon.chuong_trinh_ten}\n` +
          `Số thực nhận: ${tienHienThi(Number(formData.get("so_tien")) || 0)}\n` +
          `Biên lai đính kèm: ${bienLaiList.length > 0 ? bienLaiList.map((b) => b.file.name).join(", ") : "không có"}\n\n` +
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
        setBienLaiList([]);
      }
    });
  }

  if (hopDongList.length === 0) {
    return <p className={styles.hint}>Chưa có hợp đồng nào đang hoạt động để thu tiền.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label className={styles.label}>Người thu</label>
        <input type="text" className={styles.input} value={nguoiDungHienTai} disabled readOnly />
        <span className={styles.hint}>Tự động lấy theo tài khoản đang đăng nhập — không sửa được.</span>
      </div>

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

      <div className={styles.field}>
        <label htmlFor="tep_dinh_kem_input" className={styles.label}>
          Biên lai chuyển khoản (tối đa {SO_TEP_TOI_DA} file — jpg/png/heic/pdf, ảnh sẽ tự nén nhỏ lại)
        </label>
        <input
          id="tep_dinh_kem_input"
          type="file"
          accept="image/jpeg,image/png,image/heic,application/pdf"
          multiple
          ref={fileInputRef}
          onChange={handleChonFile}
          className={styles.input}
          disabled={isPending || dangNen || bienLaiList.length >= SO_TEP_TOI_DA}
        />
        {dangNen && <span className={styles.hint}>Đang nén ảnh…</span>}
        {bienLaiList.length > 0 && (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {bienLaiList.map((b, i) => (
              <li key={i} className={styles.hint} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                📎 {b.file.name} — {dungLuongHienThi(b.file.size)}
                {b.daNen && ` (đã nén từ ${dungLuongHienThi(b.dungLuongGoc)})`}
                <button
                  type="button"
                  onClick={() => xoaBienLai(i)}
                  disabled={isPending}
                  style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer" }}
                >
                  Bỏ
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {success && <div className={styles.successBox} role="status">{success}</div>}

      <button type="submit" className={styles.btnPrimary} disabled={isPending || dangNen}>
        {isPending ? "Đang lưu…" : "Ghi phiếu thu"}
      </button>
    </form>
  );
}
