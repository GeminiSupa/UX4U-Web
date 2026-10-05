import type { NextConfig } from "next";

// Domain redirect skipped for now (owner): ux4u.online still serves a different site.
// Re-add vercel.app → ux4u.online only after this Vercel project is primary for ux4u.online.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }]
  }
};

export default nextConfig;
