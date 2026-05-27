import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/master-list',
        destination: '/dashboard/expenses-and-income',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
