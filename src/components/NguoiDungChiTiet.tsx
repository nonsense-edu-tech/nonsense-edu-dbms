"use client";

import { useState, useTransition } from "react";
import {
  suaHoTen,
  xoaMemTaiKhoan,
  khoiPhucTaiKhoan,
  datLaiMatKhauMacDinh,
  ganPhamVi,
  goPhamVi,
  ganChiNhanhThuCong,
  goChiNhanh,
} from "@/app/dashboard/users/actions";
import { useToast } from "./ToastProvider";
import { VAI_TRO_LABEL } from "./UsersTable";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/users/users.module.css";

type Target = {
  id: string;
  email: string;
  ho_ten: string | null;
  vai_tro: string;
  trang_thai: string;
  deleted_at: string | null;
  phai_doi_mat_khau: boolean;
};

type CapHoc = { id: string; ma: number; ten: string };
type MonHoc = { id: string; ma: number; cap_hoc_ma: number; ten: string };
type PhamViRow = { id: string; cap_hoc_ma: number; mon_hoc_ma: number | null; cap_hoc_ten: string; mon_hoc_ten: string | null };
type ChiNhanhOption = { id: string; ten: string };
type ChiNhanhRow = { id: string; chi_nhanh_id: string; chi_nhanh_ten: string };
type NhatKyRow = { id: string; hanh_dong: string; truoc: unknown; sau: unknown; created_at: string; thuc_hien_boi: string };

const HANH_DONG_LABEL: Record<string, string> = {
  tao_tai_khoan: "Tạo tài khoản",
  tao_master_admin: "Tạo Master Admin",
  admin_ht_tao_nhan_su: "Admin HT cấp tài khoản",
  sua_vai_tro_trang_thai: "Sửa vai trò/trạng thái",
  sua_ho_ten: "Sửa họ tên",
  xoa_mem: "Xoá",
  khoi_phuc: "Khôi phục",
  dat_lai_mat_khau: "Đặt lại mật khẩu",
  gan_pham_vi: "Gán phạm vi",
  go_pham_vi: "Gỡ phạm vi",
  gan_chi_nhanh: "Gán chi nhánh",
  go_chi_nhanh: "Gỡ chi nhánh",
};

const VAI_TRO_CO_PHAM_VI = ["gv", "truong_bm", "tro_giang"];
const VAI_TRO_CO_CHI_NHANH = ["quan_ly_chi_nhanh", "gv", "tro_giang"];

export default function NguoiDungChiTiet({
  target,
  capHocOptions,
  monHocOptions,
  phamViRows,
  chiNhanhOptions,
  chiNhanhRows,
  nhatKyRows,
}: {
  target: Target;
  capHocOptions: CapHoc[];
  monHocOptions: MonHoc[];
  phamViRows: PhamViRow[];
  chiNhanhOptions: ChiNhanhOption[];
  chiNhanhRows: ChiNhanhRow[];
  nhatKyRows: NhatKyRow[];
}) {
  const showToast = useToast();

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Thông tin cơ bản</h2>
        <p className={styles.empty} style={{ marginBottom: 12 }}>
          {target.email} — {VAI_TRO_LABEL[target.vai_tro] ?? target.vai_tro} —{" "}
          <span className={`${styles.statusBadge} ${target.trang_thai === "active" ? styles.statusActive : styles.statusDisabled}`}>
            {target.trang_thai === "active" ? "Hoạt động" : "Khoá"}
          </span>
          {target.deleted_at && <span className={styles.errorText}> — Đã xoá</span>}
          {target.phai_doi_mat_khau && <span className={styles.empty}> — Chưa đổi mật khẩu mặc định</span>}
        </p>
        <HoTenForm id={target.id} hoTenHienTai={target.ho_ten} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Trạng thái tài khoản</h2>
        <TrangThaiActions id={target.id} email={target.email} daXoa={!!target.deleted_at} />
      </section>

      {VAI_TRO_CO_PHAM_VI.includes(target.vai_tro) && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Phạm vi môn học phụ trách</h2>
          <PhamViSection userId={target.id} rows={phamViRows} capHocOptions={capHocOptions} monHocOptions={monHocOptions} />
        </section>
      )}

      {VAI_TRO_CO_CHI_NHANH.includes(target.vai_tro) && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Chi nhánh</h2>
          <ChiNhanhSection userId={target.id} rows={chiNhanhRows} options={chiNhanhOptions} />
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Lịch sử thao tác ({nhatKyRows.length})</h2>
        {nhatKyRows.length > 0 ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nhatKyRows.map((n) => (
              <li key={n.id} className={styles.empty} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                <strong style={{ color: "var(--text-hi)" }}>{HANH_DONG_LABEL[n.hanh_dong] ?? n.hanh_dong}</strong> bởi{" "}
                {n.thuc_hien_boi} — {new Date(n.created_at).toLocaleString("vi-VN")}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Chưa có lịch sử.</p>
        )}
      </section>
    </>
  );

  function HoTenForm({ id, hoTenHienTai }: { id: string; hoTenHienTai: string | null }) {
    const [hoTen, setHoTen] = useState(hoTenHienTai ?? "");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setError(null);
      const formData = new FormData();
      formData.set("id", id);
      formData.set("ho_ten", hoTen);
      startTransition(async () => {
        const result = await suaHoTen(formData);
        if ("error" in result) {
          setError(result.error);
          showToast({ type: "error", message: `Sửa họ tên thất bại: ${result.error}` });
        } else {
          showToast({ type: "success", message: "Đã cập nhật họ tên." });
        }
      });
    }

    return (
      <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="ho_ten" className={formStyles.label}>Họ tên</label>
            <input
              id="ho_ten"
              className={formStyles.input}
              value={hoTen}
              onChange={(e) => setHoTen(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        {error && <div className={formStyles.errorBox}>{error}</div>}
        <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
          {isPending ? "Đang lưu…" : "Lưu họ tên"}
        </button>
      </form>
    );
  }

  function TrangThaiActions({ id, email, daXoa }: { id: string; email: string; daXoa: boolean }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [matKhauMoi, setMatKhauMoi] = useState<string | null>(null);

    function handleXoa() {
      if (!window.confirm(`Xoá mềm tài khoản "${email}"? Tài khoản sẽ bị khoá đăng nhập ngay, có thể khôi phục sau.`)) return;
      setError(null);
      startTransition(async () => {
        const result = await xoaMemTaiKhoan(id);
        if ("error" in result) {
          setError(result.error);
          showToast({ type: "error", message: `Xoá thất bại: ${result.error}` });
        } else {
          showToast({ type: "success", message: `Đã xoá tài khoản "${email}".` });
        }
      });
    }

    function handleKhoiPhuc() {
      setError(null);
      startTransition(async () => {
        const result = await khoiPhucTaiKhoan(id);
        if ("error" in result) {
          setError(result.error);
          showToast({ type: "error", message: `Khôi phục thất bại: ${result.error}` });
        } else {
          showToast({ type: "success", message: `Đã khôi phục "${email}" (vẫn ở trạng thái Khoá — vào danh sách để kích hoạt lại).` });
        }
      });
    }

    function handleDatLaiMatKhau() {
      if (!window.confirm(`Đặt lại mật khẩu mặc định cho "${email}"?`)) return;
      setError(null);
      setMatKhauMoi(null);
      startTransition(async () => {
        const result = await datLaiMatKhauMacDinh(id);
        if ("error" in result) {
          setError(result.error);
          showToast({ type: "error", message: `Đặt lại mật khẩu thất bại: ${result.error}` });
        } else {
          setMatKhauMoi(result.matKhauMacDinh);
          showToast({ type: "success", message: "Đã đặt lại mật khẩu mặc định." });
        }
      });
    }

    return (
      <div className={formStyles.form}>
        <div className={styles.rowActions}>
          {daXoa ? (
            <button type="button" className={styles.btnEdit} onClick={handleKhoiPhuc} disabled={isPending}>
              {isPending ? "Đang xử lý…" : "Khôi phục tài khoản"}
            </button>
          ) : (
            <button type="button" className={styles.btnEdit} onClick={handleXoa} disabled={isPending}>
              {isPending ? "Đang xử lý…" : "Xoá tài khoản (mềm)"}
            </button>
          )}
          <button type="button" className={styles.btnEdit} onClick={handleDatLaiMatKhau} disabled={isPending || daXoa}>
            Đặt lại mật khẩu mặc định
          </button>
        </div>
        {error && <div className={formStyles.errorBox}>{error}</div>}
        {matKhauMoi && (
          <div className={formStyles.successBox}>
            Mật khẩu mới: <code>{matKhauMoi}</code> — báo cho nhân sự đổi ngay lần đăng nhập tới.
          </div>
        )}
      </div>
    );
  }

  function PhamViSection({
    userId,
    rows,
    capHocOptions,
    monHocOptions,
  }: {
    userId: string;
    rows: PhamViRow[];
    capHocOptions: CapHoc[];
    monHocOptions: MonHoc[];
  }) {
    const [capHocMa, setCapHocMa] = useState(capHocOptions[0]?.ma ?? 0);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const monHocCuaCap = monHocOptions.filter((m) => m.cap_hoc_ma === capHocMa);
    const capHocDangChon = capHocOptions.find((c) => c.ma === capHocMa);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setError(null);
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.set("user_id", userId);
      if (capHocDangChon) {
        formData.set("cap_hoc_id", capHocDangChon.id);
        formData.set("cap_hoc_ma", String(capHocDangChon.ma));
      }
      const monHocId = String(formData.get("mon_hoc_id") ?? "");
      const monHoc = monHocOptions.find((m) => m.id === monHocId);
      if (monHoc) formData.set("mon_hoc_ma", String(monHoc.ma));

      startTransition(async () => {
        const result = await ganPhamVi(formData);
        if ("error" in result) {
          setError(result.error);
          showToast({ type: "error", message: `Gán phạm vi thất bại: ${result.error}` });
        } else {
          showToast({ type: "success", message: "Đã gán phạm vi." });
          form.reset();
        }
      });
    }

    function handleGo(id: string) {
      startTransition(async () => {
        const result = await goPhamVi(id, userId);
        if ("error" in result) showToast({ type: "error", message: `Gỡ phạm vi thất bại: ${result.error}` });
        else showToast({ type: "success", message: "Đã gỡ phạm vi." });
      });
    }

    return (
      <div className={formStyles.form}>
        {rows.length > 0 ? (
          <ul style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {rows.map((r) => (
              <li key={r.id} className={styles.statusBadge} style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                {r.cap_hoc_ten}{r.mon_hoc_ten ? ` — ${r.mon_hoc_ten}` : " — tất cả môn"}
                <button
                  type="button"
                  onClick={() => handleGo(r.id)}
                  disabled={isPending}
                  style={{ marginLeft: 8, background: "none", border: "none", color: "var(--text-lo)", cursor: "pointer" }}
                  aria-label="Gỡ phạm vi"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Chưa có phạm vi nào — tài khoản này sẽ không thấy câu hỏi nào cho tới khi được gán.</p>
        )}

        <form onSubmit={handleSubmit} className={formStyles.row} style={{ alignItems: "flex-end" }}>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Cấp học</label>
            <select
              className={formStyles.select}
              value={capHocMa}
              onChange={(e) => setCapHocMa(Number(e.target.value))}
              disabled={isPending}
            >
              {capHocOptions.map((c) => (
                <option key={c.id} value={c.ma}>{c.ten}</option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Môn học (bỏ trống = tất cả môn của cấp học)</label>
            <select name="mon_hoc_id" className={formStyles.select} disabled={isPending} defaultValue="">
              <option value="">— Tất cả môn —</option>
              {monHocCuaCap.map((m) => (
                <option key={m.id} value={m.id}>{m.ten}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
            {isPending ? "Đang gán…" : "+ Gán"}
          </button>
        </form>
        {error && <div className={formStyles.errorBox}>{error}</div>}
      </div>
    );
  }

  function ChiNhanhSection({ userId, rows, options }: { userId: string; rows: ChiNhanhRow[]; options: ChiNhanhOption[] }) {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setError(null);
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.set("user_id", userId);
      startTransition(async () => {
        const result = await ganChiNhanhThuCong(formData);
        if ("error" in result) {
          setError(result.error);
          showToast({ type: "error", message: `Gán chi nhánh thất bại: ${result.error}` });
        } else {
          showToast({ type: "success", message: "Đã gán chi nhánh." });
          form.reset();
        }
      });
    }

    function handleGo(id: string) {
      startTransition(async () => {
        const result = await goChiNhanh(id, userId);
        if ("error" in result) showToast({ type: "error", message: `Gỡ chi nhánh thất bại: ${result.error}` });
        else showToast({ type: "success", message: "Đã gỡ chi nhánh." });
      });
    }

    return (
      <div className={formStyles.form}>
        {rows.length > 0 ? (
          <ul style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {rows.map((r) => (
              <li key={r.id} className={styles.statusBadge} style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                {r.chi_nhanh_ten}
                <button
                  type="button"
                  onClick={() => handleGo(r.id)}
                  disabled={isPending}
                  style={{ marginLeft: 8, background: "none", border: "none", color: "var(--text-lo)", cursor: "pointer" }}
                  aria-label="Gỡ chi nhánh"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Chưa gán chi nhánh nào.</p>
        )}

        <form onSubmit={handleSubmit} className={formStyles.row} style={{ alignItems: "flex-end" }}>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Chi nhánh</label>
            <select name="chi_nhanh_id" className={formStyles.select} disabled={isPending} required>
              {options.map((cn) => (
                <option key={cn.id} value={cn.id}>{cn.ten}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
            {isPending ? "Đang gán…" : "+ Gán"}
          </button>
        </form>
        {error && <div className={formStyles.errorBox}>{error}</div>}
      </div>
    );
  }
}
