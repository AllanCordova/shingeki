import type { NextConfig } from "next";
import path from "node:path";

const appRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  // Keep Turbopack inside apps/client. Inferring the git root makes it watch
  // API vendor, workers and storage — enough to OOM / freeze the machine.
  turbopack: {
    root: appRoot,
  },
  outputFileTracingRoot: appRoot,
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
