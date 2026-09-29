"use client";

import { useState, useTransition } from "react";
import { khoiPhucTaiKhoan } from "@/app/dashboard/users/actions";
import { useToast } from "./ToastProvider";
import { VAI_TRO_LABEL } from "./UsersTable";
import styles from "@/app/dashboard/users/users.module.css";

export type DaXoaRow = { id: string; email: string; ho_ten: string | null; vai_tro: string };

export default function TaiKhoanDaXoaTable({ list }: { list: DaXoaRow[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Họ tên</th>
            <th>Vai trò</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((u) => (
            <DaXoaRowItem key={u.id} user={u} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DaXoaRowItem({ user }: { user: DaXoaRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const showToast = useToast();

  function handleKhoiPhuc() {
    setError(null);
    startTransition(async () => {
      const result = await khoiPhucTaiKhoan(user.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Khôi phục thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã khôi phục tài khoản "${user.email}" (vẫn ở trạng thái Khoá).` });
      }
    });
  }

  return (
    <tr>
      <td>{user.email}</td>
      <td>{user.ho_ten ?? "—"}</td>
      <td>{VAI_TRO_LABEL[user.vai_tro] ?? user.vai_tro}</td>
      <td>
        <button type="button" className={styles.btnEdit} onClick={handleKhoiPhuc} disabled={isPending}>
          {isPending ? "Đang khôi phục…" : "Khôi phục"}
        </button>
        {error && <div className={styles.errorText}>{error}</div>}
      </td>
    </tr>
  );
}
