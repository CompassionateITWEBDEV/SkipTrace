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
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
}

export default nextConfig