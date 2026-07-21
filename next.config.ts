import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Mặc định Next.js giới hạn 1MB cho body của server action — quá nhỏ so với
      // biên lai đính kèm (tối đa 2 file, mỗi file tới 10MB, xem thu-tien/actions.ts).
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
