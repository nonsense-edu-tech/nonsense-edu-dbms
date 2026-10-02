"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ToastProvider";
import { nhanBanMaTran, xoaMaTran } from "./actions";
import styles from "./de-thi.module.css";

export default function MaTranHanhDong({ id }: { id: string }) {
  const router = useRouter();
  const showToast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <span className={styles.donViBtns}>
      <Link className={styles.btnMini} href={`/dashboard/de-thi/ma-tran/${id}`}>Sửa</Link>
      <Link className={styles.btnMini} href={`/dashboard/de-thi/moi?mt=${id}`}>Tạo đề</Link>
      <button
        type="button"
        className={styles.btnMini}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await nhanBanMaTran(id);
            if ("error" in r) return showToast({ type: "error", message: r.error });
            showToast({ type: "success", message: "Đã nhân bản ma trận." });
            router.push(`/dashboard/de-thi/ma-tran/${r.id}`);
          })
        }
      >
        Nhân bản
      </button>
      <button
        type="button"
        className={styles.btnMiniDanger}
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Xoá ma trận này? Các đề đã tạo từ ma trận vẫn giữ nguyên.")) return;
          startTransition(async () => {
            const r = await xoaMaTran(id);
            if ("error" in r) return showToast({ type: "error", message: r.error });
            showToast({ type: "success", message: "Đã xoá ma trận." });
            router.refresh();
          });
        }}
      >
        Xoá
      </button>
    </span>
  );
}
