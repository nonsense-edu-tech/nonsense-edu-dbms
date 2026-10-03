"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { doiThuTuCauCon, xoaNguLieu } from "@/app/dashboard/ngan-hang-cau-hoi/ngu-lieu/actions";
import { useToast } from "./ToastProvider";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

export function NutDoiThuTu({ cauHoiId, nguLieuId, dauTien, cuoiCung }: { cauHoiId: string; nguLieuId: string; dauTien: boolean; cuoiCung: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const showToast = useToast();

  function doi(huong: "len" | "xuong") {
    startTransition(async () => {
      const kq = await doiThuTuCauCon(cauHoiId, huong, nguLieuId);
      if ("error" in kq) {
        showToast({ type: "error", message: `Đổi thứ tự thất bại: ${kq.error}` });
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className={styles.rowActions}>
      <button type="button" className={styles.btnEdit} disabled={isPending || dauTien} onClick={() => doi("len")} aria-label="Đưa lên">↑</button>
      <button type="button" className={styles.btnEdit} disabled={isPending || cuoiCung} onClick={() => doi("xuong")} aria-label="Đưa xuống">↓</button>
    </span>
  );
}

export function NutXoaNguLieu({ id, soCau }: { id: string; soCau: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const showToast = useToast();

  function xoa() {
    const nhac =
      soCau > 0
        ? `Xóa ngữ liệu này cùng ${soCau} câu hỏi con? Câu hỏi con không tồn tại độc lập nên sẽ bị xóa theo.`
        : "Xóa ngữ liệu này?";
    if (!window.confirm(nhac)) return;
    startTransition(async () => {
      const kq = await xoaNguLieu(id);
      if ("error" in kq) {
        showToast({ type: "error", message: `Xóa ngữ liệu thất bại: ${kq.error}` });
        return;
      }
      showToast({ type: "success", message: "Đã xóa ngữ liệu." });
      router.push("/dashboard/ngan-hang-cau-hoi/ngu-lieu");
    });
  }

  return (
    <button type="button" className={styles.btnDelete} disabled={isPending} onClick={xoa}>
      {isPending ? "Đang xóa…" : "Xóa ngữ liệu"}
    </button>
  );
}
