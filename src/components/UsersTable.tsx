"use client";

import { useState, useTransition } from "react";
import { capNhatUser } from "@/app/dashboard/users/actions";
import styles from "@/app/dashboard/users/users.module.css";

export type UserRow = {
  id: string;
  email: string;
  ho_ten: string | null;
  vai_tro: string;
  trang_thai: string;
};

const VAI_TRO_LABEL: Record<string, string> = {
  master_admin: "Master Admin",
  admin_ts: "Admin Tuyển sinh",
  admin_ht: "Admin Hiệu trưởng",
  truong_bm: "Trưởng bộ môn",
  gv: "Giáo viên",
};

const VAI_TRO_OPTIONS = Object.keys(VAI_TRO_LABEL);

export default function UsersTable({ list, currentUserId }: { list: UserRow[]; currentUserId: string }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Họ tên</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((u) => (
            <UserRowItem key={u.id} user={u} isSelf={u.id === currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRowItem({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);
  const [vaiTro, setVaiTro] = useState(user.vai_tro);
  const [trangThai, setTrangThai] = useState(user.trang_thai);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setEditing(false);
    setError(null);
    setVaiTro(user.vai_tro);
    setTrangThai(user.trang_thai);
  }

  function handleSave() {
    setError(null);

    if (isSelf && (vaiTro !== "master_admin" || trangThai !== "active")) {
      const confirmed = window.confirm(
        "Bạn đang tự đổi vai trò/trạng thái của chính mình sang trạng thái không còn là Master Admin đang hoạt động. Có thể khiến bạn mất quyền truy cập trang này. Tiếp tục?"
      );
      if (!confirmed) return;
    }

    const formData = new FormData();
    formData.set("user_id", user.id);
    formData.set("vai_tro", vaiTro);
    formData.set("trang_thai", trangThai);

    startTransition(async () => {
      const result = await capNhatUser(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  return (
    <tr>
      <td>
        {user.email}
        {isSelf && <span className={styles.youBadge}>(bạn)</span>}
      </td>
      <td>{user.ho_ten ?? "—"}</td>
      <td>
        {editing ? (
          <select
            className={styles.selectInline}
            value={vaiTro}
            onChange={(e) => setVaiTro(e.target.value)}
            disabled={isPending}
          >
            {VAI_TRO_OPTIONS.map((v) => (
              <option key={v} value={v}>{VAI_TRO_LABEL[v]}</option>
            ))}
          </select>
        ) : (
          VAI_TRO_LABEL[user.vai_tro] ?? user.vai_tro
        )}
      </td>
      <td>
        {editing ? (
          <select
            className={styles.selectInline}
            value={trangThai}
            onChange={(e) => setTrangThai(e.target.value)}
            disabled={isPending}
          >
            <option value="active">Hoạt động</option>
            <option value="disabled">Khoá</option>
          </select>
        ) : (
          <span
            className={`${styles.statusBadge} ${
              user.trang_thai === "active" ? styles.statusActive : styles.statusDisabled
            }`}
          >
            {user.trang_thai === "active" ? "Hoạt động" : "Khoá"}
          </span>
        )}
        {error && <div className={styles.errorText}>{error}</div>}
      </td>
      <td>
        <div className={styles.rowActions}>
          {editing ? (
            <>
              <button type="button" className={styles.btnSave} onClick={handleSave} disabled={isPending}>
                {isPending ? "Đang lưu…" : "Lưu"}
              </button>
              <button type="button" className={styles.btnCancel} onClick={handleCancel} disabled={isPending}>
                Huỷ
              </button>
            </>
          ) : (
            <button type="button" className={styles.btnEdit} onClick={() => setEditing(true)}>
              Sửa
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
