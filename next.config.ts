import type { NextConfig } from "next";

// STATIC_EXPORT=1 npm run build → out/ 폴더에 정적 사이트로 내보내기 (모든 화면이 클라이언트 렌더링)
const staticExport = !!process.env.STATIC_EXPORT;

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const, trailingSlash: true } : {}),
};

export default nextConfig;
