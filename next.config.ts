import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  experimental: {
    // Server Actions body limit
    serverActions: { bodySizeLimit: "50mb" },

    // Nouveau nom (remplace middlewareClientMaxBodySize)
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
