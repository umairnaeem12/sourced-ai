import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Handlebars uses require.extensions, which webpack can't bundle; load it from node_modules.
  serverExternalPackages: ["handlebars"],
  // Email templates are read from disk at runtime, so the server bundle must include them.
  outputFileTracingIncludes: {
    "/api/handoffs": ["./src/server/email/templates/**"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
