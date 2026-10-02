"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ToastProvider";
import { xoaDe } from "./actions";
import styles from "./de-thi.module.css";

export default function DeHanhDong({ id, nhap, coTheXoa }: { id: string; nhap: boolean; coTheXoa: boolean }) {
  const router = useRouter();
  const showToast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <span className={styles.donViBtns}>
      <Link className={styles.btnMini} href={`/dashboard/de-thi/${id}`}>{nhap ? "Mở" : "Xem / xuất"}</Link>
      {nhap && coTheXoa && (
        <button
          type="button"
          className={styles.btnMiniDanger}
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Xoá đề nháp này?")) return;
            startTransition(async () => {
              const r = await xoaDe(id);
              if ("error" in r) return showToast({ type: "error", message: r.error });
              showToast({ type: "success", message: "Đã xoá đề." });
              router.refresh();
            });
          }}
        >
          Xoá
        </button>
      )}
    </span>
  );
}
