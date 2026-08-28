import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow both localhost and 127.0.0.1 in dev (HMR / client hydration).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/admin/ataques",
        destination: "/auditoria/ataques",
        permanent: false,
      },
      {
        source: "/admin/medicacoes",
        destination: "/auditoria/medicacoes",
        permanent: false,
      },
      {
        source: "/admin/permissoes",
        destination: "/admin/users/permissoes",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
