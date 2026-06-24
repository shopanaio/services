import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ['antd', '@ant-design', 'rc-util', 'rc-pagination', 'rc-picker', '@rc-component'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/workspace',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
