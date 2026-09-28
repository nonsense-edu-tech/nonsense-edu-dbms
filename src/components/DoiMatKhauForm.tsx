"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./ToastProvider";
import formStyles from "./Form.module.css";

export default function DoiMatKhauForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const showToast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const matKhauMoi = String(formData.get("mat_khau_moi") ?? "");
    const nhapLai = String(formData.get("nhap_lai") ?? "");

    if (matKhauMoi.length < 8) {
      setError("Mật khẩu mới phải từ 8 ký tự trở lên.");
      return;
    }
    if (matKhauMoi !== nhapLai) {
      setError("Hai lần nhập mật khẩu không khớp nhau.");
      return;
    }
    if (matKhauMoi === "NonsenseEdu@123") {
      setError("Không thể đặt lại đúng mật khẩu mặc định — hãy chọn mật khẩu khác.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: authErr } = await supabase.auth.updateUser({ password: matKhauMoi });
      if (authErr) {
        setError(authErr.message);
        return;
      }

      const { error: rpcErr } = await supabase.rpc("danh_dau_da_doi_mat_khau");
      if (rpcErr) {
        setError(`Đổi mật khẩu thành công nhưng chưa cập nhật được cờ hệ thống: ${rpcErr.message}`);
        return;
      }

      showToast({ type: "success", message: "Đã đổi mật khẩu thành công." });
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
      <div className={formStyles.field}>
        <label htmlFor="mat_khau_moi" className={formStyles.label}>Mật khẩu mới</label>
        <input
          id="mat_khau_moi"
          name="mat_khau_moi"
          type="password"
          required
          minLength={8}
          className={formStyles.input}
          disabled={isPending}
        />
      </div>
      <div className={formStyles.field}>
        <label htmlFor="nhap_lai" className={formStyles.label}>Nhập lại mật khẩu mới</label>
        <input
          id="nhap_lai"
          name="nhap_lai"
          type="password"
          required
          minLength={8}
          className={formStyles.input}
          disabled={isPending}
        />
      </div>

      {error && <div className={formStyles.errorBox} role="alert">{error}</div>}

      <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
        {isPending ? "Đang lưu…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
