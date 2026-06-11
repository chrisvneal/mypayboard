import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/master-list',
        destination: '/dashboard/bills-and-income',
        permanent: true,
      },
      {
        source: '/dashboard/expenses-and-income',
        destination: '/dashboard/bills-and-income',
        permanent: true,
      },
      {
        source: '/dashboard/debt-overview',
        destination: '/dashboard/debt-tracker',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
