import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nonsense Edu — Hệ thống quản lý",
  description: "Hệ thống quản lý ID nội bộ Nonsense Edu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
