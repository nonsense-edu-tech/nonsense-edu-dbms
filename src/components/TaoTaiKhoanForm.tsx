"use client";

import { useState, useTransition } from "react";
import { taoTaiKhoan } from "@/app/dashboard/users/actions";
import { useToast } from "./ToastProvider";
import styles from "./Form.module.css";

const VAI_TRO_LABEL: Record<string, string> = {
  master_admin: "Master Admin",
  admin_ts: "Admin Tuyển sinh",
  admin_ht: "Admin Hiệu trưởng",
  truong_bm: "Trưởng bộ môn",
  gv: "Giáo viên",
  tro_giang: "Trợ giảng",
  ke_toan: "Kế toán",
  thu_ngan: "Thu ngân",
  quan_ly_chi_nhanh: "Quản lý chi nhánh",
};

const VAI_TRO_MASTER_ADMIN_OPTIONS = Object.keys(VAI_TRO_LABEL);
const VAI_TRO_ADMIN_HT_OPTIONS = ["gv", "tro_giang"];

export type ChiNhanhOption = { id: string; ten: string };

export default function TaoTaiKhoanForm({
  vaiTroNguoiGoi,
  chiNhanhOptions,
}: {
  vaiTroNguoiGoi: "master_admin" | "admin_ht";
  chiNhanhOptions: ChiNhanhOption[];
}) {
  const isMasterAdmin = vaiTroNguoiGoi === "master_admin";
  const vaiTroOptions = isMasterAdmin ? VAI_TRO_MASTER_ADMIN_OPTIONS : VAI_TRO_ADMIN_HT_OPTIONS;

  const [vaiTro, setVaiTro] = useState(vaiTroOptions[0]);
  const [error, setError] = useState<string | null>(null);
  const [ketQua, setKetQua] = useState<{ email: string; matKhau: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  const canTaoMasterAdmin = isMasterAdmin && vaiTro === "master_admin";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setKetQua(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await taoTaiKhoan(formData);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Tạo tài khoản thất bại: ${result.error}` });
      } else {
        setKetQua({ email: result.email, matKhau: result.matKhauMacDinh });
        showToast({ type: "success", message: `Đã tạo tài khoản "${result.email}" thành công.` });
        form.reset();
        setVaiTro(vaiTroOptions[0]);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input id="email" name="email" type="email" required className={styles.input} disabled={isPending} placeholder="vd giaovien@nonsense.edu.vn" />
        </div>
        <div className={styles.field}>
          <label htmlFor="ho_ten" className={styles.label}>Họ tên</label>
          <input id="ho_ten" name="ho_ten" type="text" required className={styles.input} disabled={isPending} placeholder="vd Nguyễn Văn A" />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="vai_tro" className={styles.label}>Vai trò</label>
          <select
            id="vai_tro"
            name="vai_tro"
            className={styles.select}
            value={vaiTro}
            onChange={(e) => setVaiTro(e.target.value)}
            disabled={isPending}
          >
            {vaiTroOptions.map((v) => (
              <option key={v} value={v}>{VAI_TRO_LABEL[v]}</option>
            ))}
          </select>
        </div>

        {(!isMasterAdmin || ["gv", "tro_giang", "quan_ly_chi_nhanh", "truong_bm"].includes(vaiTro)) && (
          <div className={styles.field}>
            <label htmlFor="chi_nhanh_id" className={styles.label}>
              Chi nhánh {!isMasterAdmin && "(bắt buộc)"}
            </label>
            <select id="chi_nhanh_id" name="chi_nhanh_id" className={styles.select} disabled={isPending} required={!isMasterAdmin}>
              {isMasterAdmin && <option value="">— Chưa gán —</option>}
              {chiNhanhOptions.map((cn) => (
                <option key={cn.id} value={cn.id}>{cn.ten}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {canTaoMasterAdmin && (
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="xac_nhan_mk_1" className={styles.label}>Xác nhận mật khẩu của bạn</label>
            <input id="xac_nhan_mk_1" name="xac_nhan_mk_1" type="password" required={canTaoMasterAdmin} className={styles.input} disabled={isPending} />
          </div>
          <div className={styles.field}>
            <label htmlFor="xac_nhan_mk_2" className={styles.label}>Nhập lại mật khẩu của bạn</label>
            <input id="xac_nhan_mk_2" name="xac_nhan_mk_2" type="password" required={canTaoMasterAdmin} className={styles.input} disabled={isPending} />
          </div>
        </div>
      )}
      {canTaoMasterAdmin && (
        <p className={styles.hint}>
          Bạn đang tạo một tài khoản <strong>Master Admin</strong> mới — cần nhập đúng mật khẩu của chính bạn 2 lần để xác nhận.
        </p>
      )}

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {ketQua && (
        <div className={styles.successBox} role="status">
          Đã tạo tài khoản <strong>{ketQua.email}</strong>. Mật khẩu mặc định:{" "}
          <code>{ketQua.matKhau}</code> — báo cho nhân sự đổi ngay lần đăng nhập đầu (hệ thống sẽ tự bắt đổi).
        </div>
      )}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo tài khoản"}
      </button>
    </form>
  );
}
