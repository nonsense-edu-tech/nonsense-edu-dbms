import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Chưa đăng nhập → redirect về /login
  if (!user && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Đã đăng nhập mà vào /login → redirect về dashboard
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Bắt buộc đổi mật khẩu mặc định ở lần đăng nhập đầu (module Quản lý
  // người dùng, 28/09/2026) — chặn ở đây vì repo chưa có layout.tsx chung
  // cho /dashboard, mỗi trang tự kiểm tra đăng nhập riêng.
  if (user && pathname.startsWith("/dashboard") && pathname !== "/dashboard/doi-mat-khau") {
    const { data: profile } = await supabase
      .from("users")
      .select("phai_doi_mat_khau")
      .eq("id", user.id)
      .single();

    if (profile?.phai_doi_mat_khau) {
      return NextResponse.redirect(new URL("/dashboard/doi-mat-khau", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
