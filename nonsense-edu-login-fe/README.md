# Nonsense Edu — Hệ thống quản lý ID nội bộ

## Cấu trúc project

```
src/
├── app/
│   ├── auth/callback/route.ts   # OAuth callback
│   ├── dashboard/               # Dashboard (GĐ1 mở rộng sau)
│   ├── login/
│   │   ├── actions.ts           # Server Actions: login email + Google
│   │   └── page.tsx
│   ├── globals.css              # Design tokens + reset
│   └── layout.tsx
├── components/
│   ├── LoginForm.tsx            # Form đăng nhập (Client Component)
│   └── LoginForm.module.css
├── lib/supabase/
│   ├── client.ts                # Browser client
│   └── server.ts                # Server client
└── middleware.ts                # Bảo vệ route
```

## Setup nhanh

### 1. Clone & cài đặt

```bash
npm install
```

### 2. Cấu hình biến môi trường

```bash
cp .env.local.example .env.local
# Mở .env.local và điền:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# NEXT_PUBLIC_SITE_URL=https://yourdomain.com   ← quan trọng cho OAuth
```

Lấy URL và key tại: Supabase Dashboard → Project Settings → API

### 3. Cấu hình Google OAuth trên Supabase

1. Supabase Dashboard → Authentication → Providers → Google → Enable
2. Tạo OAuth credentials tại Google Cloud Console:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Điền Client ID và Client Secret vào Supabase

### 4. Chạy local

```bash
npm run dev
# Mở http://localhost:3000
```

## Deploy lên Vercel

### Bước 1 — Push code lên GitHub

```bash
git init
git add .
git commit -m "feat: login page with Supabase auth"
git remote add origin https://github.com/your-org/nonsense-edu-id.git
git push -u origin main
```

### Bước 2 — Tạo project trên Vercel

1. Vào vercel.com → New Project → Import từ GitHub repo vừa tạo
2. Framework: Next.js (tự detect)
3. Thêm Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://your-vercel-domain.vercel.app`
4. Deploy

### Bước 3 — Cập nhật Supabase Auth redirect URLs

Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://your-vercel-domain.vercel.app`
- Redirect URLs: `https://your-vercel-domain.vercel.app/**`

### Bước 4 — Trỏ custom domain (tuỳ chọn)

Vercel → Project Settings → Domains → Add domain → nhập subdomain của trung tâm
(vd: `id.nonsense.edu.vn`)

Rồi cập nhật lại `NEXT_PUBLIC_SITE_URL` và Supabase URLs theo domain mới.

## Ghi chú

- Google OAuth có thể giới hạn theo domain trung tâm: bỏ comment dòng `hd: "nonsense.edu.vn"` trong `actions.ts`
- RLS Supabase chưa bật cho bảng GĐ3 — schema ngân hàng câu hỏi có sẵn ở `schema_ngan_hang_cau_hoi.sql`
- Dashboard hiện là placeholder; mở rộng theo lộ trình GĐ1 (bảng mã, quản lý lớp, học sinh)
