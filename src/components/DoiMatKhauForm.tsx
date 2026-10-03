"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./ToastProvider";
import formStyles from "./Form.module.css";

// Chuyển lỗi Supabase Auth → tiếng Việt dễ hiểu.
function dichLoi(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("current password required")) return "Vui lòng nhập mật khẩu hiện tại.";
  if (m.includes("current password") && (m.includes("incorrect") || m.includes("invalid") || m.includes("wrong")))
    return "Mật khẩu hiện tại không đúng.";
  if (m.includes("different from the old")) return "Mật khẩu mới phải khác mật khẩu hiện tại.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("at least"))
    return "Mật khẩu mới quá yếu — hãy dùng mật khẩu dài hơn, gồm chữ hoa, chữ thường, số.";
  if (m.includes("reauthentication") || m.includes("recently logged in"))
    return "Phiên đăng nhập đã cũ — hãy đăng xuất, đăng nhập lại rồi đổi mật khẩu.";
  if (m.includes("rate limit") || m.includes("too many")) return "Thử quá nhiều lần — chờ vài phút rồi thử lại.";
  return msg;
}

export default function DoiMatKhauForm() {
  // Nếu Auth đã đổi xong mà bước đánh dấu thất bại, lần bấm lại chỉ gọi lại bước đánh dấu
  // (mật khẩu hiện tại lúc này đã là mật khẩu mới, gọi updateUser lần nữa sẽ lỗi).
  const daDoiAuth = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const showToast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const matKhauHienTai = String(formData.get("mat_khau_hien_tai") ?? "");
    const matKhauMoi = String(formData.get("mat_khau_moi") ?? "");
    const nhapLai = String(formData.get("nhap_lai") ?? "");

    if (!daDoiAuth.current && !matKhauHienTai) {
      setError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
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
      if (!daDoiAuth.current) {
        const { error: authErr } = await supabase.auth.updateUser({
          password: matKhauMoi,
          current_password: matKhauHienTai,
        });
        if (authErr) {
          setError(dichLoi(authErr.message));
          return;
        }
        daDoiAuth.current = true;
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
        <label htmlFor="mat_khau_hien_tai" className={formStyles.label}>Mật khẩu hiện tại</label>
        <input
          id="mat_khau_hien_tai"
          name="mat_khau_hien_tai"
          type="password"
          autoComplete="current-password"
          required
          className={formStyles.input}
          disabled={isPending}
        />
      </div>
      <div className={formStyles.field}>
        <label htmlFor="mat_khau_moi" className={formStyles.label}>Mật khẩu mới</label>
        <input
          id="mat_khau_moi"
          name="mat_khau_moi"
          type="password"
          autoComplete="new-password"
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
          autoComplete="new-password"
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
