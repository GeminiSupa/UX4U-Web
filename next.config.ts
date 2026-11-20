import type { NextConfig } from "next";

// Applied to every response. A full script CSP needs per-request nonces, so this policy only locks
// down framing, plugins, base URLs and form targets, which is safe with Next's inline scripts.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'"
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
];

const deskHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store" }
];

// Domain redirect skipped for now (owner): ux4u.online still serves a different site.
// Re-add vercel.app → ux4u.online only after this Vercel project is primary for ux4u.online.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }]
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/dashboard/:path*", headers: deskHeaders },
      { source: "/dashboard", headers: deskHeaders }
    ];
  }
};

export default nextConfig;
