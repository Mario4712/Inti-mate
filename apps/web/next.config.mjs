/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const cdnUrl = process.env.CDN_BASE_URL ?? "http://localhost:9000/media";
const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_HOST ?? "ws://localhost:7880";

const nextConfig = {
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  images: {
    remotePatterns: [
      // Dev: MinIO
      { protocol: "http", hostname: "localhost", port: "9000" },
      // Prod: S3/CDN
      ...(process.env.CDN_HOSTNAME
        ? [{ protocol: "https", hostname: process.env.CDN_HOSTNAME }]
        : []),
    ],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      `script-src 'self' ${isProd ? "'unsafe-inline'" : "'unsafe-inline' 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: blob: ${cdnUrl} ${apiUrl}`,
      `connect-src 'self' ${apiUrl} ${apiUrl.replace("http", "ws")} ${livekitHost}`,
      `media-src 'self' blob: ${cdnUrl}`,
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: isProd
              ? "camera=(), microphone=(self), geolocation=()"
              : "camera=(), microphone=(), geolocation=(self)",
          },
          { key: "Content-Security-Policy", value: csp },
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
