/** @type {import('next').NextConfig} */
const nextConfig = {
  // 업로드 이미지는 /api/files 라우트로 서빙하므로 next/image 최적화는 사용하지 않습니다.
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
  },
};
export default nextConfig;
