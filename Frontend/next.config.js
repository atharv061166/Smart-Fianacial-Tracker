/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  // Enable static export for Firebase Hosting ONLY in production.
  // In development, output:'export' causes Next.js to write to out/ on every
  // request which the file watcher picks up, triggering an infinite recompile loop.
  ...(isProd ? { output: 'export', trailingSlash: true, distDir: 'out' } : {}),

  // Optimize images for static export
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'prod.spline.design',
        port: '',
        pathname: '/**',
      }
    ],
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      'framer-motion',
      '@react-pdf/renderer'
    ],
  },



  // Compiler options for better performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    // Enable SWC minification
    styledComponents: true,
  },

  // Enable gzip compression
  compress: true,

  // Simplified webpack configuration
  webpack: (config) => {
    return config
  },

  // Headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig