"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginWithEmail(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// Chuyển lỗi Supabase → tiếng Việt thân thiện
function mapAuthError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Email hoặc mật khẩu không đúng.";
  if (msg.includes("Email not confirmed"))
    return "Email chưa được xác nhận. Kiểm tra hộp thư.";
  if (msg.includes("Too many requests"))
    return "Quá nhiều lần thử. Chờ vài phút rồi thử lại.";
  return "Đăng nhập thất bại. Thử lại sau.";
}
