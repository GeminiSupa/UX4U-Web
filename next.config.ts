import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "ux4u.vercel.app" }],
        destination: "https://ux4u.online/:path*",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
