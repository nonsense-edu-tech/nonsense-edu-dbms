"use client";

import { useMemo, useState, useTransition } from "react";
import { taoNguoiDungMotBuoc } from "@/app/dashboard/users/actions";
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

// Khớp ma trận ở RPC master_admin_tao_nguoi_dung (CSDL vẫn là nơi ép cuối cùng).
type CauHinhVaiTro = { chiNhanhToiThieu: number; phamVi: "none" | "cap" | "mon"; phanLop: boolean };
const CAU_HINH: Record<string, CauHinhVaiTro> = {
  master_admin: { chiNhanhToiThieu: 0, phamVi: "none", phanLop: false },
  admin_ts: { chiNhanhToiThieu: 0, phamVi: "none", phanLop: false },
  ke_toan: { chiNhanhToiThieu: 0, phamVi: "none", phanLop: false },
  thu_ngan: { chiNhanhToiThieu: 0, phamVi: "none", phanLop: false },
  quan_ly_chi_nhanh: { chiNhanhToiThieu: 1, phamVi: "none", phanLop: false },
  admin_ht: { chiNhanhToiThieu: 1, phamVi: "cap", phanLop: false },
  truong_bm: { chiNhanhToiThieu: 1, phamVi: "mon", phanLop: true },
  gv: { chiNhanhToiThieu: 1, phamVi: "mon", phanLop: true },
  tro_giang: { chiNhanhToiThieu: 1, phamVi: "mon", phanLop: true },
};

type ChiNhanh = { id: string; ten: string };
type CapHoc = { ma: number; ten: string };
type MonHoc = { cap_hoc_ma: number; ma: number; ten: string };
type Lop = { id: string; ma_lop: string; ten_lop: string | null; cap_hoc_ma: number | null; chi_nhanh_id: string | null };

const khoaMon = (cap: number, mon: number) => `${cap}-${mon}`;
const khoaLop = (lopId: string, cap: number, mon: number) => `${lopId}|${cap}-${mon}`;

export default function TaoNguoiDungMotBuocForm({
  chiNhanhList,
  capHocList,
  monHocList,
  lopList,
}: {
  chiNhanhList: ChiNhanh[];
  capHocList: CapHoc[];
  monHocList: MonHoc[];
  lopList: Lop[];
}) {
  const [vaiTro, setVaiTro] = useState("gv");
  const [chiNhanhChon, setChiNhanhChon] = useState<Set<string>>(new Set());
  const [capChon, setCapChon] = useState<Set<number>>(new Set());
  const [monChon, setMonChon] = useState<Set<string>>(new Set());
  const [lopChon, setLopChon] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [ketQua, setKetQua] = useState<{ email: string; matKhau: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  const cfg = CAU_HINH[vaiTro];
  const tenCap = useMemo(() => new Map(capHocList.map((c) => [c.ma, c.ten])), [capHocList]);

  function bat<T>(tap: Set<T>, v: T, dat: (s: Set<T>) => void) {
    const moi = new Set(tap);
    if (moi.has(v)) moi.delete(v);
    else moi.add(v);
    dat(moi);
  }

  function doiVaiTro(v: string) {
    setVaiTro(v);
    // Đổi vai trò → xoá lựa chọn phạm vi/lớp để không gửi nhầm dữ liệu của vai trò trước.
    setCapChon(new Set());
    setMonChon(new Set());
    setLopChon(new Set());
  }

  function doiMon(cap: number, mon: number) {
    const k = khoaMon(cap, mon);
    const dangChon = monChon.has(k);
    bat(monChon, k, setMonChon);
    if (dangChon) {
      // Bỏ môn → bỏ luôn các lớp đã tick dưới môn đó.
      const sau = new Set([...lopChon].filter((x) => !x.endsWith(`|${k}`)));
      setLopChon(sau);
    }
  }

  // Lớp gợi ý cho 1 môn: cùng cấp học, và chi nhánh nằm trong chi nhánh đã chọn (lớp chưa gán chi nhánh luôn hiện).
  function lopCuaMon(cap: number) {
    return lopList.filter((l) => l.cap_hoc_ma === cap && (l.chi_nhanh_id === null || chiNhanhChon.has(l.chi_nhanh_id)));
  }

  const monDaChon = monHocList.filter((m) => monChon.has(khoaMon(m.cap_hoc_ma, m.ma)));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setKetQua(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    if (chiNhanhChon.size < cfg.chiNhanhToiThieu) {
      const msg = `Vai trò ${VAI_TRO_LABEL[vaiTro]} bắt buộc phân ít nhất ${cfg.chiNhanhToiThieu} chi nhánh.`;
      setError(msg);
      showToast({ type: "error", message: msg });
      return;
    }
    if (cfg.phamVi === "mon" && monChon.size === 0) {
      const msg = "Vui lòng phân ít nhất 1 môn học.";
      setError(msg);
      showToast({ type: "error", message: msg });
      return;
    }
    if (cfg.phamVi === "cap" && capChon.size === 0) {
      const msg = "Vui lòng phân ít nhất 1 cấp học.";
      setError(msg);
      showToast({ type: "error", message: msg });
      return;
    }

    const phamVi =
      cfg.phamVi === "cap"
        ? [...capChon].map((c) => ({ capHocMa: c, monHocMa: null as number | null }))
        : cfg.phamVi === "mon"
          ? monDaChon.map((m) => ({ capHocMa: m.cap_hoc_ma, monHocMa: m.ma as number | null }))
          : [];
    const phanCong = cfg.phanLop
      ? [...lopChon].map((k) => {
          const [lopId, cm] = k.split("|");
          return { lopId, monHocMa: Number(cm.split("-")[1]) };
        })
      : [];

    startTransition(async () => {
      const result = await taoNguoiDungMotBuoc({
        email: String(fd.get("email") ?? ""),
        hoTen: String(fd.get("ho_ten") ?? ""),
        vaiTro,
        chiNhanhIds: [...chiNhanhChon],
        phamVi,
        phanCong,
        xacNhanMk1: String(fd.get("xac_nhan_mk_1") ?? ""),
        xacNhanMk2: String(fd.get("xac_nhan_mk_2") ?? ""),
      });
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Tạo người dùng thất bại: ${result.error}` });
      } else {
        setKetQua({ email: result.email, matKhau: result.matKhauMacDinh });
        showToast({ type: "success", message: `Đã tạo người dùng "${result.email}" thành công.` });
        form.reset();
        doiVaiTro("gv");
        setChiNhanhChon(new Set());
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

      <div className={styles.field}>
        <label htmlFor="vai_tro" className={styles.label}>Vai trò</label>
        <select id="vai_tro" className={styles.select} value={vaiTro} onChange={(e) => doiVaiTro(e.target.value)} disabled={isPending}>
          {Object.keys(VAI_TRO_LABEL).map((v) => (
            <option key={v} value={v}>{VAI_TRO_LABEL[v]}</option>
          ))}
        </select>
      </div>

      {vaiTro !== "master_admin" && (
        <div className={styles.field}>
          <span className={styles.label}>
            Chi nhánh {cfg.chiNhanhToiThieu > 0 ? "(bắt buộc, chọn nhiều được)" : "(tuỳ chọn)"}
          </span>
          <div className={styles.checkGroup}>
            {chiNhanhList.map((cn) => (
              <label key={cn.id} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={chiNhanhChon.has(cn.id)}
                  disabled={isPending}
                  onChange={() => bat(chiNhanhChon, cn.id, setChiNhanhChon)}
                />
                {cn.ten}
              </label>
            ))}
          </div>
        </div>
      )}

      {cfg.phamVi === "cap" && (
        <div className={styles.field}>
          <span className={styles.label}>Cấp học phụ trách (bắt buộc)</span>
          <div className={styles.checkGroup}>
            {capHocList.map((c) => (
              <label key={c.ma} className={styles.checkItem}>
                <input type="checkbox" checked={capChon.has(c.ma)} disabled={isPending} onChange={() => bat(capChon, c.ma, setCapChon)} />
                {c.ten}
              </label>
            ))}
          </div>
        </div>
      )}

      {cfg.phamVi === "mon" && (
        <div className={styles.field}>
          <span className={styles.label}>Môn học phụ trách (bắt buộc)</span>
          {capHocList.map((c) => {
            const monCuaCap = monHocList.filter((m) => m.cap_hoc_ma === c.ma);
            if (monCuaCap.length === 0) return null;
            return (
              <div key={c.ma}>
                <span className={styles.hint}>{c.ten}</span>
                <div className={styles.checkGroup}>
                  {monCuaCap.map((m) => (
                    <label key={m.ma} className={styles.checkItem}>
                      <input type="checkbox" checked={monChon.has(khoaMon(m.cap_hoc_ma, m.ma))} disabled={isPending} onChange={() => doiMon(m.cap_hoc_ma, m.ma)} />
                      {m.ten}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cfg.phanLop && (
        <div className={styles.field}>
          <span className={styles.label}>Phân lớp (tuỳ chọn — hiện theo môn đã chọn và chi nhánh đã chọn)</span>
          {monDaChon.length === 0 ? (
            <p className={styles.hint}>Chọn môn học ở trên để hiện danh sách lớp.</p>
          ) : (
            monDaChon.map((m) => {
              const ds = lopCuaMon(m.cap_hoc_ma);
              return (
                <div key={khoaMon(m.cap_hoc_ma, m.ma)}>
                  <span className={styles.hint}>{tenCap.get(m.cap_hoc_ma)} — {m.ten}</span>
                  {ds.length === 0 ? (
                    <p className={styles.hint}>Chưa có lớp phù hợp.</p>
                  ) : (
                    <div className={styles.checkGroup}>
                      {ds.map((l) => {
                        const k = khoaLop(l.id, m.cap_hoc_ma, m.ma);
                        return (
                          <label key={k} className={styles.checkItem}>
                            <input type="checkbox" checked={lopChon.has(k)} disabled={isPending} onChange={() => bat(lopChon, k, setLopChon)} />
                            {l.ma_lop}{l.ten_lop ? ` — ${l.ten_lop}` : ""}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {vaiTro === "master_admin" && (
        <>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="xac_nhan_mk_1" className={styles.label}>Xác nhận mật khẩu của bạn</label>
              <input id="xac_nhan_mk_1" name="xac_nhan_mk_1" type="password" className={styles.input} disabled={isPending} />
            </div>
            <div className={styles.field}>
              <label htmlFor="xac_nhan_mk_2" className={styles.label}>Nhập lại mật khẩu của bạn</label>
              <input id="xac_nhan_mk_2" name="xac_nhan_mk_2" type="password" className={styles.input} disabled={isPending} />
            </div>
          </div>
          <p className={styles.hint}>
            Bạn đang tạo một tài khoản <strong>Master Admin</strong> mới — cần nhập đúng mật khẩu của chính bạn 2 lần để xác nhận.
          </p>
        </>
      )}

      {error && <div className={styles.errorBox} role="alert">{error}</div>}
      {ketQua && (
        <div className={styles.successBox} role="status">
          Đã tạo tài khoản <strong>{ketQua.email}</strong>. Mật khẩu mặc định: <code>{ketQua.matKhau}</code> — báo cho nhân sự
          đổi ngay lần đăng nhập đầu (hệ thống sẽ tự bắt đổi).
        </div>
      )}

      <button type="submit" className={styles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang tạo…" : "Tạo người dùng"}
      </button>
    </form>
  );
}
