/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Enable React strict mode for better error detection
  reactStrictMode: true,
  // Redirect legacy /batch placeholder to real batch search
  async redirects() {
    return [{ source: "/batch", destination: "/batch-search", permanent: true }]
  },
  // Security headers (PII-handling app)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-src 'self' https://js.stripe.com",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "connect-src 'self' https://api.stripe.com",
            ].join("; "),
          },
        ],
      },
    ]
  },
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
}

export default nextConfig