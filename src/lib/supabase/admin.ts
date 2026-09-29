import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client dùng SERVICE ROLE KEY — bỏ qua toàn bộ RLS, chỉ để gọi Admin API
// (tạo/xoá/khoá tài khoản Auth, đặt lại mật khẩu). CHỈ import file này từ
// code chạy trên server (Server Actions có "use server", route handler) —
// KHÔNG BAO GIỜ import vào Client Component. Mọi lời gọi dùng client này bắt
// buộc phải tự kiểm tra quyền của người gọi (qua client thường, có RLS)
// TRƯỚC — service role không có khái niệm "quyền" nào để dựa vào.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Thiếu SUPABASE_SERVICE_ROLE_KEY (hoặc NEXT_PUBLIC_SUPABASE_URL) trong biến môi trường server."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Mật khẩu mặc định cho tài khoản mới / đặt lại — theo quyết định 28/09/2026:
// không tạo mật khẩu ngẫu nhiên, người dùng bắt buộc đổi ở lần đăng nhập đầu
// (cột users.phai_doi_mat_khau).
export const MAT_KHAU_MAC_DINH = "NonsenseEdu@123";
